# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN cp -r src/db/migrations dist/db/migrations

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Create persistent upload directory
RUN mkdir -p uploads/documents

ENV PORT=5000 \
    NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/server.js"]
