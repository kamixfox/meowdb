FROM node:25-slim AS build
WORKDIR /usr/src/app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --only-production

FROM node:25-slim
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY . .
RUN mkdir -p /usr/src/app/data && chown -R node:node /usr/src/app
ENV DB_FILE=data/meow.sqlite
EXPOSE 4090
USER node
CMD [ "npm", "start" ]
