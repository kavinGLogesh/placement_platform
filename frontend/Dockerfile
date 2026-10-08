# ------------------------------------------------------------------------------
# Frontend Dockerfile - Multi-stage Build
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build assets
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src

# Build production bundle
RUN npm run build

# ------------------------------------------------------------------------------
# Production Nginx Serving Stage
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Copy compiled dist bundle to Nginx html folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration for client-side routing
RUN echo 'server { \
    listen 5173; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:5000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
