#!/bin/bash

# Infrastructure Setup Script for MCPSocial Service
# This script creates all necessary AWS resources for the first-time deployment.

set -e

# --- Configuration ---
AWS_REGION="us-east-2"
AWS_ACCOUNT_ID="753353727891"
ECR_REPOSITORY_NAME="mcpsocial"
ECS_CLUSTER_NAME="mcpsocial"
LOG_GROUP_NAME="/ecs/mcpsocial-task"

echo "=== MCPSocial Infrastructure Setup ==="
echo "Region: ${AWS_REGION}"
echo "Account: ${AWS_ACCOUNT_ID}"
echo ""

# --- Step 1: Create ECR Repository ---
echo "[1/3] Setting up ECR Repository..."
if aws ecr describe-repositories --repository-names "${ECR_REPOSITORY_NAME}" --region "${AWS_REGION}" &> /dev/null; then
    echo "✓ ECR Repository '${ECR_REPOSITORY_NAME}' already exists."
else
    echo "Creating ECR Repository '${ECR_REPOSITORY_NAME}'..."
    aws ecr create-repository \
        --repository-name "${ECR_REPOSITORY_NAME}" \
        --region "${AWS_REGION}" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256
    echo "✓ ECR Repository created successfully."
fi

# --- Step 2: Create CloudWatch Log Group ---
echo "[2/3] Setting up CloudWatch Log Group..."
if aws logs describe-log-groups --log-group-name-prefix "${LOG_GROUP_NAME}" --region "${AWS_REGION}" | grep -q "${LOG_GROUP_NAME}"; then
    echo "✓ Log Group '${LOG_GROUP_NAME}' already exists."
else
    echo "Creating Log Group '${LOG_GROUP_NAME}'..."
    aws logs create-log-group \
        --log-group-name "${LOG_GROUP_NAME}" \
        --region "${AWS_REGION}"
    aws logs put-retention-policy \
        --log-group-name "${LOG_GROUP_NAME}" \
        --retention-in-days 7 \
        --region "${AWS_REGION}"
    echo "✓ Log Group created successfully."
fi

# --- Step 3: Verify ECS Cluster ---
echo "[3/3] Verifying ECS Cluster..."
if aws ecs describe-clusters --clusters "${ECS_CLUSTER_NAME}" --region "${AWS_REGION}" | grep -q "ACTIVE"; then
    echo "✓ ECS Cluster '${ECS_CLUSTER_NAME}' exists and is active."
else
    echo "⚠ Warning: ECS Cluster '${ECS_CLUSTER_NAME}' not found or not active."
    echo "Creating ECS Cluster..."
    aws ecs create-cluster \
        --cluster-name "${ECS_CLUSTER_NAME}" \
        --region "${AWS_REGION}"
    echo "✓ ECS Cluster created successfully."
fi

echo ""
echo "=== Infrastructure Setup Complete ==="
echo "✓ All required AWS resources are ready."
echo ""
