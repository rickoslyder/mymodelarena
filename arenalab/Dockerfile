FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run check

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=4310
WORKDIR /app
RUN addgroup -S arenalab && adduser -S -G arenalab arenalab
COPY --from=build --chown=arenalab:arenalab /app/package*.json ./
COPY --from=build --chown=arenalab:arenalab /app/src ./src
COPY --from=build --chown=arenalab:arenalab /app/public ./public
USER arenalab
EXPOSE 4310
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1:4310/api/health || exit 1
CMD ["node", "src/server.mjs"]
