# MCPSocial Deployment Guide

This guide provides comprehensive instructions for deploying the MCPSocial service in both local (Docker Desktop) and cloud (AWS ECS) environments.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Local Deployment](#local-deployment)
- [AWS Deployment](#aws-deployment)
- [Deployment Workflow](#deployment-workflow)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### For Local Deployment

- **Docker Desktop** installed and running
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- API Keys:
  - OpenAI API Key
  - Facebook Access Token (optional)
  - Instagram Access Token (optional)

### For AWS Deployment

All local deployment prerequisites, plus:
- **AWS CLI** configured with appropriate credentials
- **jq** command-line JSON processor
- AWS Account with:
  - ECS (Elastic Container Service) access
  - ECR (Elastic Container Registry) access
  - VPC and networking permissions
  - IAM role: `ecsTaskExecutionRole`

---

## Configuration

### Environment Variables

The service requires the following environment variables:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `LINKEDIN_API_KEY` | LinkedIn API client ID | Yes | `77yvmo0...` |
| `LINKEDIN_API_SECRET` | LinkedIn API client secret | Yes | `WPL_AP1...` |
| `OPENAI_API_KEY` | OpenAI API authentication key | Yes | `sk-...` |
| `FACEBOOK_APP_ID` | Facebook App ID | No | `123456...` |
| `FACEBOOK_APP_SECRET` | Facebook App Secret | No | `abc123...` |
| `FACEBOOK_ACCESS_TOKEN` | Facebook API access token | No | `EAA...` |
| `INSTAGRAM_APP_ID` | Instagram App ID | No | `123456...` |
| `INSTAGRAM_APP_SECRET` | Instagram App Secret | No | `abc123...` |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram API access token | No | `IGQ...` |
| `PORT` | Server port (default: 3001) | No | `3001` |

### Setting Up Environment Variables

1. Copy the example environment file:
   ```bash
   cd services/mcpsocial
   cp .env.example .env
   ```

2. Edit `.env` and add your API keys:
   ```bash
   # LinkedIn API Configuration
   LINKEDIN_API_KEY=your_linkedin_api_key_here
   LINKEDIN_API_SECRET=your_linkedin_api_secret_here
   
   # OpenAI API Configuration
   OPENAI_API_KEY=your_actual_openai_api_key_here
   
   # Facebook API Configuration
   FACEBOOK_APP_ID=your_facebook_app_id_here
   FACEBOOK_APP_SECRET=your_facebook_app_secret_here
   FACEBOOK_ACCESS_TOKEN=your_actual_facebook_token_here
   
   # Instagram API Configuration
   INSTAGRAM_APP_ID=your_instagram_app_id_here
   INSTAGRAM_APP_SECRET=your_instagram_app_secret_here
   INSTAGRAM_ACCESS_TOKEN=your_actual_instagram_token_here
   
   # Server Configuration (Optional)
   PORT=3001
   ```

---

## Local Deployment

Local deployment uses Docker Desktop to run the service in an isolated container on your machine.

### Step 1: Run the Local Deployment Script

```bash
cd services/mcpsocial
./deploy-local.sh
```

### What the Script Does

1. **Pre-flight checks**: Verifies Docker is installed and running
2. **Environment setup**: Checks for `.env` file and validates required variables
3. **Cleanup**: Removes any existing containers
4. **Build**: Creates a fresh Docker image
5. **Deploy**: Starts the container with your environment variables
6. **Verify**: Tests if the service is responding

### Accessing the Local Service

Once deployed, the service will be available at:

- **API Capabilities**: http://localhost:3001/api/capabilities
- **MCP Tools**: http://localhost:3001/mcp/tools
- **Health Check**: http://localhost:3001/api/capabilities

### Managing the Local Deployment

```bash
# View logs
docker logs -f mcpsocial-app

# Stop the service
docker stop mcpsocial-app

# Restart the service
docker restart mcpsocial-app

# Remove the service
docker stop mcpsocial-app && docker rm mcpsocial-app

# Redeploy (rebuild and restart)
./deploy-local.sh
```

---

## AWS Deployment

AWS deployment uses Amazon ECS (Elastic Container Service) with Fargate to run the service in a fully managed, serverless environment.

### Step 1: Configure AWS CLI

Ensure your AWS CLI is configured with the correct credentials:

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-2)
```

### Step 2: Run the AWS Deployment Script

```bash
cd services/mcpsocial
./deploy-aws.sh
```

The script will prompt you for API keys during deployment.

### What the Script Does

1. **Pre-flight checks**: Verifies AWS CLI, Docker, and jq are installed
2. **Collect credentials**: Prompts for API keys (not stored permanently)
3. **Infrastructure setup**: Creates ECR repository, CloudWatch logs, VPC resources
4. **Service cleanup**: Removes any existing ECS service
5. **Build & push**: Builds Docker image and pushes to ECR
6. **Task definition**: Registers ECS task with environment variables
7. **Service creation**: Deploys the service to ECS Fargate

### Post-Deployment

After deployment completes (2-3 minutes), you can:

#### Check Service Status
```bash
aws ecs describe-services \
  --cluster mcpsocial \
  --services mcpsocial-service \
  --region us-east-2
```

#### View Logs
```bash
aws logs tail /ecs/mcpsocial-task --follow --region us-east-2
```

#### Get Public IP Address
```bash
# List running tasks
aws ecs list-tasks \
  --cluster mcpsocial \
  --service-name mcpsocial-service \
  --region us-east-2

# Get task details (replace TASK_ARN with actual ARN)
aws ecs describe-tasks \
  --cluster mcpsocial \
  --tasks TASK_ARN \
  --region us-east-2
```

---

## Deployment Workflow

### Recommended Development Workflow

1. **Local Development**
   ```bash
   # Make code changes
   # Test locally
   ./deploy-local.sh
   
   # Verify functionality
   curl http://localhost:3001/api/capabilities | jq
   ```

2. **Local Testing & Validation**
   ```bash
   # Test all endpoints
   curl -X POST http://localhost:3001/api/openai/caption \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Amazing sunset at the beach"}'
   
   # Check logs for errors
   docker logs -f mcpsocial-app
   ```

3. **AWS Deployment** (only after local validation)
   ```bash
   # Deploy to AWS
   ./deploy-aws.sh
   
   # Monitor deployment
   aws ecs describe-services \
     --cluster mcpsocial \
     --services mcpsocial-service \
     --region us-east-2
   ```

### Best Practices

- ✅ **Always test locally first** before deploying to AWS
- ✅ **Validate all endpoints** work correctly in local environment
- ✅ **Review logs** for any errors or warnings
- ✅ **Use version control** to track changes before deployment
- ✅ **Document any configuration changes** in this file

---

## Troubleshooting

### Local Deployment Issues

#### Docker Not Running
```
Error: Docker daemon is not running.
Solution: Start Docker Desktop
```

#### Port Already in Use
```
Error: Port 3001 is already allocated
Solution: Stop the conflicting service or change the PORT in .env
```

#### Missing Environment Variables
```
Error: OPENAI_API_KEY not set in .env file
Solution: Edit .env and add your OpenAI API key
```

### AWS Deployment Issues

#### AWS CLI Not Configured
```
Error: AWS CLI is not installed or not in PATH
Solution: Install AWS CLI and run 'aws configure'
```

#### Task Fails to Start
```
Check CloudWatch logs:
aws logs tail /ecs/mcpsocial-task --follow --region us-east-2
```

#### Service Not Responding
1. Check task status
2. Verify security group allows inbound traffic on port 3001
3. Ensure environment variables are correctly set in task definition

---

## API Endpoints

Once deployed, the following endpoints are available:

### Core Endpoints

- `GET /api/capabilities` - List all available API endpoints
- `GET /mcp/tools` - List MCP protocol tools

### OpenAI Endpoints

- `POST /api/openai/caption` - Generate social media captions
  ```json
  {
    "prompt": "Your prompt here"
  }
  ```

- `POST /api/openai/schedule` - Get posting time suggestions
  ```json
  {
    "postContent": "Your post content"
  }
  ```

### Social Media Endpoints

See the [API Reference](./docs/API_REFERENCE.md) for complete documentation.

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs (local: `docker logs -f mcpsocial-app`, AWS: CloudWatch)
3. Consult the main documentation in `docs/`

---

## Version History

- **v1.1.0** - Migrated from Gemini to OpenAI API
- **v1.0.0** - Initial release with separate local/AWS deployment scripts
