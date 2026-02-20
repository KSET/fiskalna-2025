# syntax=docker/dockerfile:1.4

ARG PUBLIC_BACKEND_URL

FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG PUBLIC_BACKEND_URL
ENV VITE_API_URL=$PUBLIC_BACKEND_URL
RUN npm run build

FROM nginx:stable-alpine
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;

    # SPA routing: serve index.html for all routes
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
EOF
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
