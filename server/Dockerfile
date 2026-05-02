# ---- Stage 1: Install ALL dependencies (needed to compile TS) ----
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- Stage 2: Compile TypeScript ----
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Stage 3: Lean production runner ----
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies in the final image
COPY package*.json ./
RUN npm ci --omit=dev

# Copy only the compiled output from builder
COPY --from=builder /app/dist ./dist

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs
USER expressjs

EXPOSE 4000

CMD ["node", "dist/index.js"]

