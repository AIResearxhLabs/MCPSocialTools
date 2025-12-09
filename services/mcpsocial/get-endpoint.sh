#!/bin/bash
# Get current MCPSocial server endpoint from AWS ECS

set -e

CLUSTER="mcpsocial"
SERVICE="mcpsocial-service"
REGION="us-east-2"

echo "🔍 Fetching current MCPSocial server endpoint..."
echo ""

# Get the current task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster $CLUSTER \
  --service-name $SERVICE \
  --region $REGION \
  --query 'taskArns[0]' \
  --output text 2>/dev/null)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" == "None" ]; then
  echo "❌ Error: No running tasks found in cluster '$CLUSTER'"
  echo ""
  echo "Check service status:"
  echo "  aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION"
  exit 1
fi

echo "✅ Found running task"

# Get the network interface ID
ENI_ID=$(aws ecs describe-tasks \
  --cluster $CLUSTER \
  --tasks $TASK_ARN \
  --region $REGION \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text 2>/dev/null)

if [ -z "$ENI_ID" ]; then
  echo "❌ Error: Could not retrieve network interface ID"
  exit 1
fi

echo "✅ Retrieved network interface"

# Get the public IP
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $ENI_ID \
  --region $REGION \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text 2>/dev/null)

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "None" ]; then
  echo "❌ Error: No public IP assigned to task"
  echo ""
  echo "Task may not have public IP enabled or is still starting up."
  exit 1
fi

echo "✅ Retrieved public IP"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 MCPSocial Server Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  http://$PUBLIC_IP:3001"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Quick Tests:"
echo "  curl http://$PUBLIC_IP:3001/mcp/info"
echo "  curl http://$PUBLIC_IP:3001/"
echo ""
echo "Export as environment variable:"
echo "  export MCPSOCIAL_ENDPOINT=http://$PUBLIC_IP:3001"
echo ""
echo "MCP v1 Protocol:"
echo "  curl -X POST http://$PUBLIC_IP:3001/mcp/v1/ \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\"}'"
echo ""
