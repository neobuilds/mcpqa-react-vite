# mcpqa fixture: Vite app built then served by nginx inside the container.
# Two dot paths exist on purpose: /.vite/ok.txt (allowed via docker.allowed_dot_paths)
# and /.hidden/secret.txt (must stay denied by the xCloud vhost).
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && mkdir -p dist/.vite dist/.hidden \
 && echo "mcpqa-react-vite dotpath OK" > dist/.vite/ok.txt \
 && echo "should never be served" > dist/.hidden/secret.txt

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
