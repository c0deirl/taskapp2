FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production
COPY src ./src
RUN mkdir -p /data
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
