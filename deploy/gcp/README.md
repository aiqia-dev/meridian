# Deploy Meridian on GCP (Compute Engine)

## Quick Start

```bash
# 1. Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Deploy (e2-small in southamerica-east1)
./deploy.sh

# 3. Access
# Server: http://<IP>:9851
# Admin:  http://<IP>:9851/admin/
```

## Configuration

Override defaults via environment variables or flags:

```bash
# Custom region and machine type
./deploy.sh --region us-central1 --machine-type e2-medium

# With pre-defined credentials
MERIDIAN_ADMIN_PASSWORD=mypass ./deploy.sh

# Specify project
./deploy.sh --project my-gcp-project
```

| Variable | Default | Description |
|----------|---------|-------------|
| `GCP_PROJECT` | gcloud default | GCP project ID |
| `GCP_REGION` | `southamerica-east1` | GCP region |
| `MACHINE_TYPE` | `e2-small` | VM type (2 vCPU, 2 GB) |
| `DISK_SIZE` | `10` | Boot disk size (GB) |
| `DATA_DISK_SIZE` | `20` | Data disk size (GB, SSD) |
| `MERIDIAN_ADMIN_PASSWORD` | auto-generated | Admin panel password |
| `MERIDIAN_ADMIN_JWT_SECRET` | auto-generated | JWT signing secret |

## Machine Type Recommendations

| Use case | Machine type | vCPU | RAM | Cost/month |
|----------|-------------|------|-----|------------|
| Dev/test | `e2-micro` | 0.25 | 1 GB | ~$7 |
| Small | `e2-small` | 2 | 2 GB | ~$15 |
| Medium | `e2-medium` | 2 | 4 GB | ~$25 |
| Production | `e2-standard-2` | 2 | 8 GB | ~$50 |
| High load | `e2-standard-4` | 4 | 16 GB | ~$100 |

> Prices for `southamerica-east1`. Other regions may vary.

## Resources Created

- **VM instance** (`meridian-server`) with Docker
- **Persistent SSD disk** (`meridian-server-data`) for AOF data
- **Static external IP** (`meridian-server-ip`)
- **Firewall rule** (`allow-meridian`) for port 9851

## Management

```bash
# SSH into the VM
gcloud compute ssh meridian-server --zone=southamerica-east1-a

# View logs
gcloud compute ssh meridian-server --command='docker logs -f meridian'

# Restart
gcloud compute ssh meridian-server --command='cd /opt/meridian && docker compose restart'

# Stop/Start VM (preserves data)
gcloud compute instances stop meridian-server --zone=southamerica-east1-a
gcloud compute instances start meridian-server --zone=southamerica-east1-a
```

## Destroy

```bash
./deploy.sh --destroy
```

This removes the VM, data disk, firewall rule, and static IP.
The data disk has `auto-delete=no` as a safety measure during creation,
but `--destroy` explicitly deletes it.

## Files

- `deploy.sh` — Main deployment script (creates all GCP resources)
- `startup.sh` — VM startup script (installs Docker, mounts disk, runs Meridian)
- `.env.production` — Environment template
- `docker-compose.production.yml` — Docker Compose for local build + deploy
