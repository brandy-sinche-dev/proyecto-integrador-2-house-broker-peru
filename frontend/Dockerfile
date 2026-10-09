# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Servidor de desarrollo (Vite) — útil para `target: dev`.
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5173"]

# Build de producción. Los `ARG` tienen prioridad sobre el `.env` local
# (Vite expone como `import.meta.env` cualquier `VITE_*` de `process.env`).
FROM deps AS build
ARG VITE_API_URL=/api
ARG VITE_ENABLE_MOCKS=false
ENV VITE_API_URL=$VITE_API_URL \
    VITE_ENABLE_MOCKS=$VITE_ENABLE_MOCKS
COPY . .
RUN pnpm build

# Estáticos servidos por Nginx (proxy de `/api` al backend).
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
