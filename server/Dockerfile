FROM node:18-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src

RUN npm install --only=dev && npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]

