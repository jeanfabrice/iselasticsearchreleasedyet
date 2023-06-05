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
RUN npm install
CMD [ "node", "bundle-back.js" ]
