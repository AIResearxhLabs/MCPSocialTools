#!/bin/bash

# Platform-Agnostic Deployment Script for MCPSocial Service
# This script automates the process of stopping, rebuilding, and redeploying the service.

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
IMAGE_NAME="mcpsocial"
CONTAINER_NAME="mcpsocial-app"
HOST_PORT=3001
CONTAINER_PORT=3001
# Get the directory where the script is located to run commands from the correct context.
SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "--- MCPSocial Deployment Script ---"

# --- Pre-flight Check ---
if ! command -v docker &> /dev/null
then
    echo "Error: Docker is not installed or not in the system's PATH."
    echo "Please install Docker and try again."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running."
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "Docker is running. Proceeding with deployment..."

# --- Step 1: Clean up old container ---
echo "[1/4] Checking for and removing existing container: $CONTAINER_NAME..."
# Use a more robust check and stop/remove command.
# The `|| true` ensures the script doesn't fail if the container doesn't exist.
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    docker stop $CONTAINER_NAME
fi
if [ "$(docker ps -aq -f status=exited -f name=$CONTAINER_NAME)" ]; then
    docker rm $CONTAINER_NAME
fi
echo "Cleanup complete."

# --- Step 2: Prune old images ---
echo "[2/4] Pruning dangling Docker images to save space..."
docker image prune -f

# --- Step 3: Build the new Docker image ---
echo "[3/4] Building new image: $IMAGE_NAME:latest from directory: $SERVICE_DIR"
# The script automatically navigates to its own directory to run the build.
docker build -t "$IMAGE_NAME:latest" "$SERVICE_DIR"
echo "Build successful."

# --- Step 4: Run the new container ---
echo "[4/4] Starting new container '$CONTAINER_NAME' on port $HOST_PORT..."
docker run -d -p $HOST_PORT:$CONTAINER_PORT --name $CONTAINER_NAME "$IMAGE_NAME:latest"
echo "Container started successfully."

echo "--- Deployment Complete ---"
echo "✅ MCPSocial service is now running at: http://localhost:$HOST_PORT"
echo "   View capabilities at: http://localhost:$HOST_PORT/api/capabilities"
