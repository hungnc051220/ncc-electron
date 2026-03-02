FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:alpine AS runner

COPY --from=builder /app/out/renderer /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]