FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY ./src ./src
COPY ./test ./test
COPY ./knexfile.js .
COPY ./openapi.yaml .
COPY ./startup.sh ./startup.sh
COPY ./tsconfig.json .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /usr/src/app

RUN chmod +x ./startup.sh

USER appuser

RUN npm run build

CMD ["./startup.sh"]
