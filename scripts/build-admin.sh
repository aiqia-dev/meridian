#!/bin/bash

# Build script for Meridian Admin Panel
# This script builds the Next.js admin panel and copies the static files
# to the internal/admin directory for embedding in the Go binary.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ADMIN_PANEL_DIR="$ROOT_DIR/admin-panel"
ADMIN_INTERNAL_DIR="$ROOT_DIR/internal/admin"

echo "Building Meridian Admin Panel..."

# Check if admin-panel directory exists
if [ ! -d "$ADMIN_PANEL_DIR" ]; then
    echo "Error: admin-panel directory not found at $ADMIN_PANEL_DIR"
    exit 1
fi

# Navigate to admin panel directory
cd "$ADMIN_PANEL_DIR"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the Next.js static export
echo "Building Next.js static export..."
npm run build

# Create static directory in internal/admin if it doesn't exist
mkdir -p "$ADMIN_INTERNAL_DIR/static"

# Remove old static files (but keep Go files)
find "$ADMIN_INTERNAL_DIR/static" -mindepth 1 -delete 2>/dev/null || true

# Copy the built files
echo "Copying built files to $ADMIN_INTERNAL_DIR/static..."
cp -r out/* "$ADMIN_INTERNAL_DIR/static/"

echo ""
echo "Admin panel build complete!"
echo "Static files are in: $ADMIN_INTERNAL_DIR/static/"
echo ""
echo "Now rebuild the Go binary to embed the new admin panel:"
echo "  go build ./cmd/meridian-server"
