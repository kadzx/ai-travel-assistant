# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# Install pnpm
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
RUN npm install -g pnpm

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Permissions
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "app.js"]
