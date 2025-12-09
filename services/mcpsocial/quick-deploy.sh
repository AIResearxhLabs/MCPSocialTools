#!/bin/bash

# Quick deployment script - uses existing AWS environment configuration
set -e

echo "🚀 Quick Deploy - MCPSocial LinkedIn Tools Update"
echo "=================================================="

REGION="us-east-2"
ACCOUNT_ID="753353727891"
CLUSTER="mcpsocial"
SERVICE="mcpsocial-service"
ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/mcpsocial"

echo ""
echo "📦 Building updated Docker image..."
docker build -t mcpsocial:latest . --quiet

echo ""
echo "🏷️  Tagging image..."
docker tag mcpsocial:latest ${ECR_REPO}:latest
docker tag mcpsocial:latest ${ECR_REPO}:$(date +%Y%m%d-%H%M%S)

echo ""
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REPO}

echo ""
echo "⬆️  Pushing image to ECR..."
docker push ${ECR_REPO}:latest

echo ""
echo "🔄 Forcing ECS service update..."
aws ecs update-service \
    --cluster ${CLUSTER} \
    --service ${SERVICE} \
    --force-new-deployment \
    --region ${REGION} \
    --no-cli-pager

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "🔍 Monitor deployment with:"
echo "   aws ecs describe-services --cluster ${CLUSTER} --services ${SERVICE} --region ${REGION}"
echo ""
echo "📊 Check new tools at:"
echo "   curl http://3.141.18.225:3001/mcp/tools | jq '.[] | .name'"
