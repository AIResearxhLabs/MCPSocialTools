# Server Endpoint Configuration

## Current Deployment

**⚠️ Note:** The public IP address changes with each ECS task deployment. Always get the current IP from AWS.

### Getting Current Endpoint

```bash
# Get the current task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster mcpsocial \
  --service-name mcpsocial-service \
  --region us-east-2 \
  --query 'taskArns[0]' \
  --output text)

# Get the network interface ID
ENI_ID=$(aws ecs describe-tasks \
  --cluster mcpsocial \
  --tasks $TASK_ARN \
  --region us-east-2 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

# Get the public IP
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $ENI_ID \
  --region us-east-2 \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

echo "Current Server Endpoint: http://$PUBLIC_IP:3001"
```

### Current Active Endpoint (as of last deployment)

**Endpoint**: `http://3.141.18.225:3001`
**Last Updated**: 2025-11-17 14:48 UTC
**Task ID**: `868b290fafed41aa9d2181bab441cb50`

---

## Recommended Solutions for Stable Endpoints

### Option 1: Use Application Load Balancer (ALB)

**Pros:**
- Stable DNS name that doesn't change
- SSL/TLS termination
- Health checks
- Auto-scaling support

**Setup:**
```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name mcpsocial-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx \
  --region us-east-2

# Get DNS name
aws elbv2 describe-load-balancers \
  --names mcpsocial-alb \
  --region us-east-2 \
  --query 'LoadBalancers[0].DNSName'
```

**Result**: `mcpsocial-alb-123456789.us-east-2.elb.amazonaws.com`

---

### Option 2: Elastic IP Address

**Pros:**
- Static IP address
- Simple setup
- No additional cost when attached

**Setup:**
```bash
# Allocate Elastic IP
aws ec2 allocate-address \
  --domain vpc \
  --region us-east-2

# Associate with task (requires NAT Gateway or manual association)
```

**Limitation**: Requires additional network configuration for Fargate tasks.

---

### Option 3: Custom Domain with Route 53

**Pros:**
- Professional endpoint (e.g., `api.mcpsocial.com`)
- SSL/TLS support
- Easy to remember
- Industry standard

**Setup:**
```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name mcpsocial.com \
  --caller-reference $(date +%s)

# Create A record pointing to ALB or IP
```

**Result**: `https://api.mcpsocial.com`

---

## Current Workaround

Until a stable endpoint is configured, use the script above to get the current IP before testing or integration.

### Script: `get-endpoint.sh`

```bash
#!/bin/bash
# Get current MCPSocial server endpoint

TASK_ARN=$(aws ecs list-tasks \
  --cluster mcpsocial \
  --service-name mcpsocial-service \
  --region us-east-2 \
  --query 'taskArns[0]' \
  --output text)

if [ -z "$TASK_ARN" ]; then
  echo "Error: No running tasks found"
  exit 1
fi

ENI_ID=$(aws ecs describe-tasks \
  --cluster mcpsocial \
  --tasks $TASK_ARN \
  --region us-east-2 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $ENI_ID \
  --region us-east-2 \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

if [ -z "$PUBLIC_IP" ]; then
  echo "Error: Could not retrieve public IP"
  exit 1
fi

echo "MCPSocial Server Endpoint: http://$PUBLIC_IP:3001"
echo ""
echo "Quick Tests:"
echo "  curl http://$PUBLIC_IP:3001/mcp/info"
echo "  curl http://$PUBLIC_IP:3001/mcp/v1/info"
```

**Usage:**
```bash
chmod +x get-endpoint.sh
./get-endpoint.sh
```

---

## Environment Variable Approach

For application code that needs the endpoint, use environment variables:

```bash
# Set in your environment
export MCPSOCIAL_ENDPOINT=$(./get-endpoint.sh | grep "http://" | awk '{print $4}')

# Use in code
const endpoint = process.env.MCPSOCIAL_ENDPOINT || 'http://localhost:3001';
```

---

## Documentation Convention

In all documentation files, we now use:
- `${MCPSOCIAL_ENDPOINT}` as a placeholder
- Always run `get-endpoint.sh` to get current value
- Update `SERVER_ENDPOINT.md` after each deployment with current IP

---

## Recommendation

**For Production Use**: Implement **Option 3 (Custom Domain with ALB)** for:
- ✅ Stable endpoint that never changes
- ✅ HTTPS/SSL support
- ✅ Professional appearance
- ✅ Better security
- ✅ Easier to document and share
