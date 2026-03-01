#!/bin/sh

# Display version banner on startup
VERSION="${VERSION:-1.0.0}"

# Try to read version from version.json if it exists
if [ -f /usr/share/nginx/html/version.json ]; then
  EXTRACTED=$(grep '"version"' /usr/share/nginx/html/version.json | cut -d'"' -f4)
  if [ -n "$EXTRACTED" ]; then
    VERSION="$EXTRACTED"
  fi
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
