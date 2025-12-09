# Deployment Guide - MCPSocial Server

## Overview

This guide covers the complete deployment process for MCPSocial server to AWS ECS Fargate, including infrastructure setup, Docker image building, and service deployment.

## Current Deployment

| Property | Value |
|----------|-------|
| **Environment** | Production |
| **Platform** | AWS ECS Fargate |
| **Region** | `us-east-2` |
| **Cluster** | `mcpsocial` |
| **Service** | `mcpsocial-service` |
| **Public IP** | `3.141.18.225` |
| **Port** | `3001` |
| **Docker Registry** | `753353727891.dkr.ecr.us-east-2.amazonaws.com/mcpsocial` |

## Prerequisites

### Required Tools

- AWS CLI (configured with valid credentials)
- Docker Desktop
- Node.js 18+
- jq (JSON processor)

### AWS Resources Required

- ECS Cluster: `mcpsocial`
- ECR Repository: `mcpsocial`
- VPC with public subnets
- Security group allowing port 3001
- CloudWatch log group: `/ecs/mcpsocial-task`

## Deployment Steps

### Step 1: Refresh AWS Credentials

```bash
# If using SSO
aws sso login

# Verify credentials
aws sts get-caller-identity
```

### Step 2: Build Docker Image (Linux/AMD64)

**Important**: The image must be built for Linux/AMD64 platform for AWS Fargate compatibility.

```bash
cd services/mcpsocial

# Build for Linux platform
docker build --platform linux/amd64 -t mcpsocial:latest .
```

### Step 3: Authenticate with ECR

```bash
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin \
  753353727891.dkr.ecr.us-east-2.amazonaws.com
```

### Step 4: Tag and Push Image

```bash
# Tag the image
docker tag mcpsocial:latest \
  753353727891.dkr.ecr.us-east-2.amazonaws.com/mcpsocial:latest

# Push to ECR
docker push 753353727891.dkr.ecr.us-east-2.amazonaws.com/mcpsocial:latest
```

### Step 5: Deploy to ECS

```bash
# Force new deployment with latest image
aws ecs update-service \
  --cluster mcpsocial \
  --service mcpsocial-service \
  --force-new-deployment \
  --region us-east-2
```

### Step 6: Verify Deployment

```bash
# Check service status
aws ecs describe-services \
  --cluster mcpsocial \
  --services mcpsocial-service \
  --region us-east-2 \
  --query 'services[0].[runningCount,desiredCount]' \
  --output text

# Check task status
aws ecs list-tasks \
  --cluster mcpsocial \
  --service-name mcpsocial-service \
  --region us-east-2

# View logs
aws logs tail /ecs/mcpsocial-task --follow --region us-east-2
```

## Automated Deployment Script

Use the provided deployment script for automated deployment:

```bash
cd services/mcpsocial
./deploy-aws.sh
```

The script will:
1. ✅ Verify all required tools are installed
2. ✅ Create ECR repository if needed
3. ✅ Create CloudWatch log group
4. ✅ Discover VPC and subnet configuration
5. ✅ Create/verify security group
6. ✅ Stop existing service if running
7. ✅ Build Docker image for Linux/AMD64
8. ✅ Push image to ECR
9. ✅ Register new task definition
10. ✅ Create/update ECS service

## Post-Deployment Verification

### 1. Check Server Status

```bash
curl http://3.141.18.225:3001/mcp/info
```

Expected response:
```json
{
  "name": "mcpsocial",
  "version": "1.0.0",
  "protocolVersion": "1.0",
  "capabilities": {
    "tools": true,
    "resources": true
  }
}
```

### 2. Test MCP v1 Endpoints

```bash
# Test initialize
curl -X POST http://3.141.18.225:3001/mcp/v1/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
  }'

# List tools
curl -X POST http://3.141.18.225:3001/mcp/v1/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# List resources
curl -X POST http://3.141.18.225:3001/mcp/v1/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "resources/list"
  }'
```

### 3. Test Legacy Endpoints (Backward Compatibility)

```bash
# Legacy tools endpoint
curl http://3.141.18.225:3001/mcp/tools

# Legacy resources endpoint
curl http://3.141.18.225:3001/mcp/resources

# Legacy execute endpoint
curl -X POST http://3.141.18.225:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "generateCaption",
    "params": {"prompt": "test"}
  }'
```

### 4. Test LinkedIn Functionality

```bash
# Test LinkedIn OAuth endpoint
curl -I http://3.141.18.225:3001/api/auth/linkedin

# Should return 302 redirect to LinkedIn
```

## Environment Variables

### Required Variables

Set these in the AWS ECS task definition:

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Gemini API key for AI features | Yes |
| `FACEBOOK_ACCESS_TOKEN` | Facebook page access token | Yes |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram business account token | Yes |
| `PORT` | Server port (default: 3001) | No |

### Setting Variables

Variables are configured in `task-definition.json`:

```json
{
  "environment": [
    {
      "name": "GEMINI_API_KEY",
      "value": "PLACEHOLDER_GEMINI_API_KEY"
    },
    {
      "name": "FACEBOOK_ACCESS_TOKEN",
      "value": "PLACEHOLDER_FACEBOOK_ACCESS_TOKEN"
    },
    {
      "name": "INSTAGRAM_ACCESS_TOKEN",
      "value": "PLACEHOLDER_INSTAGRAM_ACCESS_TOKEN"
    }
  ]
}
```

The deployment script prompts for these values during deployment.

## Monitoring

### CloudWatch Logs

View logs in real-time:

```bash
aws logs tail /ecs/mcpsocial-task --follow --region us-east-2
```

### Service Metrics

Check service health:

```bash
aws ecs describe-services \
  --cluster mcpsocial \
  --services mcpsocial-service \
  --region us-east-2
```

### Task Information

Get running task details:

```bash
# List tasks
aws ecs list-tasks \
  --cluster mcpsocial \
  --service-name mcpsocial-service \
  --region us-east-2

# Describe specific task
aws ecs describe-tasks \
  --cluster mcpsocial \
  --tasks TASK_ARN \
  --region us-east-2
```

## Rollback Procedure

If deployment fails or issues are detected:

### 1. Stop Current Service

```bash
aws ecs update-service \
  --cluster mcpsocial \
  --service mcpsocial-service \
  --desired-count 0 \
  --region us-east-2
```

### 2. Identify Previous Working Image

```bash
# List image tags in ECR
aws ecr describe-images \
  --repository-name mcpsocial \
  --region us-east-2
```

### 3. Update Task Definition

Update `task-definition.json` to use the previous image tag and re-deploy.

### 4. Restart Service

```bash
aws ecs update-service \
  --cluster mcpsocial \
  --service mcpsocial-service \
  --desired-count 1 \
  --force-new-deployment \
  --region us-east-2
```

## Troubleshooting

### Issue: Container Crash Loop

**Symptoms**: Tasks keep restarting

**Check logs**:
```bash
aws logs tail /ecs/mcpsocial-task --since 10m --region us-east-2
```

**Common causes**:
- Environment variables missing
- Port 3001 not accessible
- Application startup error

**Solution**: Review logs and fix configuration

### Issue: Image Platform Mismatch

**Symptoms**: "exec format error" in logs

**Cause**: Image built for wrong architecture (ARM64 instead of AMD64)

**Solution**: 
```bash
# Rebuild with explicit platform
docker build --platform linux/amd64 -t mcpsocial:latest .
```

### Issue: Cannot Access Service

**Check security group**:
```bash
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=mcpsocial-sg" \
  --region us-east-2
```

**Ensure port 3001 is open**:
```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0 \
  --region us-east-2
```

## Scaling

### Manual Scaling

```bash
# Scale up
aws ecs update-service \
  --cluster mcpsocial \
  --service mcpsocial-service \
  --desired-count 2 \
  --region us-east-2

# Scale down
aws ecs update-service \
  --cluster mcpsocial \
  --service mcpsocial-service \
  --desired-count 1 \
  --region us-east-2
```

### Auto Scaling (Future)

Consider implementing auto-scaling based on:
- CPU utilization
- Memory utilization
- Request count
- Custom CloudWatch metrics

## Health Checks

The application exposes these health endpoints:

```bash
# Basic health
curl http://3.141.18.225:3001/

# MCP info (includes server status)
curl http://3.141.18.225:3001/mcp/info
```

## Deployment Checklist

Before deploying:

- [ ] AWS credentials are valid and not expired
- [ ] All environment variables are set correctly
- [ ] Code has been tested locally
- [ ] `npm run build` succeeds without errors
- [ ] Docker image builds for `linux/amd64`
- [ ] LinkedIn OAuth configuration is unchanged
- [ ] Backward compatibility is maintained

After deploying:

- [ ] Service shows `runningCount: 1, desiredCount: 1`
- [ ] Logs show "MCPSocial server listening at http://localhost:3001"
- [ ] `/mcp/info` endpoint returns server information
- [ ] `/mcp/v1/` endpoint responds to JSON-RPC requests
- [ ] Legacy endpoints still work
- [ ] LinkedIn OAuth flow is functional

## Quick Deploy Command

For standard deployments (when credentials are valid):

```bash
cd services/mcpsocial && \
docker build --platform linux/amd64 -t mcpsocial:latest . && \
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 753353727891.dkr.ecr.us-east-2.amazonaws.com && \
docker tag mcpsocial:latest 753353727891.dkr.ecr.us-east-2.amazonaws.com/mcpsocial:latest && \
docker push 753353727891.dkr.ecr.us-east-2.amazonaws.com/mcpsocial:latest && \
aws ecs update-service --cluster mcpsocial --service mcpsocial-service --force-new-deployment --region us-east-2
```

## Cost Optimization

- **Right-size resources**: Monitor CPU/memory usage and adjust task definition
- **Stop unused services**: Set desired count to 0 when not in use
- **Use spot instances**: Consider Fargate Spot for non-critical workloads
- **Clean old images**: Regularly delete unused ECR images

## Support

For deployment issues:
- Check CloudWatch logs
- Review [API_REFERENCE.md](./API_REFERENCE.md)
- See [MCP_INTEGRATION_GUIDE.md](./MCP_INTEGRATION_GUIDE.md) for troubleshooting
