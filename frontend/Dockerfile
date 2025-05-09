# ─── Stage 1: Install & Build ──────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source & build
COPY . .
RUN npm run build

# ─── Stage 2: Serve with a minimal Node server ────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

# Install a tiny static file server
RUN npm install -g serve

# Pull in built assets
COPY --from=builder /app/dist ./

# Run in production mode on port 3000
ENV NODE_ENV=production
EXPOSE 3000
CMD ["serve", "-s", ".", "-l", "3000"]
