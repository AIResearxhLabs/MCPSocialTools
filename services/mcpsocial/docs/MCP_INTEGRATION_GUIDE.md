# MCP Integration Guide for AI Agents

This guide explains how to integrate AI agents (like Cline, Claude Desktop, or custom agents) with the MCPSocial server.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Cline Integration](#cline-integration)
- [Claude Desktop Integration](#claude-desktop-integration)
- [Custom Agent Integration](#custom-agent-integration)
- [Tool Usage Examples](#tool-usage-examples)
- [Resource Access Examples](#resource-access-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

MCPSocial implements the **Model Context Protocol (MCP) v1.0**, allowing AI agents to:
- **Use Tools**: Execute actions like posting to LinkedIn, Facebook, Instagram
- **Access Resources**: Read profile information and social media data
- **Generate Content**: Use AI to create captions and get scheduling suggestions

### Server Information

| Property | Value |
|----------|-------|
| **Server Name** | `mcpsocial` |
| **Public Endpoint** | `http://3.141.18.225:3001` |
| **Protocol Version** | `1.0` |
| **Transport** | HTTP |

## Quick Start

### 1. Test Connection

```bash
# Test server is reachable
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

### 2. List Available Tools

```bash
curl http://3.141.18.225:3001/mcp/v1/tools/list
```

### 3. Execute Your First Tool

```bash
curl -X POST http://3.141.18.225:3001/mcp/v1/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "generateCaption",
      "arguments": {
        "prompt": "A beautiful sunset over the ocean"
      }
    }
  }'
```

---

## Cline Integration

### Configuration

To connect Cline to MCPSocial, add the following to your Cline MCP settings:

#### Option 1: Using MCP Config File

Add to your `~/.config/cline/mcp_settings.json`:

```json
{
  "mcpServers": {
    "mcpsocial": {
      "command": "node",
      "args": [
        "-e",
        "require('http').createServer((req,res)=>{require('child_process').exec('curl -X POST http://3.141.18.225:3001/mcp/v1/ -H \"Content-Type: application/json\" -d @-',{encoding:'utf8'},(e,o)=>res.end(o))}).listen(process.env.PORT||0)"
      ],
      "env": {
        "MCP_SERVER_URL": "http://3.141.18.225:3001"
      }
    }
  }
}
```

#### Option 2: Direct HTTP Connection

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

### Using Tools in Cline

Once configured, you can ask Cline to:

```
"Post to LinkedIn saying 'Hello from Cline!'"
```

Cline will automatically:
1. Discover the `postToLinkedIn` tool
2. Request your LinkedIn access token
3. Execute the tool
4. Return the result

---

## Claude Desktop Integration

### Configuration

Add to your Claude Desktop MCP configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

### Alternative: Using stdio Bridge

Create a bridge script `mcpsocial-bridge.js`:

```javascript
const http = require('http');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  const request = JSON.parse(line);
  
  const options = {
    hostname: '3.141.18.225',
    port: 3001,
    path: '/mcp/v1/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log(data));
  });

  req.write(JSON.stringify(request));
  req.end();
});
```

Then configure:

```json
{
  "mcpServers": {
    "mcpsocial": {
      "command": "node",
      "args": ["path/to/mcpsocial-bridge.js"]
    }
  }
}
```

---

## Custom Agent Integration

### Protocol Flow

1. **Initialize Connection**
2. **Discover Tools & Resources**
3. **Execute Tools or Read Resources**
4. **Handle Responses**

### Example: Python Integration

```python
import requests
import json

class MCPSocialClient:
    def __init__(self, base_url="http://3.141.18.225:3001"):
        self.base_url = base_url
        self.endpoint = f"{base_url}/mcp/v1/"
        self.request_id = 0
        
    def _call_method(self, method, params=None):
        """Call an MCP method using JSON-RPC 2.0"""
        self.request_id += 1
        payload = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params or {}
        }
        
        response = requests.post(
            self.endpoint,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()
    
    def initialize(self):
        """Initialize MCP connection"""
        return self._call_method("initialize")
    
    def list_tools(self):
        """List all available tools"""
        result = self._call_method("tools/list")
        return result["result"]["tools"]
    
    def call_tool(self, tool_name, arguments):
        """Execute a tool"""
        params = {
            "name": tool_name,
            "arguments": arguments
        }
        result = self._call_method("tools/call", params)
        return result["result"]
    
    def list_resources(self):
        """List all available resources"""
        result = self._call_method("resources/list")
        return result["result"]["resources"]
    
    def read_resource(self, uri, arguments=None):
        """Read a resource"""
        params = {
            "uri": uri,
            "arguments": arguments or {}
        }
        result = self._call_method("resources/read", params)
        return result["result"]

# Usage Example
client = MCPSocialClient()

# Initialize
init_response = client.initialize()
print(f"Connected to: {init_response['result']['serverInfo']['name']}")

# List tools
tools = client.list_tools()
print(f"Available tools: {[t['name'] for t in tools]}")

# Generate a caption
result = client.call_tool(
    "generateCaption",
    {"prompt": "A beautiful sunset over the ocean"}
)
print(f"Generated caption: {result}")

# Read LinkedIn profile
profile = client.read_resource(
    "mcpsocial:///getLinkedInProfile",
    {"accessToken": "your-token-here"}
)
print(f"Profile: {profile}")
```

### Example: Node.js Integration

```javascript
const axios = require('axios');

class MCPSocialClient {
  constructor(baseUrl = 'http://3.141.18.225:3001') {
    this.endpoint = `${baseUrl}/mcp/v1/`;
    this.requestId = 0;
  }

  async callMethod(method, params = {}) {
    this.requestId++;
    const payload = {
      jsonrpc: '2.0',
      id: this.requestId,
      method,
      params
    };

    const response = await axios.post(this.endpoint, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    return response.data;
  }

  async initialize() {
    return this.callMethod('initialize');
  }

  async listTools() {
    const result = await this.callMethod('tools/list');
    return result.result.tools;
  }

  async callTool(toolName, args) {
    const result = await this.callMethod('tools/call', {
      name: toolName,
      arguments: args
    });
    return result.result;
  }

  async listResources() {
    const result = await this.callMethod('resources/list');
    return result.result.resources;
  }

  async readResource(uri, args = {}) {
    const result = await this.callMethod('resources/read', {
      uri,
      arguments: args
    });
    return result.result;
  }
}

// Usage
(async () => {
  const client = new MCPSocialClient();
  
  // Initialize
  const init = await client.initialize();
  console.log(`Connected to: ${init.result.serverInfo.name}`);
  
  // List and call tools
  const tools = await client.listTools();
  console.log(`Tools: ${tools.map(t => t.name).join(', ')}`);
  
  // Generate caption
  const caption = await client.callTool('generateCaption', {
    prompt: 'Beach vacation photo'
  });
  console.log('Caption:', caption);
})();
```

---

## Tool Usage Examples

### 1. Post to LinkedIn

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "postToLinkedIn",
    "arguments": {
      "accessToken": "YOUR_LINKEDIN_TOKEN",
      "content": "Excited to share my latest project! #coding #tech"
    }
  }
}
```

### 2. Post to Facebook

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "postToFacebook",
    "arguments": {
      "content": "Check out this amazing sunset!"
    }
  }
}
```

### 3. Post to Instagram

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "postToInstagram",
    "arguments": {
      "imageUrl": "https://example.com/sunset.jpg",
      "caption": "Golden hour magic ✨ #sunset #photography"
    }
  }
}
```

### 4. Generate AI Caption

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "generateCaption",
    "arguments": {
      "prompt": "A photo of a coffee shop with people working on laptops"
    }
  }
}
```

### 5. Get Scheduling Suggestion

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "getSchedulingSuggestion",
    "arguments": {
      "postContent": "Announcing our new product launch!"
    }
  }
}
```

---

## Resource Access Examples

### 1. Get LinkedIn Profile

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "resources/read",
  "params": {
    "uri": "mcpsocial:///getLinkedInProfile",
    "arguments": {
      "accessToken": "YOUR_LINKEDIN_TOKEN"
    }
  }
}
```

### 2. Get Facebook Page Info

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "resources/read",
  "params": {
    "uri": "mcpsocial:///getFacebookPageInfo"
  }
}
```

### 3. Get Instagram Profile

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "resources/read",
  "params": {
    "uri": "mcpsocial:///getInstagramProfile"
  }
}
```

---

## Best Practices

### 1. Token Management

- **Never hardcode tokens** in your agent configuration
- **Use environment variables** or secure storage
- **Implement token refresh** logic for OAuth tokens
- **Rotate tokens** regularly

### 2. Error Handling

```python
try:
    result = client.call_tool("postToLinkedIn", args)
except requests.HTTPError as e:
    if e.response.status_code == 401:
        # Token expired - refresh it
        pass
    elif e.response.status_code == 400:
        # Invalid parameters
        pass
```

### 3. Rate Limiting

- **Respect rate limits** from social media platforms
- **Implement backoff** strategies
- **Cache results** when appropriate
- **Batch operations** when possible

### 4. Testing

Always test in a safe environment first:

```bash
# Test with generateCaption (no side effects)
curl -X POST http://3.141.18.225:3001/mcp/v1/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "generateCaption",
      "arguments": {"prompt": "test"}
    }
  }'
```

---

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to server

```bash
# Check if server is reachable
curl http://3.141.18.225:3001/

# Check if MCP endpoint is working
curl http://3.141.18.225:3001/mcp/info
```

### Authentication Errors

**Problem**: 401 Unauthorized

- Verify your access token is valid
- Check if token has expired
- Ensure correct scope permissions

### Tool Execution Errors

**Problem**: Tool not found

```bash
# List available tools
curl http://3.141.18.225:3001/mcp/v1/tools/list
```

**Problem**: Invalid parameters

- Check the tool's `inputSchema`
- Ensure all required parameters are provided
- Validate parameter types

### Debug Mode

Enable verbose logging in your client:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## Support Resources

- **MCP Protocol Spec**: [MCP_PROTOCOL.md](./MCP_PROTOCOL.md)
- **API Reference**: [API_REFERENCE.md](./API_REFERENCE.md)
- **Authentication Guide**: LinkedIn OAuth flow documentation
- **Server Status**: Check `http://3.141.18.225:3001/mcp/info`

## Next Steps

1. Configure your AI agent with MCPSocial
2. Test the connection and list available tools
3. Implement error handling and retries
4. Start building your social media automation workflows!
