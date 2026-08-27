# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root workspace and package manifests
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci

# Copy source files
COPY shared ./shared
COPY client ./client

# Build shared library and Vite client application
RUN npm run build --workspace=shared && npm run build --workspace=client

# Stage 2: Runtime stage
FROM nginx:alpine AS runner

# Copy built SPA static files to Nginx html directory
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy Nginx configuration for SPA routing fallback
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
