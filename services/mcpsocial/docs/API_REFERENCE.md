# MCPSocial API Reference

Complete API reference for all endpoints available in the MCPSocial server.

## Table of Contents

- [Server Information](#server-information)
- [Authentication](#authentication)
- [MCP Protocol Endpoints](#mcp-protocol-endpoints)
- [REST API Endpoints](#rest-api-endpoints)
- [LinkedIn API](#linkedin-api)
- [Facebook API](#facebook-api)
- [Instagram API](#instagram-api)
- [Gemini AI API](#gemini-ai-api)
- [Error Responses](#error-responses)

## Server Information

| Property | Value |
|----------|-------|
| **Base URL (Public)** | `http://3.141.18.225:3001` |
| **Base URL (Local)** | `http://localhost:3001` |
| **Server Version** | `1.0.0` |
| **MCP Protocol Version** | `1.0` |
| **Content-Type** | `application/json` |

## Authentication

### LinkedIn OAuth 2.0

LinkedIn endpoints require an OAuth 2.0 access token obtained through the LinkedIn authentication flow.

**Scope Required**: `openid profile w_member_social`

**Authentication Header**:
```
Authorization: Bearer <access_token>
```

### Facebook & Instagram

Facebook and Instagram endpoints use access tokens configured via environment variables on the server.

---

## MCP Protocol Endpoints

### Get Server Info

Get server metadata and capabilities.

**Endpoint**: `GET /mcp/info`

**Response**:
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

### MCP v1 - JSON-RPC 2.0

Main endpoint for MCP protocol operations.

**Endpoint**: `POST /mcp/v1/`

**Content-Type**: `application/json`

**Methods**:
- `initialize` - Initialize MCP connection
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `resources/list` - List available resources
- `resources/read` - Read a resource

See [MCP_PROTOCOL.md](./MCP_PROTOCOL.md) for detailed protocol documentation.

### List Tools (Legacy)

**Endpoint**: `GET /mcp/tools`

**Response**:
```json
[
  {
    "name": "postToLinkedIn",
    "description": "Creates a new text-based post on LinkedIn.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "accessToken": { "type": "string" },
        "content": { "type": "string" }
      },
      "required": ["accessToken", "content"]
    }
  }
]
```

### Execute Tool (Legacy)

**Endpoint**: `POST /mcp/execute`

**Request Body**:
```json
{
  "toolName": "postToLinkedIn",
  "params": {
    "accessToken": "your-token",
    "content": "Hello World!"
  }
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "id": "post-12345",
    "status": "published"
  }
}
```

### List Resources (Legacy)

**Endpoint**: `GET /mcp/resources`

**Response**:
```json
[
  {
    "name": "getLinkedInProfile",
    "description": "Retrieves the user's LinkedIn profile information.",
    "fetch": "[Function]"
  }
]
```

---

## REST API Endpoints

### Get API Capabilities

**Endpoint**: `GET /api/capabilities`

**Response**:
```json
{
  "linkedin": {
    "auth": {
      "GET /api/auth/linkedin": "Initiates the LinkedIn OAuth2 flow.",
      "GET /api/auth/linkedin/callback": "Callback URL for LinkedIn OAuth2."
    },
    "posts": { ... },
    "profile": { ... }
  },
  "facebook": { ... },
  "instagram": { ... },
  "gemini": { ... }
}
```

---

## LinkedIn API

All LinkedIn endpoints require authentication via Bearer token.

### Authentication Endpoints

#### Initiate OAuth Flow

**Endpoint**: `GET /api/auth/linkedin`

**Description**: Redirects user to LinkedIn authorization page

**Response**: HTTP 302 Redirect to LinkedIn

---

#### OAuth Callback

**Endpoint**: `GET /api/auth/linkedin/callback`

**Query Parameters**:
- `code` (string, required) - Authorization code from LinkedIn
- `state` (string, required) - CSRF protection state

**Response**:
```json
{
  "message": "Successfully authenticated with LinkedIn!",
  "accessToken": "AQX...",
  "expiresIn": 5184000
}
```

### Post Management

#### Create Post

**Endpoint**: `POST /api/linkedin/posts`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "content": "This is my LinkedIn post!"
}
```

**Response**:
```json
{
  "id": "urn:li:share:123456789",
  "status": "published"
}
```

---

#### List Recent Posts

**Endpoint**: `GET /api/linkedin/posts`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
[
  {
    "id": "urn:li:share:123456789",
    "text": "Post content",
    "created": "2025-01-15T10:30:00Z",
    "likeCount": 42,
    "commentCount": 5
  }
]
```

---

#### Get Post Likes

**Endpoint**: `GET /api/linkedin/posts/:id/likes`

**Parameters**:
- `id` (path, required) - Post ID

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "totalLikes": 42,
  "likes": [
    {
      "userId": "john-doe",
      "name": "John Doe",
      "timestamp": "2025-01-15T11:00:00Z"
    }
  ]
}
```

---

#### Comment on Post

**Endpoint**: `POST /api/linkedin/posts/:id/comments`

**Parameters**:
- `id` (path, required) - Post ID

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "comment": "Great post!"
}
```

**Response**:
```json
{
  "id": "comment-789",
  "text": "Great post!",
  "created": "2025-01-15T12:00:00Z"
}
```

---

#### Get Post Comments

**Endpoint**: `GET /api/linkedin/posts/:id/comments`

**Parameters**:
- `id` (path, required) - Post ID

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
[
  {
    "id": "comment-789",
    "author": "Jane Smith",
    "text": "Great post!",
    "created": "2025-01-15T12:00:00Z"
  }
]
```

### Profile Management

#### Get Profile

**Endpoint**: `GET /api/linkedin/profile`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "id": "john-doe",
  "firstName": "John",
  "lastName": "Doe",
  "headline": "Software Engineer at Tech Co",
  "profilePicture": "https://..."
}
```

### Sharing

#### Share Article

**Endpoint**: `POST /api/linkedin/share`

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "url": "https://example.com/article",
  "text": "Check out this article!"
}
```

**Response**:
```json
{
  "id": "share-456",
  "status": "published"
}
```

### Connections

#### List Connections

**Endpoint**: `GET /api/linkedin/connections`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
[
  {
    "id": "connection-123",
    "name": "Jane Smith",
    "headline": "Product Manager"
  }
]
```

---

## Facebook API

### Post Management

#### Create Post

**Endpoint**: `POST /api/facebook/posts`

**Request Body**:
```json
{
  "content": "My Facebook post"
}
```

**Response**:
```json
{
  "id": "post_123456789",
  "status": "published"
}
```

---

#### List Recent Posts

**Endpoint**: `GET /api/facebook/posts`

**Response**:
```json
[
  {
    "id": "post_123",
    "message": "Post content",
    "created_time": "2025-01-15T10:30:00+0000"
  }
]
```

---

#### Get Post Likes

**Endpoint**: `GET /api/facebook/posts/:id/likes`

---

#### Comment on Post

**Endpoint**: `POST /api/facebook/posts/:id/comments`

**Request Body**:
```json
{
  "comment": "Nice post!"
}
```

---

#### Get Post Comments

**Endpoint**: `GET /api/facebook/posts/:id/comments`

### Photo Management

#### Upload Photo

**Endpoint**: `POST /api/facebook/photos`

**Request Body**:
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "caption": "Beautiful sunset"
}
```

### Page Management

#### Get Page Info

**Endpoint**: `GET /api/facebook/page`

**Response**:
```json
{
  "id": "page_123",
  "name": "My Page",
  "followers": 1000
}
```

### Friends

#### List Friends

**Endpoint**: `GET /api/facebook/friends`

---

## Instagram API

### Post Management

#### Create Post

**Endpoint**: `POST /api/instagram/posts`

**Request Body**:
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "caption": "Amazing view! #travel"
}
```

---

#### List Recent Posts

**Endpoint**: `GET /api/instagram/posts`

---

#### Get Post Likes

**Endpoint**: `GET /api/instagram/posts/:id/likes`

---

#### Comment on Post

**Endpoint**: `POST /api/instagram/posts/:id/comments`

---

#### Get Post Comments

**Endpoint**: `GET /api/instagram/posts/:id/comments`

### Profile Management

#### Get Profile

**Endpoint**: `GET /api/instagram/profile`

**Response**:
```json
{
  "username": "johndoe",
  "full_name": "John Doe",
  "biography": "Travel photographer",
  "followers_count": 5000,
  "following_count": 500
}
```

### Social Graph

#### Get Followers

**Endpoint**: `GET /api/instagram/followers`

---

#### Get Following

**Endpoint**: `GET /api/instagram/following`

---

## Gemini AI API

### Content Generation

#### Generate Caption

**Endpoint**: `POST /api/gemini/caption`

**Request Body**:
```json
{
  "prompt": "A beautiful sunset over the ocean with palm trees"
}
```

**Response**:
```json
{
  "caption": {
    "professional": "Witnessing nature's masterpiece...",
    "casual": "Sunset vibes 🌅",
    "witty": "The sun decided to show off today..."
  }
}
```

---

#### Get Scheduling Suggestion

**Endpoint**: `POST /api/gemini/schedule`

**Request Body**:
```json
{
  "postContent": "Exciting product launch announcement!"
}
```

**Response**:
```json
{
  "suggestion": {
    "linkedIn": {
      "day": "Tuesday",
      "time": "10:00 AM",
      "timezone": "EST"
    },
    "facebook": {
      "day": "Wednesday",
      "time": "1:00 PM",
      "timezone": "EST"
    },
    "instagram": {
      "day": "Sunday",
      "time": "9:00 AM",
      "timezone": "EST"
    }
  }
}
```

---

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "additional context"
  }
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| `200` | OK | Request succeeded |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Authenticated but not authorized |
| `404` | Not Found | Resource or endpoint not found |
| `500` | Internal Server Error | Server-side error occurred |

### Common Errors

#### Authentication Error

```json
{
  "error": "Authorization token is required",
  "code": "AUTH_REQUIRED"
}
```

#### Invalid Parameters

```json
{
  "error": "Missing required parameter \"content\" for tool \"postToLinkedIn\".",
  "code": "INVALID_PARAMS"
}
```

#### Tool Not Found

```json
{
  "error": "Tool \"unknownTool\" not found.",
  "code": "TOOL_NOT_FOUND"
}
```

---

## Rate Limiting

Rate limiting is applied per social media platform's API limits. Monitor response headers for rate limit information:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Using MCP v1 Protocol
const response = await fetch('http://3.141.18.225:3001/mcp/v1/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'postToLinkedIn',
      arguments: {
        accessToken: 'your-token',
        content: 'Hello from TypeScript!'
      }
    }
  })
});

const data = await response.json();
console.log(data.result);
```

### Python

```python
import requests

# Using REST API
response = requests.post(
    'http://3.141.18.225:3001/api/linkedin/posts',
    headers={
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    },
    json={'content': 'Hello from Python!'}
)

print(response.json())
```

### cURL

```bash
# Using MCP v1
curl -X POST http://3.141.18.225:3001/mcp/v1/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "generateCaption",
      "arguments": {
        "prompt": "Beach vacation"
      }
    }
  }'
```

---

## Further Documentation

- [MCP Protocol Specification](./MCP_PROTOCOL.md)
- [Integration Guide](./MCP_INTEGRATION_GUIDE.md)
- [Authentication Guide](./AUTHENTICATION_GUIDE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
