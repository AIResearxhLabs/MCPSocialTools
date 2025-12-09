# MCP Protocol Documentation - MCPSocial Server

## Overview

The MCPSocial server implements the **Model Context Protocol (MCP) version 1.0** with full JSON-RPC 2.0 support. This document describes the protocol implementation, available methods, and integration patterns.

## Server Information

| Property | Value |
|----------|-------|
| **Server Name** | `mcpsocial` |
| **Server Version** | `1.0.0` |
| **Protocol Version** | `1.0` |
| **Public Endpoint** | `http://3.141.18.225:3001` |
| **Transport** | HTTP/HTTPS |

## Capabilities

The server supports the following MCP capabilities:

- ✅ **Tools**: Execute operations across social media platforms
- ✅ **Resources**: Read data from social media accounts
- ✅ **JSON-RPC 2.0**: Standard protocol implementation

## Endpoints

### MCP v1 Protocol Endpoints (Recommended)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp/v1/` | `POST` | Main JSON-RPC 2.0 endpoint (all methods) |
| `/mcp/v1/tools/list` | `GET` | List all available tools (REST) |
| `/mcp/v1/resources/list` | `GET` | List all available resources (REST) |
| `/mcp/v1/info` | `GET` | Get server information |

### Legacy Endpoints (Backward Compatible)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp/tools` | `GET` | List all tools (legacy) |
| `/mcp/execute` | `POST` | Execute a tool (legacy) |
| `/mcp/resources` | `GET` | List all resources (legacy) |
| `/mcp/info` | `GET` | Get server information |

## JSON-RPC 2.0 Protocol

### Request Format

All requests to `/mcp/v1/` must follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "method_name",
  "params": {
    // method-specific parameters
  }
}
```

### Response Format

**Success Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    // method-specific result
  }
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "Detailed error message"
  }
}
```

### Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `-32600` | Invalid Request | The JSON sent is not a valid Request object |
| `-32601` | Method not found | The method does not exist or is not available |
| `-32602` | Invalid params | Invalid method parameter(s) |
| `-32603` | Internal error | Internal JSON-RPC error |

## Available Methods

### 1. initialize

Initialize connection with the MCP server and negotiate capabilities.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "1.0",
    "serverInfo": {
      "name": "mcpsocial",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": true,
      "resources": true
    }
  }
}
```

### 2. tools/list

List all available tools.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "postToLinkedIn",
        "description": "Creates a new text-based post on LinkedIn.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "accessToken": {
              "type": "string",
              "description": "The OAuth 2.0 access token"
            },
            "content": {
              "type": "string",
              "description": "The text content of the post"
            }
          },
          "required": ["accessToken", "content"]
        }
      }
      // ... more tools
    ]
  }
}
```

### 3. tools/call

Execute a specific tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "postToLinkedIn",
    "arguments": {
      "accessToken": "your-access-token",
      "content": "Hello from MCPSocial!"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\": \"post-12345\", \"status\": \"published\"}"
      }
    ]
  }
}
```

### 4. resources/list

List all available resources.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resources": [
      {
        "uri": "mcpsocial:///getLinkedInProfile",
        "name": "getLinkedInProfile",
        "description": "Retrieves the user's LinkedIn profile information.",
        "mimeType": "application/json"
      }
      // ... more resources
    ]
  }
}
```

### 5. resources/read

Read a specific resource.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/read",
  "params": {
    "uri": "mcpsocial:///getLinkedInProfile",
    "arguments": {
      "accessToken": "your-access-token"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "contents": [
      {
        "uri": "mcpsocial:///getLinkedInProfile",
        "mimeType": "application/json",
        "text": "{\"name\": \"John Doe\", \"headline\": \"Software Engineer\"}"
      }
    ]
  }
}
```

## Available Tools

### Social Media Tools

| Tool Name | Description | Required Parameters |
|-----------|-------------|---------------------|
| `postToLinkedIn` | Create a LinkedIn post | `accessToken`, `content` |
| `postToFacebook` | Create a Facebook post | `content` |
| `postToInstagram` | Create an Instagram post | `imageUrl`, `caption` |

### AI Tools (Gemini)

| Tool Name | Description | Required Parameters |
|-----------|-------------|---------------------|
| `generateCaption` | Generate post caption using AI | `prompt` |
| `getSchedulingSuggestion` | Get optimal posting time | `postContent` |

## Available Resources

### Social Media Resources

| Resource Name | URI | Description | Required Parameters |
|---------------|-----|-------------|---------------------|
| `getLinkedInProfile` | `mcpsocial:///getLinkedInProfile` | Get LinkedIn profile | `accessToken` |
| `getFacebookPageInfo` | `mcpsocial:///getFacebookPageInfo` | Get Facebook page info | None |
| `getInstagramProfile` | `mcpsocial:///getInstagramProfile` | Get Instagram profile | None |

## Integration Examples

### Example 1: Using curl with JSON-RPC

```bash
# Initialize connection
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

# Call a tool
curl -X POST http://3.141.18.225:3001/mcp/v1/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "generateCaption",
      "arguments": {
        "prompt": "A beautiful sunset over the ocean"
      }
    }
  }'
```

### Example 2: Using REST endpoints (Legacy)

```bash
# Get server info
curl http://3.141.18.225:3001/mcp/info

# List tools
curl http://3.141.18.225:3001/mcp/tools

# List resources
curl http://3.141.18.225:3001/mcp/resources

# Execute tool (legacy)
curl -X POST http://3.141.18.225:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "generateCaption",
    "params": {
      "prompt": "A beautiful sunset"
    }
  }'
```

## Best Practices

1. **Always initialize** the connection first using the `initialize` method
2. **Use JSON-RPC 2.0** format for all v1 endpoint requests
3. **Include request IDs** to track async operations
4. **Handle errors** according to JSON-RPC 2.0 error codes
5. **Validate tool parameters** before calling
6. **Use URIs** for resource access (format: `mcpsocial:///resourceName`)
7. **Secure tokens**: Never log or expose access tokens

## Migration from Legacy API

If you're using the legacy endpoints (`/mcp/tools`, `/mcp/execute`), migrate to v1:

**Before (Legacy):**
```bash
curl http://3.141.18.225:3001/mcp/execute \
  -d '{"toolName": "postToLinkedIn", "params": {...}}'
```

**After (v1):**
```bash
curl -X POST http://3.141.18.225:3001/mcp/v1/ \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {"name": "postToLinkedIn", "arguments": {...}}
  }'
```

## Support

For issues or questions:
- Review this documentation
- Check the API Reference: `docs/API_REFERENCE.md`
- See integration examples: `docs/MCP_INTEGRATION_GUIDE.md`
