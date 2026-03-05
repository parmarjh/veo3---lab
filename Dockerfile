# Build Stage
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./
# Also copy tsx and other needed tools if not using a pre-compiled server.js
# But wait, it's better to compile the server too.
# For simplicity in this "God Mode" fix, we'll use tsx in the container or compile it.
RUN npm install -g tsx
COPY .env .env

EXPOSE 3000
CMD ["tsx", "server.ts"]
