FROM node:24-alpine AS build
WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only-production

FROM node:24-alpine
WORKDIR /usr/src/app

RUN apk add --no-cache libstdc++

ENV NODE_ENV=production
COPY package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY . .

RUN chown -R node:node /usr/src/app

EXPOSE 4090

USER node
CMD [ "npm", "start" ]
