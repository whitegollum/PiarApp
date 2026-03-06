#!/usr/bin/env bash
set -euo pipefail

export HOME="${HOME:-/data}"
export NPM_PREFIX="/data/.npm-global"
export PATH="$NPM_PREFIX/bin:/data/.local/bin:$PATH"
export CI=true

SETUP_FLAG="/data/.openclaw_installed"

if [ ! -f "$SETUP_FLAG" ]; then
  echo "=== First-time setup: installing OpenClaw ==="
  
  # Configure npm to use persistent directory
  echo "Configuring npm prefix to $NPM_PREFIX..."
  mkdir -p "$NPM_PREFIX"
  npm config set prefix "$NPM_PREFIX"
  npm config set yes true
  npm config set fund false
  npm config set audit false
  
  # Install OpenClaw globally via npm
  echo "Installing OpenClaw via npm..."
  npm i -g openclaw --yes --no-fund --no-audit
  
  echo "✓ OpenClaw installed successfully"
  
  # Verify installation
  echo "Verifying openclaw binary..."
  which openclaw || echo "Warning: openclaw not found in PATH"
  ls -la $NPM_PREFIX/bin/openclaw 2>/dev/null || echo "Binary not in $NPM_PREFIX/bin"
  
  # If not found, search for it
  if ! command -v openclaw >/dev/null 2>&1; then
    echo "ERROR: openclaw not found after installation"
    echo "PATH: $PATH"
    echo "Contents of $NPM_PREFIX/bin:"
    ls -la $NPM_PREFIX/bin/ 2>/dev/null || echo "Directory not found"
    exit 1
  fi
  
  touch "$SETUP_FLAG"
  echo "=== Setup complete ==="
else
  echo "OpenClaw already installed, skipping setup..."
  echo "Using NPM_PREFIX: $NPM_PREFIX"
fi
# Verificar que openclaw está disponible
if ! command -v openclaw >/dev/null 2>&1; then
  echo "ERROR: openclaw command not found in PATH"
  echo "PATH: $PATH"
  echo "NPM_PREFIX: $NPM_PREFIX"
  echo "Checking $NPM_PREFIX/bin:"
  ls -la $NPM_PREFIX/bin/ 2>/dev/null || echo "Directory not found"
  exit 1
fi








# Run onboard (skip if OPENCLAW_NO_ONBOARD is set)
echo "=== cheking Doctor ==="
if [ "${OPENCLAW_DOCTOR:-0}" == "1" ]; then
echo "Running OpenClaw doctor..."
openclaw doctor -f
fi


echo "=== config ==="
if [ "${OPENCLAW_CONFIGURE:-0}" == "1" ]; then
echo "Running OpenClaw config..."
openclaw config
fi




# Arrancar gateway
echo "=== Starting OpenClaw gateway... ==="
exec openclaw gateway \
  --allow-unconfigured \
  --bind lan \
  --port 18789 \



