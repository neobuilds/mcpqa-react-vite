# React Taskboard production image.
# Multi-stage: build the static bundle with Node, then serve it with nginx.
# The app is fully client-side (browser localStorage); nginx only serves
# static assets, so no API proxy or rewrites are needed beyond the SPA
# index fallback for hash-free history entries (not required by hash routing).

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN bash scripts/build.sh

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Serve the SPA from any path by falling back to index.html for non-asset
# requests, so deep links still work behind a reverse proxy.
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location / { try_files $uri $uri/ /index.html; }' \
  '  location /assets/ { try_files $uri =404; }' \
  '}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1