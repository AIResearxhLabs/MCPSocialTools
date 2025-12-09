# MCP Tools & Resources Reference

Complete reference for all tools and resources exposed by the MCPSocial MCP server.

## 📊 Overview

| Category | Count | Description |
|----------|-------|-------------|
| **Authentication** | 2 tools | LinkedIn OAuth 2.0 flow |
| **LinkedIn** | 7 tools + 1 resource | Posts, likes, comments, sharing, connections, profile |
| **Facebook** | 1 tool + 1 resource | Posts and page info |
| **Instagram** | 1 tool + 1 resource | Posts and profile |
| **AI (OpenAI)** | 2 tools | Caption generation and scheduling suggestions |
| **Total** | **13 tools + 3 resources** | |

---

## 🔐 Authentication Tools

### 1. getLinkedInAuthUrl

**Purpose:** Generate OAuth 2.0 authorization URL for LinkedIn authentication

**Input Schema:**
```json
{
  "state": "string (optional) - CSRF protection token"
}
```

**Example Call:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "getLinkedInAuthUrl",
    "params": {}
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "authorizationUrl": "https://www.linkedin.com/oauth/v2/authorization?...",
    "state": "random_csrf_token",
    "callbackUrl": "http://localhost:3001/api/auth/linkedin/callback",
    "instructions": [
      "1. Direct the user to open the authorizationUrl in their browser",
      "2. User will authenticate and authorize the application",
      "3. LinkedIn will redirect to the callbackUrl with a code parameter",
      "4. Use the code with the exchangeLinkedInAuthCode tool to get an access token"
    ]
  }
}
```

**Workflow:**
1. Call `getLinkedInAuthUrl` to get authorization URL
2. Direct user to open the URL in their browser
3. User authenticates with LinkedIn
4. LinkedIn redirects to callback URL with authorization code
5. Use the code to get access token (see next tool)

---

### 2. exchangeLinkedInAuthCode

**Purpose:** Get instructions for exchanging authorization code for access token

**Input Schema:**
```json
{
  "code": "string (required) - Authorization code from LinkedIn callback"
}
```

**Example Call:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "exchangeLinkedInAuthCode",
    "params": {
      "code": "AQT...your_auth_code"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "message": "Token exchange must be performed server-side for security",
    "callbackEndpoint": "http://localhost:3001/api/auth/linkedin/callback?code=<code>",
    "note": "For development, call GET /api/auth/linkedin/callback?code=<code> to exchange the code",
    "instructions": [...]
  }
}
```

**Security Note:** The actual token exchange happens server-side through the `/api/auth/linkedin/callback` endpoint to protect the client secret.

---

## 📱 LinkedIn Tools

### 3. postToLinkedIn

**Purpose:** Create a new text-based post on LinkedIn

**Input Schema:**
```json
{
  "accessToken": "string (required) - OAuth 2.0 access token",
  "content": "string (required) - Post text content"
}
```

**Example Call:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "postToLinkedIn",
    "params": {
      "accessToken": "YOUR_ACCESS_TOKEN",
      "content": "Excited to share my latest project! #tech #innovation"
    }
  }'
```

---

### 4. listLinkedInPosts

**Purpose:** List the last 5 posts from the user's LinkedIn account

**Input Schema:**
```json
{
  "accessToken": "string (required) - OAuth 2.0 access token"
}
```

---

### 5. getLinkedInPostLikes

**Purpose:** Get likes for a specific LinkedIn post

**Input Schema:**
```json
{
  "accessToken": "string (required) - OAuth 2.0 access token",
  "postId": "string (required) - ID of the post"
}
```

---

### 6. commentOnLinkedInPost

**Purpose:** Add a comment to a specific LinkedIn post

**Input Schema:**
```json
{
  "accessToken": "string (required) - OAuth 2.0 access token",
  "postId": "string (required) - ID of the post",
  "comment": "string (required) - Comment text"
}
```

---

### 7. getLinkedInPostComments

**Purpose:** Get comments for a specific LinkedIn post

**Input Schema:**
```json
{
  "accessToken": "string (required) - OAuth 2.0 access token",
  "postId": "string (required) - ID of the post"
}
```

---

### 8. shareLinkedInArticle

**Purpose:** Share an article on LinkedIn with optional commentary

**Input Schema:**
```json
{
  "accessToken": "string (required) - OAuth 2.0 access token",
  "url": "string (required) - URL of the article",
  "text": "string (optional) - Commentary text"
}
```

---

### 9. listLinkedInConnections

**Purpose:** List the user's LinkedIn connections

**Input Schema:**
```json
{
  "accessToken": "string (required) - OAuth 2.0 access token"
}
```

---

## 📘 Facebook Tools

### 10. postToFacebook

**Purpose:** Create a new post on Facebook

**Input Schema:**
```json
{
  "content": "string (required) - Post text content"
}
```

**Example Call:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "postToFacebook",
    "params": {
      "content": "Having a great day! #blessed"
    }
  }'
```

---

## 📸 Instagram Tools

### 11. postToInstagram

**Purpose:** Create a new post on Instagram

**Input Schema:**
```json
{
  "imageUrl": "string (required) - URL of the image",
  "caption": "string (required) - Post caption"
}
```

**Example Call:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "postToInstagram",
    "params": {
      "imageUrl": "https://example.com/image.jpg",
      "caption": "Beautiful sunset! #nature"
    }
  }'
```

---

## 🤖 AI Tools (OpenAI GPT-4)

### 12. generateCaption

**Purpose:** Generate creative social media captions using OpenAI GPT-4

**Input Schema:**
```json
{
  "prompt": "string (required) - Description of the post/image"
}
```

**Example Call:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "generateCaption",
    "params": {
      "prompt": "A beautiful sunset at the beach"
    }
  }'
```

**Response Format:**
```json
{
  "success": true,
  "result": "{
    \"professional\": \"Professional caption...\",
    \"casual\": \"Casual caption...\",
    \"witty\": \"Witty caption...\"
  }"
}
```

**AI Prompt Context:**
The tool generates three caption variations:
- **Professional**: Formal, business-appropriate tone
- **Casual**: Friendly, conversational tone
- **Witty**: Humorous, clever tone

---

### 13. getSchedulingSuggestion

**Purpose:** Get AI-powered suggestions for optimal posting times

**Input Schema:**
```json
{
  "postContent": "string (required) - The content to be posted"
}
```

**Example Call:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "getSchedulingSuggestion",
    "params": {
      "postContent": "Excited to announce our new product launch!"
    }
  }'
```

**Response Format:**
```json
{
  "success": true,
  "result": "{
    \"linkedIn\": \"Tomorrow at 9:00 AM (Weekday)\",
    \"facebook\": \"Today at 8:00 PM (Evening)\",
    \"instagram\": \"Tomorrow at 12:00 PM (Lunchtime)\"
  }"
}
```

**AI Analysis:**
The tool analyzes content and provides platform-specific timing recommendations based on:
- User engagement patterns per platform
- Content type and target audience
- Optimal posting windows for each platform

---

## 📦 MCP Resources

Resources are read-only data sources that can be fetched through the MCP protocol.

### 1. getLinkedInProfile

**URI:** `mcpsocial:///getLinkedInProfile`

**Purpose:** Retrieve user's LinkedIn profile information

**Parameters:**
```json
{
  "accessToken": "string (required) - OAuth 2.0 access token"
}
```

**Access via MCP v1:**
```bash
curl -X POST http://localhost:3001/mcp/v1 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "resources/read",
    "params": {
      "uri": "mcpsocial:///getLinkedInProfile",
      "arguments": {
        "accessToken": "YOUR_ACCESS_TOKEN"
      }
    }
  }'
```

---

### 2. getFacebookPageInfo

**URI:** `mcpsocial:///getFacebookPageInfo`

**Purpose:** Retrieve Facebook page information

**Access via GET:**
```bash
curl http://localhost:3001/mcp/resources
```

---

### 3. getInstagramProfile

**URI:** `mcpsocial:///getInstagramProfile`

**Purpose:** Retrieve user's Instagram profile information

---

## 🔌 MCP Protocol Endpoints

### Standard MCP v1 (JSON-RPC 2.0)

**Base URL:** `http://localhost:3001/mcp/v1`

**Methods:**
- `initialize` - Initialize MCP session
- `tools/list` - List all available tools
- `tools/call` - Execute a tool
- `resources/list` - List all available resources
- `resources/read` - Fetch a resource

### Legacy Endpoints (Backward Compatibility)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mcp/tools` | GET | List all tools (simple format) |
| `/mcp/execute` | POST | Execute a tool |
| `/mcp/resources` | GET | List all resources |
| `/mcp/info` | GET | Get server information |

---

## 🚀 Quick Start for MCP Clients

### Step 1: Discover Available Tools
```bash
curl http://localhost:3001/mcp/tools | jq
```

### Step 2: Authenticate with LinkedIn
```bash
# Get auth URL
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"toolName":"getLinkedInAuthUrl","params":{}}' | jq

# User visits URL and authorizes
# LinkedIn redirects with code parameter

# Exchange code for token (via server endpoint)
curl "http://localhost:3001/api/auth/linkedin/callback?code=YOUR_CODE"
```

### Step 3: Use LinkedIn Tools
```bash
# Create a post
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "postToLinkedIn",
    "params": {
      "accessToken": "YOUR_ACCESS_TOKEN",
      "content": "Hello from MCP!"
    }
  }'
```

### Step 4: Generate AI Captions
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "generateCaption",
    "params": {
      "prompt": "Product launch announcement"
    }
  }'
```

---

## 🎯 Use Cases

### Use Case 1: Scheduled LinkedIn Post with AI Caption

```bash
# 1. Generate caption
CAPTION=$(curl -s -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"toolName":"generateCaption","params":{"prompt":"New feature release"}}' \
  | jq -r '.result' | jq -r '.professional')

# 2. Get scheduling suggestion
SCHEDULE=$(curl -s -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{\"toolName\":\"getSchedulingSuggestion\",\"params\":{\"postContent\":\"$CAPTION\"}}" \
  | jq -r '.result' | jq -r '.linkedIn')

# 3. Post to LinkedIn at suggested time
echo "Post: $CAPTION"
echo "Suggested time: $SCHEDULE"
```

### Use Case 2: Cross-Platform Content Distribution

```bash
# Generate caption
curl -X POST http://localhost:3001/mcp/execute \
  -d '{"toolName":"generateCaption","params":{"prompt":"Company milestone"}}'

# Post to LinkedIn
curl -X POST http://localhost:3001/mcp/execute \
  -d '{"toolName":"postToLinkedIn","params":{"accessToken":"...","content":"..."}}'

# Post to Facebook
curl -X POST http://localhost:3001/mcp/execute \
  -d '{"toolName":"postToFacebook","params":{"content":"..."}}'

# Post to Instagram (with image)
curl -X POST http://localhost:3001/mcp/execute \
  -d '{"toolName":"postToInstagram","params":{"imageUrl":"...","caption":"..."}}'
```

---

## 🔍 Discovery & Introspection

### List All Tools
```bash
curl http://localhost:3001/mcp/tools | jq '[.[] | {name, description}]'
```

### List All Resources
```bash
curl http://localhost:3001/mcp/resources | jq
```

### Get Server Info
```bash
curl http://localhost:3001/mcp/info | jq
```

### Filter Tools by Category
```bash
# LinkedIn tools only
curl -s http://localhost:3001/mcp/tools | jq '.[] | select(.name | contains("LinkedIn"))'

# Authentication tools only
curl -s http://localhost:3001/mcp/tools | jq '.[] | select(.name | contains("Auth"))'

# AI tools only
curl -s http://localhost:3001/mcp/tools | jq '.[] | select(.description | contains("OpenAI"))'
```

---

## 🎨 AI Prompt Engineering

### Caption Generation Best Practices

**Good Prompts:**
- "Product launch announcement for enterprise software"
- "Team celebration after successful quarter"
- "Thought leadership post about AI trends"
- "Job opening for senior developer role"

**Better Prompts (More Context):**
- "Product launch for our new AI-powered analytics dashboard targeting B2B customers"
- "Team photo celebrating 100% customer satisfaction rating in Q4"
- "Expert analysis of GPT-4's impact on software development workflows"
- "Remote-friendly senior full-stack developer position focusing on React and Node.js"

### Scheduling Suggestions

The AI considers:
- **LinkedIn**: B2B audience, weekday morning/lunch hours
- **Facebook**: B2C audience, evening and weekend engagement
- **Instagram**: Visual content, lunchtime and evening peaks

---

## 🔗 Integration Examples

### Python Example
```python
import requests

# Get LinkedIn auth URL
response = requests.post(
    'http://localhost:3001/mcp/execute',
    json={
        'toolName': 'getLinkedInAuthUrl',
        'params': {}
    }
)
auth_data = response.json()['result']
print(f"Visit: {auth_data['authorizationUrl']}")

# After user authorizes, post content
response = requests.post(
    'http://localhost:3001/mcp/execute',
    json={
        'toolName': 'postToLinkedIn',
        'params': {
            'accessToken': access_token,
            'content': 'Hello from Python!'
        }
    }
)
```

### JavaScript/Node.js Example
```javascript
const axios = require('axios');

async function postToLinkedIn(accessToken, content) {
  const response = await axios.post('http://localhost:3001/mcp/execute', {
    toolName: 'postToLinkedIn',
    params: { accessToken, content }
  });
  return response.data;
}

async function generateCaption(prompt) {
  const response = await axios.post('http://localhost:3001/mcp/execute', {
    toolName: 'generateCaption',
    params: { prompt }
  });
  return JSON.parse(response.data.result);
}

// Usage
const captions = await generateCaption('Product announcement');
await postToLinkedIn(token, captions.professional);
```

---

## 📋 Complete Tool Listing

| # | Tool Name | Category | Requires Auth | Description |
|---|-----------|----------|---------------|-------------|
| 1 | getLinkedInAuthUrl | Auth | No | Generate OAuth URL |
| 2 | exchangeLinkedInAuthCode | Auth | No | Token exchange instructions |
| 3 | postToLinkedIn | LinkedIn | Yes | Create post |
| 4 | listLinkedInPosts | LinkedIn | Yes | List posts |
| 5 | getLinkedInPostLikes | LinkedIn | Yes | Get post likes |
| 6 | commentOnLinkedInPost | LinkedIn | Yes | Add comment |
| 7 | getLinkedInPostComments | LinkedIn | Yes | Get comments |
| 8 | shareLinkedInArticle | LinkedIn | Yes | Share article |
| 9 | listLinkedInConnections | LinkedIn | Yes | List connections |
| 10 | postToFacebook | Facebook | Yes | Create post |
| 11 | postToInstagram | Instagram | Yes | Create post with image |
| 12 | generateCaption | AI | No | Generate captions (OpenAI) |
| 13 | getSchedulingSuggestion | AI | No | Get posting time suggestions |

---

## 🛡️ Security & Best Practices

1. **Never expose access tokens** in logs or error messages
2. **Always validate** input parameters before making API calls
3. **Use HTTPS** in production environments
4. **Rotate tokens** regularly and handle token expiration
5. **Rate limiting** - Be mindful of API rate limits on each platform
6. **CSRF protection** - Always use and verify the `state` parameter in OAuth flows

---

## 📞 Support

For questions or issues:
- Review the [API Reference](./API_REFERENCE.md)
- Check the [Authentication Guide](./AUTHENTICATION_GUIDE.md)
- See the [MCP Integration Guide](./MCP_INTEGRATION_GUIDE.md)

---

**Last Updated:** November 17, 2025  
**Server Version:** 1.0.0  
**MCP Protocol Version:** 1.0
