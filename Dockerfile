# Build stage
FROM node:20-alpine AS builder

# Build arguments
ARG VERSION=1.1.0
ARG BUILD_DATE
ARG VCS_REF

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Build arguments for labels
ARG VERSION=1.1.0
ARG BUILD_DATE
ARG VCS_REF

# Add OCI labels
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.authors="Band on the Run" \
      org.opencontainers.image.url="https://github.com/smingolelli/band-on-the-run" \
      org.opencontainers.image.source="https://github.com/smingolelli/band-on-the-run" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.title="Band on the Run" \
      org.opencontainers.image.description="A music guessing game with stem separation" \
      org.opencontainers.image.licenses="MIT"

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
