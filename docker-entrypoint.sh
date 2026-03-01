#!/bin/sh

# Display version banner on startup
VERSION="${VERSION:-1.0.0}"

# Try to read version from version.json if it exists
if [ -f /usr/share/nginx/html/version.json ]; then
  VERSION=$(cat /usr/share/nginx/html/version.json | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
fi

echo ""
echo "============================================================"
echo "🎵  Band on the Run - Frontend Server"
echo "📦  Version: ${VERSION}"
echo "🌐  Environment: ${NODE_ENV:-production}"
echo "============================================================"
echo ""

# Start nginx
exec nginx -g "daemon off;"
