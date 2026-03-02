FROM node:24-bookworm-slim

# Combinamos todas las instalaciones de apt para reducir capas (layers)
RUN apt-get update && apt-get install -y \
    bash curl git ca-certificates \
    python3 python3-venv python3-pip \
    chromium \
    chromium-driver \
    fonts-liberation \
    libnss3 libatk-bridge2.0-0 libgtk-3-0 libxss1 libasound2 \
    && rm -rf /var/lib/apt/lists/*
    
    
# Instalación de uv (usando el instalador oficial de Astral)
# Seteamos UV_INSTALL_DIR para que sea accesible globalmente
ENV UV_INSTALL_DIR=/usr/local/bin
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Configuración de pnpm vía corepack
RUN corepack enable && corepack prepare pnpm@10 --activate

# Directorio persistente
RUN mkdir -p /data
ENV HOME=/data

# Actualizamos el PATH para incluir uv y los binarios de data
ENV PATH="/data/.local/bin:/data/.npm-global/bin:/pnpm:${PATH}"
ENV PNPM_HOME=/pnpm

COPY entrypoint.sh /data/entrypoint.sh
RUN chmod +x /data/entrypoint.sh

EXPOSE 18789

ENTRYPOINT ["/data/entrypoint.sh"]