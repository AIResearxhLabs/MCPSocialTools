#!/bin/bash

# Enhanced AWS ECS Deployment Script for MCPSocial Service
# This script handles infrastructure setup, service cleanup, build, and deployment.

set -e

# --- Configuration ---
AWS_REGION="us-east-2"
AWS_ACCOUNT_ID="753353727891"
ECR_REPOSITORY_NAME="mcpsocial"
ECS_CLUSTER_NAME="mcpsocial"
ECS_SERVICE_NAME="mcpsocial-service"
TASK_DEFINITION_FAMILY="mcpsocial-task"
IMAGE_NAME="mcpsocial"

# --- Calculated Variables ---
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_IMAGE_URI="${ECR_REGISTRY}/${ECR_REPOSITORY_NAME}:latest"
SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       MCPSocial AWS ECS Deployment Pipeline              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Configuration:"
echo "  Region: ${AWS_REGION}"
echo "  Account: ${AWS_ACCOUNT_ID}"
echo "  Cluster: ${ECS_CLUSTER_NAME}"
echo "  Service: ${ECS_SERVICE_NAME}"
echo ""

# --- Pre-flight Checks ---
echo "🔍 Pre-flight checks..."
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed or not in PATH."
    exit 1
fi
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    exit 1
fi
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is not installed. Please install it first."
    echo "   macOS: brew install jq"
    echo "   Linux: sudo apt-get install jq"
    exit 1
fi
echo "✅ All required tools are available."
echo ""

# --- Prompt for Environment Variables ---
echo "🔐 Environment Variable Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Please provide the following API credentials:"
echo ""

read -p "Enter OPENAI_API_KEY: " OPENAI_API_KEY
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY is required."
    exit 1
fi

read -p "Enter FACEBOOK_ACCESS_TOKEN: " FACEBOOK_ACCESS_TOKEN
if [ -z "$FACEBOOK_ACCESS_TOKEN" ]; then
    echo "❌ Error: FACEBOOK_ACCESS_TOKEN is required."
    exit 1
fi

read -p "Enter INSTAGRAM_ACCESS_TOKEN: " INSTAGRAM_ACCESS_TOKEN
if [ -z "$INSTAGRAM_ACCESS_TOKEN" ]; then
    echo "❌ Error: INSTAGRAM_ACCESS_TOKEN is required."
    exit 1
fi

echo ""
echo "✅ Environment variables collected."
echo ""

# --- Step 1: Infrastructure Setup ---
echo "🏗️  [1/7] Setting up AWS infrastructure..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create ECR Repository if it doesn't exist
if aws ecr describe-repositories --repository-names "${ECR_REPOSITORY_NAME}" --region "${AWS_REGION}" &> /dev/null; then
    echo "✓ ECR Repository '${ECR_REPOSITORY_NAME}' exists."
else
    echo "Creating ECR Repository..."
    aws ecr create-repository \
        --repository-name "${ECR_REPOSITORY_NAME}" \
        --region "${AWS_REGION}" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 > /dev/null
    echo "✓ ECR Repository created."
fi

# Create CloudWatch Log Group if it doesn't exist
LOG_GROUP_NAME="/ecs/mcpsocial-task"
if aws logs describe-log-groups --log-group-name-prefix "${LOG_GROUP_NAME}" --region "${AWS_REGION}" 2>/dev/null | grep -q "${LOG_GROUP_NAME}"; then
    echo "✓ Log Group '${LOG_GROUP_NAME}' exists."
else
    echo "Creating CloudWatch Log Group..."
    aws logs create-log-group --log-group-name "${LOG_GROUP_NAME}" --region "${AWS_REGION}"
    aws logs put-retention-policy --log-group-name "${LOG_GROUP_NAME}" --retention-in-days 7 --region "${AWS_REGION}"
    echo "✓ Log Group created."
fi

echo ""

# --- Step 2: Get Default VPC Configuration ---
echo "🌐 [2/7] Discovering default VPC configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DEFAULT_VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --region "${AWS_REGION}" --query "Vpcs[0].VpcId" --output text)
if [ -z "$DEFAULT_VPC_ID" ] || [ "$DEFAULT_VPC_ID" = "None" ]; then
    echo "❌ Error: No default VPC found in region ${AWS_REGION}."
    exit 1
fi
echo "✓ Default VPC: ${DEFAULT_VPC_ID}"

SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${DEFAULT_VPC_ID}" --region "${AWS_REGION}" --query "Subnets[*].SubnetId" --output text)
if [ -z "$SUBNET_IDS" ]; then
    echo "❌ Error: No subnets found in default VPC."
    exit 1
fi
SUBNET_ARRAY=($SUBNET_IDS)
echo "✓ Found ${#SUBNET_ARRAY[@]} subnets"

# Get or create security group
SECURITY_GROUP_NAME="mcpsocial-sg"
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=${SECURITY_GROUP_NAME}" "Name=vpc-id,Values=${DEFAULT_VPC_ID}" --region "${AWS_REGION}" --query "SecurityGroups[0].GroupId" --output text 2>/dev/null || echo "")

if [ -z "$SECURITY_GROUP_ID" ] || [ "$SECURITY_GROUP_ID" = "None" ]; then
    echo "Creating security group..."
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name "${SECURITY_GROUP_NAME}" \
        --description "Security group for MCPSocial ECS service" \
        --vpc-id "${DEFAULT_VPC_ID}" \
        --region "${AWS_REGION}" \
        --query "GroupId" \
        --output text)
    
    # Allow inbound traffic on port 3001
    aws ec2 authorize-security-group-ingress \
        --group-id "${SECURITY_GROUP_ID}" \
        --protocol tcp \
        --port 3001 \
        --cidr 0.0.0.0/0 \
        --region "${AWS_REGION}" > /dev/null
    
    echo "✓ Security group created: ${SECURITY_GROUP_ID}"
else
    echo "✓ Security group exists: ${SECURITY_GROUP_ID}"
fi

echo ""

# --- Step 3: Check and Clean Existing Service ---
echo "🧹 [3/7] Checking for existing service..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SERVICE_EXISTS=$(aws ecs describe-services \
    --cluster "${ECS_CLUSTER_NAME}" \
    --services "${ECS_SERVICE_NAME}" \
    --region "${AWS_REGION}" \
    --query "services[?status=='ACTIVE'].serviceName" \
    --output text 2>/dev/null || echo "")

if [ -n "$SERVICE_EXISTS" ]; then
    echo "⚠️  Found existing service '${ECS_SERVICE_NAME}'. Deleting..."
    
    # Update service to 0 desired count first
    aws ecs update-service \
        --cluster "${ECS_CLUSTER_NAME}" \
        --service "${ECS_SERVICE_NAME}" \
        --desired-count 0 \
        --region "${AWS_REGION}" > /dev/null
    
    # Delete the service
    aws ecs delete-service \
        --cluster "${ECS_CLUSTER_NAME}" \
        --service "${ECS_SERVICE_NAME}" \
        --region "${AWS_REGION}" > /dev/null
    
    echo "⏳ Waiting for service deletion to complete..."
    aws ecs wait services-inactive \
        --cluster "${ECS_CLUSTER_NAME}" \
        --services "${ECS_SERVICE_NAME}" \
        --region "${AWS_REGION}"
    
    echo "✓ Old service deleted successfully."
else
    echo "✓ No existing service found. Proceeding with fresh deployment."
fi

echo ""

# --- Step 4: Authenticate Docker with ECR ---
echo "🔐 [4/7] Authenticating Docker with ECR..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}" > /dev/null 2>&1
echo "✅ Docker authenticated with ECR."
echo ""

# --- Step 5: Build and Push Docker Image ---
echo "🐳 [5/7] Building and pushing Docker image..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Building from: ${SERVICE_DIR}"

docker build -t "${IMAGE_NAME}:latest" "${SERVICE_DIR}"
docker tag "${IMAGE_NAME}:latest" "${ECR_IMAGE_URI}"
docker push "${ECR_IMAGE_URI}"

echo "✅ Image pushed to: ${ECR_IMAGE_URI}"
echo ""

# --- Step 6: Register Task Definition with Environment Variables ---
echo "📋 [6/7] Registering task definition with environment variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Read the task definition template and replace placeholders
TASK_DEF_JSON=$(cat "${SERVICE_DIR}/task-definition.json")
TASK_DEF_JSON=$(echo "$TASK_DEF_JSON" | sed "s/PLACEHOLDER_OPENAI_API_KEY/${OPENAI_API_KEY}/g")
TASK_DEF_JSON=$(echo "$TASK_DEF_JSON" | sed "s/PLACEHOLDER_FACEBOOK_ACCESS_TOKEN/${FACEBOOK_ACCESS_TOKEN}/g")
TASK_DEF_JSON=$(echo "$TASK_DEF_JSON" | sed "s/PLACEHOLDER_INSTAGRAM_ACCESS_TOKEN/${INSTAGRAM_ACCESS_TOKEN}/g")

# Register the task definition
TASK_DEFINITION_ARN=$(echo "$TASK_DEF_JSON" | aws ecs register-task-definition \
    --cli-input-json file:///dev/stdin \
    --region "${AWS_REGION}" \
    --query "taskDefinition.taskDefinitionArn" \
    --output text)

echo "✅ Task definition registered: ${TASK_DEFINITION_ARN}"
echo ""

# --- Step 7: Create ECS Service ---
echo "🚀 [7/7] Creating ECS service..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

aws ecs create-service \
    --cluster "${ECS_CLUSTER_NAME}" \
    --service-name "${ECS_SERVICE_NAME}" \
    --task-definition "${TASK_DEFINITION_ARN}" \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS// /,}],securityGroups=[${SECURITY_GROUP_ID}],assignPublicIp=ENABLED}" \
    --region "${AWS_REGION}" > /dev/null

echo "✅ ECS service created successfully."
echo ""

# --- Deployment Summary ---
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║            🎉 Deployment Complete!                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Service Details:"
echo "  • Cluster: ${ECS_CLUSTER_NAME}"
echo "  • Service: ${ECS_SERVICE_NAME}"
echo "  • Region: ${AWS_REGION}"
echo "  • Task Definition: ${TASK_DEFINITION_ARN}"
echo ""
echo "⏳ The service is now starting. It may take 2-3 minutes for tasks to be running."
echo ""
echo "To check service status:"
echo "  aws ecs describe-services --cluster ${ECS_CLUSTER_NAME} --services ${ECS_SERVICE_NAME} --region ${AWS_REGION}"
echo ""
echo "To view logs:"
echo "  aws logs tail /ecs/mcpsocial-task --follow --region ${AWS_REGION}"
echo ""
echo "To get the public IP of the running task:"
echo "  aws ecs list-tasks --cluster ${ECS_CLUSTER_NAME} --service-name ${ECS_SERVICE_NAME} --region ${AWS_REGION}"
echo ""
