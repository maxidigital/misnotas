# Build the Vite/React SPA, then run the Node server that serves it + the guides API.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
# DATA_DIR defaults to /data (mount a Railway Volume there). PORT + AUTH_PASSWORD via env.
CMD ["node", "server/index.mjs"]
