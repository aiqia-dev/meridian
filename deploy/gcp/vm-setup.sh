#!/bin/bash
# =============================================================================
# Meridian VM Setup Script
# Run this ON the GCP VM after SSH'ing in.
#
# Usage:
#   curl -sSL <url> | bash    OR    bash vm-setup.sh
# =============================================================================

set -euo pipefail

PROJECT="aiqia-tracking-middleware"
REGION="us-central1"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/meridian/meridian-server:latest"

echo "==================================="
echo "  Meridian VM Setup"
echo "==================================="

# -----------------------------------------------
# 1. Install Docker
# -----------------------------------------------
if ! command -v docker &>/dev/null; then
    echo "[1/4] Installing Docker..."
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker "$USER"
    echo "  Docker installed. You may need to re-login for group changes."
else
    echo "[1/4] Docker already installed."
fi

# -----------------------------------------------
# 2. Authenticate Docker with Artifact Registry
# -----------------------------------------------
echo "[2/4] Configuring Docker authentication..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# -----------------------------------------------
# 3. Create data directory
# -----------------------------------------------
echo "[3/4] Setting up data directory..."
sudo mkdir -p /opt/meridian/data
sudo chown -R "$USER:$USER" /opt/meridian

# -----------------------------------------------
# 4. Create docker-compose and .env
# -----------------------------------------------
echo "[4/4] Creating configuration..."

# Prompt for admin password
read -rp "Admin password (leave empty to auto-generate): " ADMIN_PASS
if [ -z "$ADMIN_PASS" ]; then
    ADMIN_PASS=$(openssl rand -base64 16)
    echo "  Generated password: $ADMIN_PASS"
fi

JWT_SECRET=$(openssl rand -hex 32)

cat > /opt/meridian/.env <<EOF
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
MERIDIAN_ADMIN_PASSWORD=${ADMIN_PASS}
MERIDIAN_ADMIN_JWT_SECRET=${JWT_SECRET}
EOF

cat > /opt/meridian/docker-compose.yml <<EOF
services:
  meridian:
    image: ${IMAGE}
    container_name: meridian
    ports:
      - "9851:9851"
      - "127.0.0.1:9090:9090"
    volumes:
      - /opt/meridian/data:/data
    env_file:
      - .env
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
EOF

# -----------------------------------------------
# Pull and start
# -----------------------------------------------
echo ""
echo "Pulling image..."
cd /opt/meridian
sudo docker compose pull

echo "Starting Meridian..."
sudo docker compose up -d

# Wait a moment and check
sleep 3
if sudo docker ps | grep -q meridian; then
    EXTERNAL_IP=$(curl -sf http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google" 2>/dev/null || echo "<VM_IP>")
    echo ""
    echo "==================================="
    echo "  Meridian is running!"
    echo "==================================="
    echo ""
    echo "  Server: http://${EXTERNAL_IP}:9851"
    echo "  Admin:  http://${EXTERNAL_IP}:9851/admin/"
    echo "  User:   admin"
    echo "  Pass:   ${ADMIN_PASS}"
    echo ""
    echo "  Logs:   sudo docker logs -f meridian"
    echo "  Stop:   cd /opt/meridian && sudo docker compose down"
    echo "  Update: cd /opt/meridian && sudo docker compose pull && sudo docker compose up -d"
    echo ""
else
    echo "ERROR: Container failed to start. Check logs:"
    echo "  sudo docker logs meridian"
fi
