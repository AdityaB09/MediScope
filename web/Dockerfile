FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm i
COPY . .
# no need to inject API base here anymore; we’ll use /api via nginx
RUN npm run build

FROM nginx:alpine
# drop our proxying server config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# ship the built static site
COPY --from=build /app/dist /usr/share/nginx/html
