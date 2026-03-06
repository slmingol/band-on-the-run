# Docker Files

This directory contains all Docker-related configuration files for Band on the Run.

## Files

- `Dockerfile` - Multi-stage build for frontend production
- `Dockerfile.backend` - Backend server production build
- `Dockerfile.dev` - Development frontend build
- `docker-compose.yml` - Main production setup
- `docker-compose.dev.yml` - Development environment with hot reload
- `docker-compose.prod.yml` - Production using pre-built images
- `nginx.conf` - Nginx web server configuration
- `docker-entrypoint.sh` - Container startup script

## Quick Start

All docker-compose commands should be run from the **project root**:

```bash
# Production build
docker-compose up -d

# Development mode
docker-compose -f docker-compose.dev.yml up

# Using pre-built images
docker-compose -f docker-compose.prod.yml up -d
```

See [docs/README.docker.md](../docs/README.docker.md) for detailed documentation.
