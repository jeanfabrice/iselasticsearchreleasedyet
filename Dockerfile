ARG NODE_TAG=22-slim

FROM node:${NODE_TAG} AS node

FROM node as builder
ENV NODE_ENV development
WORKDIR /usr/src/app
ADD . .
RUN npm install
RUN npm run build:prod

FROM node
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
ENV NODE_ENV production
WORKDIR /usr/src/app
RUN mkdir public
COPY --from=builder /usr/src/app/build/back .
COPY --from=builder /usr/src/app/build/front public
COPY --from=builder /usr/src/app/package.json .
RUN npm install
USER node
RUN npx puppeteer browsers install chrome
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/healthz || exit 1
CMD [ "node", "bundle-back.js" ]
