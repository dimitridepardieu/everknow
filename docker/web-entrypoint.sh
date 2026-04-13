#!/bin/sh
set -e

# Install dependencies if node_modules is empty (first run with volume mount)
if [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "node_modules empty, running bun install..."
  bun install --frozen-lockfile
fi

exec "$@"
