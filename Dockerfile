FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-fund --no-audit
COPY src ./src
COPY public ./public
COPY data/sources.json ./data/sources.json
COPY data/md ./data/md
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
