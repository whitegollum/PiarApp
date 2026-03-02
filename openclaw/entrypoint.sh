#!/usr/bin/env bash
set -euo pipefail

export HOME="${HOME:-/data}"
export PNPM_HOME="${PNPM_HOME:-/pnpm}"
export PATH="/data/.local/bin:/data/.npm-global/bin:${PNPM_HOME}:$PATH"
export CI=true
export PNPM_DISABLE_SELF_UPDATE_CHECK=1
export PNPM_CONFIG_REPORTER=append-only
export PNPM_CONFIG_COLOR=false


# Workarounds TrueNAS/overlayfs: menos concurrencia + sin hardlinks
export PNPM_STORE_DIR="${PNPM_STORE_DIR:-/data/.pnpm-store}"


SETUP_FLAG="/data/.openclaw_installed"

if [ ! -f "$SETUP_FLAG" ]; then
  mkdir -p "$PNPM_STORE_DIR"

  # Config pnpm para evitar hardlinks y reducir carga de IO
  pnpm config set store-dir "$PNPM_STORE_DIR"
  pnpm config set package-import-method copy
  pnpm config set child-concurrency 1

  # si el checkout quedó a medias, limpia node_modules sin prompts
  rm -rf /data/moltbot/node_modules || true

  # Instala desde git (tu comando exacto)
  #curl -fsSL https://molt.bot/install.sh | env CI=true bash -s -- --install-method git
  if [ -t 0 ]; then
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
  else
    curl -fsSL https://openclaw.ai/install.sh | env CI=true bash -s -- --install-method git
  fi

  touch "$SETUP_FLAG"

fi



command -v openclaw >/dev/null 2>&1 || { echo "openclaw no está en PATH"; echo "$PATH"; exit 1; }


# Arranca el gateway en foreground (proceso principal)
exec openclaw gateway
#exec moltbot gateway

