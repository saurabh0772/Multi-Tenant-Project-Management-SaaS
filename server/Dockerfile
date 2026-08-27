# Stage 1: Build stage
FROM node:20-slim AS builder
WORKDIR /app

# Install build tools for native C++ compilation (argon2)
RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy root workspace and package manifests
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY shared ./shared
COPY server ./server

# Build shared library and server TypeScript application
RUN npm run build --workspace=shared && npm run build --workspace=server

# Remove devDependencies to keep node_modules minimal for runtime
RUN npm prune --omit=dev

# Stage 2: Runtime stage
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy root package files and pre-built production node_modules from builder
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled artifacts from builder
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist

# Create uploads directory and set permissions for node user
RUN mkdir -p /app/server/uploads && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["node", "server/dist/server.js"]



