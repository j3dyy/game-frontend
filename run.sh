#!/usr/bin/env bash
set -e

# Change to the directory of this script
cd "$(dirname "$0")"

PORT="${PORT:-3000}"

echo "=================================================="
echo "Starting RPG Game Frontend on http://0.0.0.0:${PORT}"
echo "Serving static files from $(pwd)"
echo "=================================================="

exec python3 -m http.server "${PORT}" --bind 0.0.0.0
