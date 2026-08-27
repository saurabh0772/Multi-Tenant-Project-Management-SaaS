# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

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

# Stage 2: Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy root package files and install production dependencies only
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
RUN npm ci --only=production

# Copy compiled artifacts from builder
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist

# Create uploads directory and set permissions for node user
RUN mkdir -p /app/server/uploads && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "server/dist/server.js"]
