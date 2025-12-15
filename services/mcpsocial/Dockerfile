# Stage 1: Build the application
FROM --platform=linux/amd64 node:18 AS builder

WORKDIR /usr/src/app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Copy .env file for environment variables (if it exists)
COPY .env* ./

# Stage 2: Create the production image
FROM --platform=linux/amd64 node:18-alpine

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create and set ownership of the app directory
WORKDIR /usr/src/app
RUN chown appuser:appgroup /usr/src/app

# Switch to the non-root user
USER appuser

# Copy only production dependencies and install
COPY --chown=appuser:appgroup package*.json ./
RUN npm ci --only=production

# Copy the compiled code from the builder stage
COPY --from=builder --chown=appuser:appgroup /usr/src/app/build ./build

# Copy .env file from builder stage (if it exists)
COPY --from=builder --chown=appuser:appgroup /usr/src/app/.env ./

# Expose the port the app runs on
EXPOSE 3001

# The command to run the application
CMD [ "node", "build/index.js" ]
