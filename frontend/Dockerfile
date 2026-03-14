FROM node:20-alpine AS build

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM alpine:3.20
# Просто копируем собранную статику и держим контейнер живым
COPY --from=build /app/dist /usr/share/frontend/html
CMD ["tail", "-f", "/dev/null"]
