FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV MCP_HTTP_MODE=false
ENV REST_API_MODE=false

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tracker.config.json ./tracker.config.json
COPY --from=builder /app/data ./data
COPY --from=builder /app/README.md ./README.md
COPY --from=builder /app/SECURITY.md ./SECURITY.md

RUN npm ci --omit=dev && groupadd --system --gid 1001 tracker && useradd --system --uid 1001 --gid 1001 --create-home --home-dir /home/tracker tracker && chown -R 1001:1001 /app

USER 1001:1001
EXPOSE 3000 3001
CMD ["node", "dist/index.js"]
