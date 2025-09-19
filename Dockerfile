# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies (e.g., for native modules)
RUN apk add --no-cache python3 make g++ bash

# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Generate Prisma client (if applicable, adjust based on your setup)
# RUN npx prisma generate

# Stage 2: Create the production image
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Copy necessary files (e.g., .env for runtime, if needed)
COPY .env ./

# Change ownership to the non-root user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 3001

# Set environment variables for production
ENV NODE_ENV=production

# Healthcheck to ensure the service is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["yarn", "run", "start"]