FROM node:24-bookworm-slim

# Install system dependencies for OpenClaw
RUN apt-get update && apt-get install -y \
    bash curl git ca-certificates \
    python3 python3-venv python3-pip \
    chromium chromium-driver \
    fonts-liberation \
    libnss3 libatk-bridge2.0-0 libgtk-3-0 libxss1 libasound2 \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Setup persistent directory
RUN mkdir -p /data
ENV HOME=/data
ENV PATH="/data/.local/bin:/data/.npm-global/bin:$PATH"

COPY entrypoint.sh /data/entrypoint.sh
RUN chmod +x /data/entrypoint.sh

EXPOSE 18789

ENTRYPOINT ["/data/entrypoint.sh"]