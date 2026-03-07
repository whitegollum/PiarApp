#!/usr/bin/env bash
set -euo pipefail

export HOME="${HOME:-/data}"
export NPM_PREFIX="/data/.npm-global"
export PATH="$NPM_PREFIX/bin:/data/.local/bin:$PATH"
export CI=true

SETUP_FLAG="/data/.openclaw_installed"


#--------------------------------------------------------------------------------------------------------------------------


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


#--------------------------------------------------------------------------------------------------------------------------


# Run onboard (skip if OPENCLAW_NO_ONBOARD is set)
echo "=== cheking Doctor ==="
if [ "${OPENCLAW_DOCTOR:-0}" == "1" ]; then
echo "Running OpenClaw doctor..."
openclaw doctor -f
fi


#--------------------------------------------------------------------------------------------------------------------------


echo "=== config ==="
if [ "${OPENCLAW_CONFIGURE:-0}" == "1" ]; then
echo "Running OpenClaw config..."
openclaw config
fi


#--------------------------------------------------------------------------------------------------------------------------


# Actualizar contraseña del gateway desde variable de entorno
echo "=== Updating gateway password from environment ==="
if [ -n "${OPENCLAW_GATEWAY_PASSWORD:-}" ]; then
  CONFIG_FILE="/data/.openclaw/openclaw.json"
  if [ -f "$CONFIG_FILE" ]; then
    echo "Updating password in $CONFIG_FILE..."
    jq --arg pwd "$OPENCLAW_GATEWAY_PASSWORD" '.gateway.auth.password = $pwd' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    echo "✓ Password updated from OPENCLAW_GATEWAY_PASSWORD"
  else
    echo "Warning: Config file not found at $CONFIG_FILE"
  fi
else
  echo "Warning: OPENCLAW_GATEWAY_PASSWORD not set, using default from config file"
fi

#--------------------------------------------------------------------------------------------------------------------------


# Generar auth-profiles.json desde variables de entorno
echo "=== Generating auth-profiles.json from environment ==="
if [ -n "${OPENCLAW_PROVIDER:-}" ] && [ -n "${OPENCLAW_ACCESS_KEY:-}" ]; then
  AUTH_PROFILE="/data/.openclaw/agents/main/agent/auth-profiles.json"
  mkdir -p "$(dirname "$AUTH_PROFILE")"
  
  # Obtener timestamp actual en milisegundos
  CURRENT_TIMESTAMP=$(date +%s)000
  
  echo "Creating auth-profiles.json with provider: ${OPENCLAW_PROVIDER}..."
  cat > "$AUTH_PROFILE" <<EOF
{
  "version": 1,
  "profiles": {
    "${OPENCLAW_PROVIDER}:default": {
      "type": "${OPENCLAW_AUTH_TYPE:-oauth}",
      "provider": "${OPENCLAW_PROVIDER}",
      "access": "${OPENCLAW_ACCESS_KEY}",
      "refresh": "${OPENCLAW_REFRESH_KEY}",
      "expires": ${OPENCLAW_EXPIRES},
      "accountId": "${OPENCLAW_ACCOUNTID}"
    }
  },
  "usageStats": {
    "${OPENCLAW_PROVIDER}:default": {
      "errorCount": 0,
      "lastUsed": ${CURRENT_TIMESTAMP}
    }
  }
}
EOF
  echo "✓ auth-profiles.json generated successfully"
else
  echo "Warning: OPENCLAW_PROVIDER or OPENCLAW_ACCESS_KEY not set, skipping auth-profiles.json generation"
fi

#--------------------------------------------------------------------------------------------------------------------------


# Arrancar gateway
echo "=== Starting OpenClaw gateway... ==="
exec openclaw gateway \
  --allow-unconfigured \
  --bind lan \
  --port 18789 \



