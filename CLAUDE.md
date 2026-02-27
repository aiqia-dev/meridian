# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meridian is an in-memory geolocation data store, spatial index, and realtime geofencing server written in Go, with a Next.js admin panel. It supports lat/lon points, bounding boxes, XYZ tiles, Geohashes, and GeoJSON objects. Based on the Tile38 architecture.

## Build Commands

```bash
make                    # Build all binaries (meridian-server, meridian-cli, meridian-benchmark)
make test               # Run integration tests with coverage (output: /tmp/coverage.html)
make clean              # Remove built binaries
make package            # Cross-compile for Windows, Mac, Linux, FreeBSD, ARM
make install            # Install to /usr/local/bin
```

Build a single binary directly:
```bash
go build -o meridian-server ./cmd/meridian-server
```

### Admin Panel Build

```bash
cd admin-panel && npm install && npm run build
# Or use the script that also copies files:
./scripts/build-admin.sh
# Then rebuild the Go binary to embed updated static files:
go build -o meridian-server ./cmd/meridian-server
```

### Running the Server

```bash
# With environment variables for admin panel:
MERIDIAN_ADMIN_USER=admin MERIDIAN_ADMIN_PASSWORD=admin ./meridian-server

# Default port: 9851
# Admin panel: http://localhost:9851/admin/
# CLI client:
./meridian-cli
```

## Architecture

### Go Backend (`internal/`)

The server handles multiple protocols (HTTP, WebSockets, Telnet, Redis RESP) through a unified command pipeline in `internal/server/server.go`. HTTP requests are parsed in `readNextHTTPCommand` which extracts path, headers, and body. Commands flow through `handleInputCommand` which dispatches to specific handlers.

Key packages:
- **`internal/server/`** — Main server, command parsing, protocol handling (~8000+ LOC across 44 files). `crud.go` contains SET/GET/DEL/SCAN/NEARBY/WITHIN/INTERSECTS handlers.
- **`internal/collection/`** — Spatial collection data structure with R-tree indexing
- **`internal/object/`** — Geographic object types and serialization
- **`internal/field/`** — Metadata fields attached to objects
- **`internal/endpoint/`** — Webhook/pub-sub endpoints (MQTT, Kafka, NATS, SQS, etc.)
- **`internal/admin/`** — Admin panel HTTP handler, JWT auth, static file serving via `//go:embed`
- **`internal/hservice/`** — gRPC service layer

### Admin Panel (`admin-panel/`)

Next.js 14 static export with `basePath: '/admin'` and `trailingSlash: true`. Built files go to `admin-panel/out/`, then get copied to `internal/admin/static/` and embedded into the Go binary at compile time.

Stack: React 18, TypeScript, Tailwind CSS, Shadcn/ui, Recharts, OpenLayers (maps).

**API communication**: The admin panel uses `executeCommand()` from `admin-panel/src/lib/api.ts` to POST commands to `/admin/api/command` with JWT auth. The Go server parses the JSON body, extracts the command string, and executes it through the standard command pipeline.

Admin API endpoints (handled in `server.go` before static file serving):
- `POST /admin/api/login` — JWT authentication
- `GET /admin/api/verify` — Token validation
- `POST /admin/api/command` — Execute Meridian commands (body: `{"command": "SCAN key LIMIT 100"}`)

### HTTP Request Parsing Caveat

In `readNextHTTPCommand`, POST body content is appended to the URL path for backward compatibility (e.g., `curl --data "set fleet truck1 point 33 -112" localhost:9851`). Admin API endpoints (`admin/api/*`) are excluded from this behavior — their JSON bodies are stored in `msg.Body` instead.

## Testing

Integration tests are in `tests/` and use a custom test harness that connects via Redis protocol. Tests use `DoBatch` pattern with command/response pairs. The test server is started fresh for each test file.

```bash
# Run all tests:
make test

# Run a specific test:
cd tests && go test -run TestFence -v
```

## Environment Variables

See `.env` for all options. Key ones: `MERIDIAN_PORT` (default 9851), `MERIDIAN_ADMIN_USER`, `MERIDIAN_ADMIN_PASSWORD`, `MERIDIAN_ADMIN_JWT_SECRET` (auto-generated if empty), `MERIDIAN_APPENDONLY` (persistence).

## Meridian Command Reference

Common commands used by the admin panel:
- `KEYS *` — List all collection names
- `STATS key [key ...]` — Get collection statistics (object count, memory)
- `SCAN key LIMIT n` — List objects in a collection
- `SERVER` — Server info and stats
- `SET key id POINT lat lon` / `SET key id OBJECT {geojson}` — Create objects
- `DEL key id` — Delete an object
- `DROP key` — Delete entire collection
- `SETHOOK name endpoint WITHIN/NEARBY key FENCE ...` — Create geofence webhook
- `HOOKS *` — List webhooks
- `DELHOOK name` — Delete webhook

**Note**: SCAN does not support `WITHFIELDS`. Use `SCAN key LIMIT n` for listing objects.
