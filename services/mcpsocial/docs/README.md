# MCPSocial Server

The MCPSocial server is a powerful and flexible **MCP (Model Context Protocol) v1.0** server designed for seamless integration with popular social media platforms and AI agents. It provides a unified API to manage posts, comments, and user profiles across LinkedIn, Facebook, and Instagram, while also leveraging the Gemini API for intelligent content generation and scheduling.

## 🌟 Key Features

- ✅ **MCP Protocol v1.0** compliant with JSON-RPC 2.0
- ✅ **Multi-platform** support (LinkedIn, Facebook, Instagram)
- ✅ **AI-powered** content generation and scheduling via Gemini
- ✅ **Dual API** layer (MCP + REST)
- ✅ **OAuth 2.0** authentication for LinkedIn
- ✅ **Production-ready** deployment on AWS ECS Fargate

## 📡 Server Information

| Property | Value |
|----------|-------|
| **Server Name** | `mcpsocial` |
| **Version** | `1.0.0` |
| **Protocol Version** | `1.0` |
| **Deployment** | AWS ECS Fargate |
| **Region** | `us-east-2` |

### Getting Current Endpoint

**⚠️ Important**: The public IP changes with each deployment. Get the current endpoint:

```bash
# Run the provided script
./get-endpoint.sh

# Or manually query AWS
aws ecs list-tasks --cluster mcpsocial --service-name mcpsocial-service --region us-east-2
```

**Current Endpoint** (as of last update): `http://3.141.18.225:3001`  
**Local Development**: `http://localhost:3001`

**📖 For stable endpoints**: See [SERVER_ENDPOINT.md](./SERVER_ENDPOINT.md) for ALB/domain setup recommendations.

## 1. System Architecture

The MCPSocial server is a microservice that exposes a set of tools and resources through an MCP host. It implements the official MCP protocol with JSON-RPC 2.0 support and provides both MCP and REST API endpoints. It interacts with the LinkedIn, Facebook, Instagram, and Gemini APIs to provide its functionality.

## 2. Quick Start

### Get Current Endpoint

```bash
# Get the current server endpoint (IP changes with each deployment)
./get-endpoint.sh

# Or export as environment variable
export MCPSOCIAL_ENDPOINT=$(./get-endpoint.sh | grep "http://" | awk '{print $4}')
```

### Access the Server

Replace `${MCPSOCIAL_ENDPOINT}` with your actual endpoint from the script above.

```bash
# Check server status
curl ${MCPSOCIAL_ENDPOINT}/mcp/info

# List available tools
curl ${MCPSOCIAL_ENDPOINT}/mcp/v1/tools/list

# Test with a simple tool
curl -X POST ${MCPSOCIAL_ENDPOINT}/mcp/v1/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "generateCaption",
      "arguments": {"prompt": "A beautiful sunset"}
    }
  }'
```

**Current Active Endpoint**: `http://3.141.18.225:3001` (updated: 2025-11-17)

## 3. API Endpoints

### MCP v1 Protocol (Recommended)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp/v1/` | `POST` | JSON-RPC 2.0 endpoint for all MCP methods |
| `/mcp/v1/tools/list` | `GET` | List all available tools |
| `/mcp/v1/resources/list` | `GET` | List all available resources |
| `/mcp/v1/info` | `GET` | Get server information |

### Legacy MCP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp/tools` | `GET` | List tools (backward compatible) |
| `/mcp/execute` | `POST` | Execute tool (backward compatible) |
| `/mcp/resources` | `GET` | List resources (backward compatible) |

### REST API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/auth/linkedin` | LinkedIn OAuth flow |
| `/api/linkedin/*` | LinkedIn API operations |
| `/api/facebook/*` | Facebook API operations |
| `/api/instagram/*` | Instagram API operations |
| `/api/gemini/*` | AI content generation |

**📚 Full API documentation**: See [API_REFERENCE.md](./API_REFERENCE.md)

## 4. Available Tools and Resources

The MCPSocial server provides **47 tools + 5 resources** across multiple platforms:

| Platform | Auth Tools | Functional Tools | Resources | Total Features |
|----------|-----------|------------------|-----------|----------------|
| **LinkedIn** | 2 | 7 | 1 | 10 |
| **Twitter/X** | 3 | 9 | 1 | 13 |
| **Facebook** | 2 | 11 | 1 | 14 |
| **Instagram** | 2 | 10 | 1 | 13 |
| **AI (OpenAI)** | 0 | 2 | 0 | 2 |
| **TOTAL** | **9** | **39** | **5** | **53** |

### Quick Tool Reference

**Authentication:**
- OAuth 2.0 flows for LinkedIn, Twitter, Facebook, Instagram
- Token exchange and refresh capabilities
- PKCE support for Twitter

**Content Management:**
- Create, list, and delete posts
- Upload photos and share links
- Comment and engage with content

**Analytics:**
- Post engagement metrics
- Account insights (Business accounts)
- Follower/following counts

**AI Features:**
- AI-powered caption generation
- Optimal posting time suggestions

**📚 Complete tool reference**: See [MCP_TOOLS_REFERENCE.md](./MCP_TOOLS_REFERENCE.md) for detailed documentation of all 47 tools

## 5. MCP Protocol Methods

### JSON-RPC 2.0 Methods

- `initialize` - Initialize MCP connection
- `tools/list` - List all available tools
- `tools/call` - Execute a tool
- `resources/list` - List all available resources
- `resources/read` - Read a resource

**📚 Full protocol documentation**: See [MCP_PROTOCOL.md](./MCP_PROTOCOL.md)

## 6. Setup and Configuration

### 6.1. Environment Variables

The following environment variables are required for the server to run:

*   `GEMINI_API_KEY`: The API key for the Gemini API.
*   `FACEBOOK_ACCESS_TOKEN`: The access token for the Facebook API.
*   `INSTAGRAM_ACCESS_TOKEN`: The access token for the Instagram API.

These variables should be defined in a `.env` file in the root of the `services/mcpsocial` directory.

### 6.2. Installation and Running

1.  **Installation:**
    ```bash
    npm install
    ```
2.  **Running the server (development):**
    ```bash
    npm run dev
    ```
3.  **Running the server (production):**
    ```bash
    npm run build
    npm start
    ```
4.  **Running tests:**
    ```bash
    npm test
    ```

### 6.3. AWS Deployment

The server is deployed on AWS ECS Fargate:

```bash
# Deploy to AWS
./deploy-aws.sh

# The script will:
# - Build Docker image for Linux/AMD64
# - Push to ECR
# - Update ECS service
# - Deploy to cluster
```

**Public Access**: `http://3.141.18.225:3001`

## 7. Integration with AI Agents

### Cline Integration

Add to your Cline MCP settings:

```json
{
  "mcpServers": {
    "mcpsocial": {
      "url": "http://3.141.18.225:3001/mcp/v1/",
      "transport": "http"
    }
  }
}
```

### Claude Desktop Integration

Add to Claude Desktop configuration:

```json
{
  "mcpServers": {
    "mcpsocial": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "http://3.141.18.225:3001/mcp/v1/"
      ]
    }
  }
}
```

**📚 Full integration guide**: See [MCP_INTEGRATION_GUIDE.md](./MCP_INTEGRATION_GUIDE.md)

## 8. Example Usage

### Using MCP Protocol

```bash
# Initialize connection
curl -X POST http://3.141.18.225:3001/mcp/v1/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
  }'

# Post to LinkedIn
curl -X POST http://3.141.18.225:3001/mcp/v1/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "postToLinkedIn",
      "arguments": {
        "accessToken": "YOUR_TOKEN",
        "content": "Hello from MCPSocial!"
      }
    }
  }'
```

### Using REST API

```bash
# LinkedIn OAuth
curl http://3.141.18.225:3001/api/auth/linkedin

# Create LinkedIn post
curl -X POST http://3.141.18.225:3001/api/linkedin/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello World!"}'
```

## 9. Documentation

### Core Documentation

| Document | Description |
|----------|-------------|
| [MCP_PROTOCOL.md](./MCP_PROTOCOL.md) | Complete MCP protocol specification |
| [API_REFERENCE.md](./API_REFERENCE.md) | Full API endpoint reference |
| [MCP_TOOLS_REFERENCE.md](./MCP_TOOLS_REFERENCE.md) | Complete tools & resources reference (47 tools) |
| [MCP_INTEGRATION_GUIDE.md](./MCP_INTEGRATION_GUIDE.md) | AI agent integration guide |
| [FUNCTIONAL_SPECIFICATION.md](./FUNCTIONAL_SPECIFICATION.md) | Functional specification |
| [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md) | Product requirements |

### Platform Integration Guides

| Document | Description |
|----------|-------------|
| [LINKEDIN_OAUTH_GUIDE.md](./LINKEDIN_OAUTH_GUIDE.md) | LinkedIn OAuth setup and authentication |
| [TWITTER_INTEGRATION_SUMMARY.md](./TWITTER_INTEGRATION_SUMMARY.md) | Twitter integration overview |
| [TWITTER_OAUTH_TEST_GUIDE.md](./TWITTER_OAUTH_TEST_GUIDE.md) | Twitter OAuth testing guide |
| [TWITTER_TOKEN_REFRESH_GUIDE.md](./TWITTER_TOKEN_REFRESH_GUIDE.md) | Twitter token refresh and troubleshooting |
| [FACEBOOK_INTEGRATION_GUIDE.md](./FACEBOOK_INTEGRATION_GUIDE.md) | Facebook OAuth, API, and best practices |
| [INSTAGRAM_INTEGRATION_GUIDE.md](./INSTAGRAM_INTEGRATION_GUIDE.md) | Instagram OAuth, API, and analytics |

### Deployment Documentation

| Document | Description |
|----------|-------------|
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | AWS deployment instructions |
| [SERVER_ENDPOINT.md](./SERVER_ENDPOINT.md) | Endpoint management and ALB setup |

## 10. OAuth Configuration

### LinkedIn
- **Scope:** `openid profile w_member_social`
- **Flow:** OAuth 2.0
- **Token Refresh:** Not yet implemented

### Twitter/X
- **Scope:** `tweet.read tweet.write users.read offline.access`
- **Flow:** OAuth 2.0 with PKCE
- **Token Refresh:** ✅ Implemented via `refreshTwitterToken` tool
- **Token Expiry:** 2 hours (proactive refresh recommended)

### Facebook
- **Scope:** `public_profile email pages_manage_posts pages_read_engagement`
- **Flow:** OAuth 2.0
- **API Version:** Graph API v19.0

### Instagram
- **Scope:** `user_profile user_media`
- **Flow:** OAuth 2.0 (via Facebook App)
- **Requirements:** Business or Creator account
- **Analytics:** Available for Business accounts

**📚 Detailed OAuth guides available for each platform in the documentation section above**

## 11. Architecture Highlights

- **MCP v1.0 Compliant**: Full JSON-RPC 2.0 implementation
- **Backward Compatible**: Legacy endpoints still supported
- **Versioned APIs**: `/mcp/v1/` for future compatibility
- **Platform Agnostic**: Built for Linux/AMD64 (AWS compatible)
- **Production Ready**: Running on AWS ECS Fargate
- **Secure**: OAuth 2.0 authentication, no hardcoded secrets
- **Documented**: Comprehensive API and protocol documentation

## 12. Support & Troubleshooting

### Check Server Status

```bash
curl http://3.141.18.225:3001/mcp/info
```

### Common Issues

1. **Connection Issues**: Verify server is accessible
2. **Authentication Errors**: Check token validity and scope
3. **Tool Errors**: Verify parameters match tool schema

See [MCP_INTEGRATION_GUIDE.md](./MCP_INTEGRATION_GUIDE.md#troubleshooting) for detailed troubleshooting.

## 13. Contributing

When contributing:
1. Ensure LinkedIn functionality remains intact
2. Follow MCP protocol standards
3. Add tests for new features
4. Update documentation
5. Maintain backward compatibility
