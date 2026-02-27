#!/bin/bash
# Build and push Meridian Docker image to GCP Artifact Registry

set -euo pipefail

PROJECT="${GCP_PROJECT:-aiqia-tracking-middleware}"
REGION="${GCP_REGION:-us-central1}"
REPO="meridian"
IMAGE="meridian-server"
TAG="${1:-latest}"

FULL_IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${IMAGE}:${TAG}"

echo "Building image..."
cd "$(dirname "$0")/../.."

docker build -f Dockerfile.dev -t "$FULL_IMAGE" .

echo "Pushing to ${FULL_IMAGE}..."
docker push "$FULL_IMAGE"

echo ""
echo "Done! Image: $FULL_IMAGE"
