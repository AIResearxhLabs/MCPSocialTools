# MCPSocial Server - Enhanced Logging & Local Deployment Guide

## Overview

This document describes the enhanced logging capabilities and local Docker deployment for the MCPSocial MCP Server running on **localhost:3001**.

---

## 🎯 Enhanced Logging Features

### Structured JSON Logging

All logs are now output in structured JSON format for better observability and parsing:

```json
{
  "timestamp": "2025-11-18T11:18:35.520Z",
  "level": "INFO",
  "message": "Tool Execution Started: getLinkedInAuthUrl",
  "service": "mcpsocial",
  "context": {
    "toolName": "getLinkedInAuthUrl"
  },
  "data": {
    "type": "TOOL_EXECUTION",
    "toolName": "getLinkedInAuthUrl",
    "params": {},
    "timestamp": "2025-11-18T11:18:35.520Z"
  }
}
```

### Log Types

#### 1. Server Startup Logs
Captures server initialization with complete configuration:
- Server name and version
- Protocol version
- Available endpoints
- Environment and log level
- Port number

#### 2. API Request/Response Logs
Tracks all incoming MCP JSON-RPC requests:
- Request ID
- Method name
- Parameters (sanitized)
- Response duration
- Result type

#### 3. Tool Execution Logs
Detailed tracking of tool execution:
- **Tool Execution Started**: Tool name and input parameters
- **Tool Execution Completed**: Success status, result, and duration
- **Tool Execution Failed**: Error details and duration

#### 4. API Call Logs (External APIs)
Monitors calls to external APIs (LinkedIn, OpenAI, etc.):
- API name (LinkedIn, OpenAI, etc.)
- Endpoint path
- HTTP method
- Request payload (sanitized)
- Response status code
- Response data (sanitized)
- Duration in milliseconds

### Security Features

#### Automatic Data Sanitization
Sensitive data is automatically redacted from logs:
- **Access tokens** → `***REDACTED***`
- **API keys** → `***REDACTED***`
- **Passwords** → `***REDACTED***`
- **Client secrets** → `***REDACTED***`
- **Authorization headers** → `***REDACTED***`

#### Example:
```json
{
  "params": {
    "accessToken": "***REDACTED***",
    "content": "Hello, LinkedIn!"
  }
}
```

### Log Levels

Configure via the `LOG_LEVEL` environment variable:
- **DEBUG**: Most verbose, includes all internal operations
- **INFO**: Default level, includes important events (recommended)
- **WARN**: Warnings and potentially problematic situations
- **ERROR**: Error events that might allow the application to continue

---

## 🐳 Local Docker Deployment

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for local development)

### Quick Start

1. **Start the server:**
   ```bash
   cd services/mcpsocial
   docker-compose up -d --build
   ```

2. **Verify the server is running:**
   ```bash
   curl http://localhost:3001/mcp/info
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f mcpsocial
   ```

4. **Stop the server:**
   ```bash
   docker-compose down
   ```

### Configuration

Edit the `.env` file or `docker-compose.yml` to configure:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=INFO

# API Keys
OPENAI_API_KEY=your_key_here
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info and available endpoints |
| `/mcp/info` | GET | MCP server metadata |
| `/mcp/v1` | POST | JSON-RPC 2.0 protocol endpoint |
| `/mcp/v1/tools/list` | GET | List available tools (legacy) |
| `/mcp/v1/resources/list` | GET | List available resources (legacy) |
| `/mcp/tools` | GET | Legacy tool listing |
| `/mcp/execute` | POST | Legacy tool execution |
| `/api/auth/linkedin/callback` | GET | LinkedIn OAuth callback |

---

## 📊 Observability Examples

### Example 1: Successful Tool Execution

**Request:**
```bash
curl -X POST http://localhost:3001/mcp/v1 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"getLinkedInAuthUrl",
      "arguments":{}
    }
  }'
```

**Log Output:**
```json
// 1. Request received
{"timestamp":"2025-11-18T11:18:35.520Z","level":"INFO","message":"MCP JSON-RPC Request","service":"mcpsocial","context":{"method":"tools/call","endpoint":"/mcp/v1"},"data":{"requestId":1,"method":"tools/call","params":{"name":"getLinkedInAuthUrl","arguments":{}}}}

// 2. Tool execution started
{"timestamp":"2025-11-18T11:18:35.520Z","level":"INFO","message":"Tool Execution Started: getLinkedInAuthUrl","service":"mcpsocial","context":{"toolName":"getLinkedInAuthUrl"},"data":{"type":"TOOL_EXECUTION","toolName":"getLinkedInAuthUrl","params":{},"timestamp":"2025-11-18T11:18:35.520Z"}}

// 3. Tool execution completed
{"timestamp":"2025-11-18T11:18:35.524Z","level":"INFO","message":"Tool Execution Completed: getLinkedInAuthUrl","service":"mcpsocial","context":{"toolName":"getLinkedInAuthUrl","duration":4},"data":{"type":"TOOL_RESULT","toolName":"getLinkedInAuthUrl","success":true,"result":{...},"duration":4}}

// 4. Response sent
{"timestamp":"2025-11-18T11:18:35.525Z","level":"INFO","message":"MCP JSON-RPC Response","service":"mcpsocial","context":{"method":"tools/call","endpoint":"/mcp/v1","duration":5},"data":{"requestId":1,"resultType":"object"}}
```

### Example 2: LinkedIn API Call with Logging

When a tool makes an external API call (e.g., LinkedIn), you'll see:

```json
// API Call initiated
{"timestamp":"2025-11-18T11:20:00.000Z","level":"INFO","message":"API Call: LinkedIn GET /userinfo","service":"mcpsocial","data":{"type":"API_CALL","api":"LinkedIn","endpoint":"/userinfo","method":"GET","timestamp":"2025-11-18T11:20:00.000Z"}}

// API Response received
{"timestamp":"2025-11-18T11:20:00.150Z","level":"INFO","message":"API Response: LinkedIn /userinfo","service":"mcpsocial","data":{"type":"API_RESPONSE","api":"LinkedIn","endpoint":"/userinfo","statusCode":200,"response":{"sub":"user-id-here"},"duration":150,"timestamp":"2025-11-18T11:20:00.150Z"}}
```

### Example 3: Error Handling

Failed tool execution with detailed error logging:

```json
{"timestamp":"2025-11-18T11:25:00.000Z","level":"ERROR","message":"Tool Execution Failed: postToLinkedIn","service":"mcpsocial","context":{"toolName":"postToLinkedIn","duration":250},"data":{"type":"TOOL_RESULT","toolName":"postToLinkedIn","success":false,"error":"Could not create LinkedIn post.","duration":250,"timestamp":"2025-11-18T11:25:00.000Z"}}
```

---

## 🔍 Log Analysis

### Filter logs by level:
```bash
docker-compose logs mcpsocial | grep '"level":"ERROR"'
```

### View only tool execution logs:
```bash
docker-compose logs mcpsocial | grep 'TOOL_EXECUTION\|TOOL_RESULT'
```

### Monitor API calls:
```bash
docker-compose logs mcpsocial | grep 'API_CALL\|API_RESPONSE'
```

### Track specific tool:
```bash
docker-compose logs mcpsocial | grep 'postToLinkedIn'
```

---

## 🚀 Integration with External MCP Clients

The server can be connected as an external MCP server from Cline or other MCP clients:

### Connection URL:
```
http://localhost:3001/mcp/v1
```

### Available Tools (13 total):
- LinkedIn: Authentication, Posts, Comments, Likes, Connections
- Facebook: Post creation
- Instagram: Post creation
- OpenAI: Caption generation, Scheduling suggestions

---

## 📝 Maintenance

### View real-time logs:
```bash
docker-compose logs -f mcpsocial
```

### Restart the server:
```bash
docker-compose restart mcpsocial
```

### Rebuild after code changes:
```bash
docker-compose up -d --build
```

### Check server health:
```bash
curl http://localhost:3001/mcp/info
```

---

## 🔒 Production Considerations

For production deployment:
1. Set `LOG_LEVEL=WARN` or `LOG_LEVEL=ERROR`
2. Use a proper secrets management system
3. Enable HTTPS/TLS
4. Implement rate limiting
5. Set up log aggregation (e.g., ELK Stack, CloudWatch)
6. Enable monitoring and alerting
7. Configure proper CORS policies

---

## 📄 Log Schema Reference

### Complete Log Entry Structure:
```typescript
interface LogEntry {
  timestamp: string;      // ISO 8601 format
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;        // Human-readable message
  service: 'mcpsocial';   // Service identifier
  context?: {             // Contextual information
    method?: string;
    endpoint?: string;
    toolName?: string;
    resourceName?: string;
    duration?: number;    // Milliseconds
  };
  data?: {                // Additional structured data
    type?: 'API_CALL' | 'API_RESPONSE' | 'TOOL_EXECUTION' | 'TOOL_RESULT';
    [key: string]: any;   // Type-specific fields
  };
}
```

---

## ✅ Summary

The MCPSocial server now provides:
- ✅ Comprehensive structured logging in JSON format
- ✅ Automatic sensitive data sanitization
- ✅ Request/response tracking with duration metrics
- ✅ Tool execution monitoring
- ✅ External API call tracking (LinkedIn, OpenAI, etc.)
- ✅ Easy Docker deployment on localhost:3001
- ✅ Production-ready observability

All logs are designed to be easily parsed by log aggregation tools and provide complete visibility into the MCP server's operations.
