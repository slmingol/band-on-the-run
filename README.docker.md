# 🐳 Docker Setup for Band on the Run

## Quick Start

### Prebuilt Container (Recommended)
Use the prebuilt container from GitHub Container Registry:

```bash
# Pull and run the latest version
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down

# Update to latest version
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

Access the game at: http://localhost:3000

The container is automatically built and published to `ghcr.io/slmingol/band-on-the-run:latest` on every push to main via GitHub Actions.

### Production Build from Source
Build and run the production version with nginx:

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access the game at: http://localhost:3000

### Development Mode
Run with hot reload for development:

```bash
# Build and start development server
docker-compose -f docker-compose.dev.yml up

# Stop
docker-compose -f docker-compose.dev.yml down
```

Access the development server at: http://localhost:3000

## Docker Commands

### Production
```bash
# Build image
docker-compose build

# Start container
docker-compose up -d

# View logs
docker-compose logs -f band-on-the-run

# Restart container
docker-compose restart

# Stop and remove container
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Development
```bash
# Start with live reload
docker-compose -f docker-compose.dev.yml up

# Rebuild dev container
docker-compose -f docker-compose.dev.yml up --build
```

## Manual Docker Commands

### Build production image
```bash
docker build -t band-on-the-run:latest .
```

### Run production container
```bash
docker run -d -p 3000:80 --name band-on-the-run band-on-the-run:latest
```

### Build development image
```bash
docker build -f Dockerfile.dev -t band-on-the-run:dev .
```

### Run development container
```bash
docker run -d -p 3000:5173 -v $(pwd):/app -v /app/node_modules --name band-on-the-run-dev band-on-the-run:dev
```

## Configuration

### Port Configuration
To change the exposed port, modify the ports mapping in `docker-compose.yml`:

```yaml
ports:
  - "8080:80"  # Access app on port 8080
```

## Troubleshooting

### Port already in use
If port 3000 is already in use, change the port mapping:
```yaml
ports:
  - "3001:80"  # Use port 3001 instead
```

### Container won't start
Check logs:
```bash
docker-compose logs band-on-the-run
```

### Rebuild from scratch
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Clean up everything
```bash
docker-compose down -v
docker system prune -a
```

## GitHub Container Registry

The production Docker image is automatically built and published to GitHub Container Registry on every push to main.

### Pull the latest image
```bash
docker pull ghcr.io/slmingol/band-on-the-run:latest
```

### Available tags
- `latest` - Latest main branch build
- `v1.0.0` - Semantic version tags
- `sha-abc123` - Commit SHA tags

## CI/CD Pipeline

The repository uses GitHub Actions for automated builds:

1. **docker-build.yml** - Builds and pushes Docker images on every push
2. **auto-version.yml** - Auto-bumps version and creates releases
3. **cleanup-*.yml** - Cleans up old artifacts and Docker images

See `.github/workflows/` for workflow details.
