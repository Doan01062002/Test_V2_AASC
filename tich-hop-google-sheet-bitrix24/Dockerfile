FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY public/ ./public/
COPY mapping.json ./mapping.json

# Create directory for SQLite storage
RUN mkdir -p data

EXPOSE 3000

CMD ["node", "dist/main"]
