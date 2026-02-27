#!/bin/bash
# Meridian GCP VM Startup Script
# This script runs on first boot to configure the VM.

set -euo pipefail

LOG_FILE="/var/log/meridian-startup.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo "=== Meridian startup script started at $(date) ==="

# -----------------------------------------------
# 1. Install Docker
# -----------------------------------------------
if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    apt-get update -y
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
        https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully."
fi

# -----------------------------------------------
# 2. Format and mount persistent disk
# -----------------------------------------------
DISK_DEVICE="/dev/sdb"
MOUNT_POINT="/mnt/disks/meridian-data"

if [ -b "$DISK_DEVICE" ] && ! mount | grep -q "$MOUNT_POINT"; then
    echo "Setting up persistent disk..."
    mkdir -p "$MOUNT_POINT"

    # Format only if not already formatted
    if ! blkid "$DISK_DEVICE" &>/dev/null; then
        echo "Formatting $DISK_DEVICE..."
        mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0,discard "$DISK_DEVICE"
    fi

    mount -o discard,defaults "$DISK_DEVICE" "$MOUNT_POINT"
    chmod a+w "$MOUNT_POINT"

    # Add to fstab for auto-mount on reboot
    if ! grep -q "$MOUNT_POINT" /etc/fstab; then
        echo "UUID=$(blkid -s UUID -o value $DISK_DEVICE) $MOUNT_POINT ext4 discard,defaults,nofail 0 2" >> /etc/fstab
    fi
    echo "Persistent disk mounted at $MOUNT_POINT"
fi

# -----------------------------------------------
# 3. Create app directory and deploy
# -----------------------------------------------
APP_DIR="/opt/meridian"
mkdir -p "$APP_DIR"

# Pull environment from instance metadata (if set)
ADMIN_PASSWORD=$(curl -sf "http://metadata.google.internal/computeMetadata/v1/instance/attributes/meridian-admin-password" \
    -H "Metadata-Flavor: Google" 2>/dev/null || echo "")
JWT_SECRET=$(curl -sf "http://metadata.google.internal/computeMetadata/v1/instance/attributes/meridian-jwt-secret" \
    -H "Metadata-Flavor: Google" 2>/dev/null || echo "")

# Write production .env
cat > "$APP_DIR/.env.production" <<EOF
MERIDIAN_HOST=0.0.0.0
MERIDIAN_PORT=9851
MERIDIAN_DIR=/data
MERIDIAN_PROTECTED_MODE=no
MERIDIAN_APPENDONLY=yes
MERIDIAN_MAXMEMORY=4gb
MERIDIAN_REQUIREPASS=
MERIDIAN_METRICS_ADDR=:9090
MERIDIAN_LOG_ENCODING=json
MERIDIAN_VERBOSE=false
MERIDIAN_ADMIN_USER=admin
MERIDIAN_ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin}
MERIDIAN_ADMIN_JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 32)}
EOF

# Write docker-compose
cat > "$APP_DIR/docker-compose.yml" <<'COMPOSE'
services:
  meridian:
    image: aiqia/meridian:latest
    container_name: meridian
    ports:
      - "9851:9851"
      - "127.0.0.1:9090:9090"
    volumes:
      - /mnt/disks/meridian-data:/data
    env_file:
      - .env.production
    command: >
      meridian-server
      -d /data
      -h 0.0.0.0
      -p 9851
      -l json
      --protected-mode no
      --appendonly yes
      --metrics-addr :9090
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "meridian-cli", "PING"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    logging:
      driver: gcplogs
      options:
        gcp-log-cmd: "true"
COMPOSE

# -----------------------------------------------
# 4. Build and start
# -----------------------------------------------
cd "$APP_DIR"

# If image doesn't exist yet, build from source
if ! docker image inspect aiqia/meridian:latest &>/dev/null; then
    echo "Image not found, building from source..."
    if [ -d "/opt/meridian-src" ]; then
        cd /opt/meridian-src
        docker compose -f "$APP_DIR/docker-compose.yml" build
        cd "$APP_DIR"
    else
        echo "WARNING: No source code found at /opt/meridian-src and no image available."
        echo "Push the image or clone the repo to /opt/meridian-src"
    fi
fi

docker compose up -d

echo "=== Meridian startup script completed at $(date) ==="
echo "Server: http://$(curl -sf http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H 'Metadata-Flavor: Google'):9851"
echo "Admin:  http://$(curl -sf http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H 'Metadata-Flavor: Google'):9851/admin/"
