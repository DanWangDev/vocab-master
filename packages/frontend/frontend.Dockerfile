# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and registry config
COPY package*.json ./
COPY .npmrc ./

# Install dependencies (NODE_AUTH_TOKEN needed for @danwangdev packages)
ARG NODE_AUTH_TOKEN
RUN npm ci

# Copy source code
COPY . .

# Build arguments
ARG VITE_API_URL=http://localhost:3001/api
ARG VITE_OIDC_ISSUER=
ARG VITE_OIDC_CLIENT_ID=vocab-master-client

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_OIDC_ISSUER=$VITE_OIDC_ISSUER
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Fix permissions for nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d


# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
