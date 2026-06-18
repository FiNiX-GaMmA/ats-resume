# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency configs
COPY package.json package-lock.json ./

# Install dependencies (frozen-lockfile equivalent for security)
RUN npm ci

# Copy the rest of the frontend source
COPY . .

# Compile TypeScript and build optimal static assets
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from Stage 1 build environment
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
