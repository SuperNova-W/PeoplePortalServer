# Using Node 23 to match the supported environment
FROM node:23-alpine
WORKDIR /app

# 1. Copy backend build and package manifests from ./server
COPY server/package*.json ./
COPY server/dist ./dist

# 2. Copy frontend build from ./webui/dist into ./dist/ui
RUN mkdir -p dist/ui
COPY webui/dist/ ./dist/ui/

# Install production dependencies for the backend
RUN npm install --omit=dev

# Set production environment
ENV NODE_ENV=production
EXPOSE 3000

# Start People Portal, Uses Nx Start Target
CMD ["node", "dist/app.js"]