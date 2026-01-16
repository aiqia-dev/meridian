#!/bin/bash

set -e
cd $(dirname "${BASH_SOURCE[0]}")/..

PLATFORM="$1"
GOOS="$2"
GOARCH="$3"
VERSION=$(git describe --tags --abbrev=0)

echo Packaging $PLATFORM Binary

# Remove previous build directory, if needed.
bdir=meridian-$VERSION-$GOOS-$GOARCH
rm -rf packages/$bdir && mkdir -p packages/$bdir

# Make the binaries.
GOOS=$GOOS GOARCH=$GOARCH make all
rm -f meridian-luamemtest # not needed

# Copy the executable binaries.
if [ "$GOOS" == "windows" ]; then
	mv meridian-server packages/$bdir/meridian-server.exe
	mv meridian-cli packages/$bdir/meridian-cli.exe
	mv meridian-benchmark packages/$bdir/meridian-benchmark.exe
else
	mv meridian-server packages/$bdir
	mv meridian-cli packages/$bdir
	mv meridian-benchmark packages/$bdir
fi

# Copy documention and license.
cp README.md packages/$bdir
cp CHANGELOG.md packages/$bdir
cp LICENSE packages/$bdir

# Compress the package.
cd packages
if [ "$GOOS" == "linux" ]; then
	tar -zcf $bdir.tar.gz $bdir
else
	zip -r -q $bdir.zip $bdir
fi
