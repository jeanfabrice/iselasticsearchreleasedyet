ARG NODE_TAG=18-slim

FROM node:${NODE_TAG} AS node

FROM node as builder
ENV NODE_ENV development
WORKDIR /usr/src/app
ADD . .
RUN npm install

FROM builder as dependencies
ENV NODE_ENV production
WORKDIR /usr/src/app
RUN npm run build:prod

FROM node
ENV NODE_ENV production
WORKDIR /usr/src/app
RUN mkdir public
COPY --from=dependencies /usr/src/app/build/back .
COPY --from=dependencies /usr/src/app/build/front public
COPY --from=dependencies /usr/src/app/package.json .
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable libxss1 libxshmfence1 --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
RUN npm install
RUN npm run install:chrome
CMD [ "node", "bundle-back.js" ]
