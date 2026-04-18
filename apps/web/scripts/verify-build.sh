#!/usr/bin/env bash

set -euo pipefail

echo "Running TypeScript type check..."
npx tsc --noEmit

echo "Running production build..."
npm run build

echo "Build succeeded. Checking output..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo "dist/index.html exists. Build verified."
else
  echo "ERROR: dist/index.html not found."
  exit 1
fi

echo "All checks passed."
