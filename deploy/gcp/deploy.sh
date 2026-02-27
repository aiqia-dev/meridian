#!/bin/bash
# =============================================================================
# Meridian - GCP VM Deployment Script
#
# Usage:
#   ./deploy.sh                     # Deploy with defaults
#   ./deploy.sh --project my-proj   # Specify GCP project
#   ./deploy.sh --destroy            # Remove all resources
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Docker image pushed to registry (or will build on VM)
# =============================================================================

set -euo pipefail

# -----------------------------------------------
# Configuration (override via environment)
# -----------------------------------------------
PROJECT="${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-southamerica-east1}"
ZONE="${GCP_ZONE:-${REGION}-a}"
INSTANCE_NAME="${INSTANCE_NAME:-meridian-server}"
MACHINE_TYPE="${MACHINE_TYPE:-e2-small}"
DISK_SIZE="${DISK_SIZE:-10}"
DATA_DISK_SIZE="${DATA_DISK_SIZE:-20}"
IMAGE_FAMILY="debian-12"
IMAGE_PROJECT="debian-cloud"
NETWORK_TAG="meridian"
ADMIN_PASSWORD="${MERIDIAN_ADMIN_PASSWORD:-}"
JWT_SECRET="${MERIDIAN_ADMIN_JWT_SECRET:-}"

# -----------------------------------------------
# Parse arguments
# -----------------------------------------------
DESTROY=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --project) PROJECT="$2"; shift 2 ;;
        --region) REGION="$2"; ZONE="${REGION}-a"; shift 2 ;;
        --zone) ZONE="$2"; shift 2 ;;
        --machine-type) MACHINE_TYPE="$2"; shift 2 ;;
        --destroy) DESTROY=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [ -z "$PROJECT" ]; then
    echo "Error: No GCP project set. Use --project or 'gcloud config set project <id>'"
    exit 1
fi

echo "==================================="
echo "  Meridian GCP Deployment"
echo "==================================="
echo "Project:      $PROJECT"
echo "Zone:         $ZONE"
echo "Machine type: $MACHINE_TYPE"
echo "Instance:     $INSTANCE_NAME"
echo ""

# -----------------------------------------------
# Destroy
# -----------------------------------------------
if [ "$DESTROY" = true ]; then
    echo "Destroying resources..."
    gcloud compute instances delete "$INSTANCE_NAME" \
        --zone="$ZONE" --project="$PROJECT" --quiet 2>/dev/null || true
    gcloud compute disks delete "${INSTANCE_NAME}-data" \
        --zone="$ZONE" --project="$PROJECT" --quiet 2>/dev/null || true
    gcloud compute firewall-rules delete "allow-${NETWORK_TAG}" \
        --project="$PROJECT" --quiet 2>/dev/null || true
    gcloud compute addresses delete "${INSTANCE_NAME}-ip" \
        --region="$REGION" --project="$PROJECT" --quiet 2>/dev/null || true
    echo "Done. All Meridian resources destroyed."
    exit 0
fi

# -----------------------------------------------
# 1. Reserve static IP
# -----------------------------------------------
echo "[1/5] Reserving static IP..."
if ! gcloud compute addresses describe "${INSTANCE_NAME}-ip" \
    --region="$REGION" --project="$PROJECT" &>/dev/null; then
    gcloud compute addresses create "${INSTANCE_NAME}-ip" \
        --region="$REGION" --project="$PROJECT"
fi
STATIC_IP=$(gcloud compute addresses describe "${INSTANCE_NAME}-ip" \
    --region="$REGION" --project="$PROJECT" --format="get(address)")
echo "  Static IP: $STATIC_IP"

# -----------------------------------------------
# 2. Create firewall rule
# -----------------------------------------------
echo "[2/5] Configuring firewall..."
if ! gcloud compute firewall-rules describe "allow-${NETWORK_TAG}" \
    --project="$PROJECT" &>/dev/null; then
    gcloud compute firewall-rules create "allow-${NETWORK_TAG}" \
        --project="$PROJECT" \
        --direction=INGRESS \
        --priority=1000 \
        --network=default \
        --action=ALLOW \
        --rules=tcp:9851 \
        --target-tags="$NETWORK_TAG" \
        --source-ranges=0.0.0.0/0 \
        --description="Allow Meridian server traffic (port 9851)"
fi
echo "  Firewall rule: allow-${NETWORK_TAG} (tcp:9851)"

# -----------------------------------------------
# 3. Create persistent data disk
# -----------------------------------------------
echo "[3/5] Creating persistent data disk..."
if ! gcloud compute disks describe "${INSTANCE_NAME}-data" \
    --zone="$ZONE" --project="$PROJECT" &>/dev/null; then
    gcloud compute disks create "${INSTANCE_NAME}-data" \
        --zone="$ZONE" \
        --project="$PROJECT" \
        --size="${DATA_DISK_SIZE}GB" \
        --type=pd-ssd \
        --description="Meridian persistent data"
fi
echo "  Data disk: ${INSTANCE_NAME}-data (${DATA_DISK_SIZE}GB SSD)"

# -----------------------------------------------
# 4. Create VM instance
# -----------------------------------------------
echo "[4/5] Creating VM instance..."

# Generate secrets if not provided
if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD=$(openssl rand -base64 16)
    echo ""
    echo "  !! Generated admin password: $ADMIN_PASSWORD"
    echo "  !! Save this password - it won't be shown again."
    echo ""
fi
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! gcloud compute instances describe "$INSTANCE_NAME" \
    --zone="$ZONE" --project="$PROJECT" &>/dev/null; then
    gcloud compute instances create "$INSTANCE_NAME" \
        --zone="$ZONE" \
        --project="$PROJECT" \
        --machine-type="$MACHINE_TYPE" \
        --image-family="$IMAGE_FAMILY" \
        --image-project="$IMAGE_PROJECT" \
        --boot-disk-size="${DISK_SIZE}GB" \
        --boot-disk-type=pd-balanced \
        --disk="name=${INSTANCE_NAME}-data,device-name=meridian-data,mode=rw,auto-delete=no" \
        --address="$STATIC_IP" \
        --tags="$NETWORK_TAG" \
        --scopes=logging-write,monitoring-write \
        --metadata="meridian-admin-password=${ADMIN_PASSWORD},meridian-jwt-secret=${JWT_SECRET}" \
        --metadata-from-file="startup-script=${SCRIPT_DIR}/startup.sh"

    echo "  VM created: $INSTANCE_NAME ($MACHINE_TYPE)"
else
    echo "  VM already exists, updating startup script..."
    gcloud compute instances add-metadata "$INSTANCE_NAME" \
        --zone="$ZONE" --project="$PROJECT" \
        --metadata-from-file="startup-script=${SCRIPT_DIR}/startup.sh"
fi

# -----------------------------------------------
# 5. Summary
# -----------------------------------------------
echo ""
echo "[5/5] Waiting for VM to be ready..."
gcloud compute instances describe "$INSTANCE_NAME" \
    --zone="$ZONE" --project="$PROJECT" \
    --format="get(status)" | grep -q "RUNNING" && echo "  VM is running!" || echo "  VM is starting..."

echo ""
echo "==================================="
echo "  Deployment Complete!"
echo "==================================="
echo ""
echo "  Server:  http://${STATIC_IP}:9851"
echo "  Admin:   http://${STATIC_IP}:9851/admin/"
echo "  CLI:     meridian-cli -h ${STATIC_IP} -p 9851"
echo ""
echo "  SSH:     gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE}"
echo "  Logs:    gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE} --command='docker logs -f meridian'"
echo "  Status:  gcloud compute ssh ${INSTANCE_NAME} --zone=${ZONE} --command='docker ps'"
echo ""
echo "  Destroy: ./deploy.sh --destroy"
echo ""
