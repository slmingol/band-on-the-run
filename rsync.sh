#!/bin/bash

# Copy public directory
rsync -avz --progress ./public/ root@docker-host-01:/home/slm/docker_apps/bandontherun/public/

# Copy scripts directory (now mounted via docker-compose)
rsync -avz --progress ./scripts/ root@docker-host-01:/home/slm/docker_apps/bandontherun/scripts/
