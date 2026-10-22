FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/console

COPY aerovista_catalog_console_v2.html catalog-console-config.js catalog_baseline.js overlay_baseline.js server.js pull-product-images.js SOT.json ./
COPY aerocore-app-adapter.js catalog-console-aerocore.js catalog-console-browser-auth.js catalog-console-browser-session.js server-aerocore.js flagship-release-http.js scoped-release.py ./
COPY vendor ./vendor

ENV PORT=80
ENV AV_SCRIPT_DIR=/app/store/scripts

EXPOSE 80

CMD ["node", "server-aerocore.js"]
