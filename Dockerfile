FROM node:carbon-slim
ARG NODE_ENV=production
ENV NODE_ENV "$NODE_ENV"
WORKDIR /usr/src/app
COPY package.json ./
COPY yarn.lock ./
RUN yarn
COPY ./src ./src
COPY ./knexfile.js .
COPY ./startup.sh ./startup.sh
RUN chmod +x ./startup.sh
CMD ["./startup.sh"]
