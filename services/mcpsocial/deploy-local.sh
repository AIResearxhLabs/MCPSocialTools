#!/bin/bash

# Local Docker Desktop Deployment Script for MCPSocial Service
# This script builds and runs the service locally using Docker Desktop

set -e

# --- Configuration ---
IMAGE_NAME="mcpsocial"
CONTAINER_NAME="mcpsocial-app"
HOST_PORT=3001
CONTAINER_PORT=3001
SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       MCPSocial Local Docker Desktop Deployment          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# --- Pre-flight Checks ---
echo "🔍 [1/6] Pre-flight checks..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in the system's PATH."
    echo "   Please install Docker Desktop and try again."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Error: Docker daemon is not running."
    echo "   Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# --- Environment Variable Check ---
echo "🔐 [2/6] Environment variable configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENV_FILE="${SERVICE_DIR}/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  Warning: .env file not found."
    echo "   Creating .env file from .env.example..."
    cp "${SERVICE_DIR}/.env.example" "$ENV_FILE"
    echo ""
    echo "📝 Please edit the .env file and add your API keys:"
    echo "   - OPENAI_API_KEY"
    echo "   - FACEBOOK_ACCESS_TOKEN"
    echo "   - INSTAGRAM_ACCESS_TOKEN"
    echo ""
    read -p "Press Enter after updating the .env file to continue..."
fi

# Source the .env file to check required variables
if [ -f "$ENV_FILE" ]; then
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    
    # Check for required variables
    if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
        echo "❌ Error: OPENAI_API_KEY not set in .env file"
        exit 1
    fi
    
    echo "✅ Environment variables loaded"
else
    echo "❌ Error: .env file not found"
    exit 1
fi

echo ""

# --- Clean up old container ---
echo "🧹 [3/6] Cleaning up existing containers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Stopping running container..."
    docker stop $CONTAINER_NAME
fi

if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Removing old container..."
    docker rm $CONTAINER_NAME
fi

echo "✅ Cleanup complete"
echo ""

# --- Prune old images ---
echo "🗑️  [4/6] Pruning dangling images..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker image prune -f > /dev/null
echo "✅ Prune complete"
echo ""

# --- Build the Docker image ---
echo "🐳 [5/6] Building Docker image..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Building from: ${SERVICE_DIR}"

docker build -t "${IMAGE_NAME}:latest" "$SERVICE_DIR"

echo "✅ Build complete"
echo ""

# --- Run the container ---
echo "🚀 [6/6] Starting container..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker run -d \
    -p $HOST_PORT:$CONTAINER_PORT \
    --name $CONTAINER_NAME \
    --env-file "$ENV_FILE" \
    "$IMAGE_NAME:latest"

echo "✅ Container started"
echo ""

# --- Deployment Summary ---
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║            🎉 Local Deployment Complete!                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Service Information:"
echo "  • Container: $CONTAINER_NAME"
echo "  • Port: $HOST_PORT"
echo "  • Image: $IMAGE_NAME:latest"
echo ""
echo "Access Points:"
echo "  • API Capabilities: http://localhost:$HOST_PORT/api/capabilities"
echo "  • MCP Tools: http://localhost:$HOST_PORT/mcp/tools"
echo ""
echo "Useful Commands:"
echo "  • View logs:        docker logs -f $CONTAINER_NAME"
echo "  • Stop service:     docker stop $CONTAINER_NAME"
echo "  • Restart service:  docker restart $CONTAINER_NAME"
echo "  • Remove service:   docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"
echo ""
echo "⏳ Waiting for service to be ready..."
sleep 3

# Test if service is responding
if curl -s http://localhost:$HOST_PORT/api/capabilities > /dev/null 2>&1; then
    echo "✅ Service is responding!"
    echo ""
    echo "🔗 Try it now:"
    echo "   curl http://localhost:$HOST_PORT/api/capabilities | jq"
else
    echo "⚠️  Service might still be starting up. Check logs with:"
    echo "   docker logs -f $CONTAINER_NAME"
fi

echo ""
