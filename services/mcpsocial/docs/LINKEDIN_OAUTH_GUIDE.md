# LinkedIn OAuth Integration Guide

## Overview

This guide explains how to use the LinkedIn OAuth tools in the MCPSocial server to authenticate users and obtain access tokens for LinkedIn API operations.

---

## Important: Callback URL Configuration

The LinkedIn OAuth tools now accept a **custom callback URL** as a parameter, allowing you to specify where LinkedIn should redirect users after authorization. This is essential for client applications that need to handle the OAuth flow.

### Requirements

1. **The callback URL must be registered** in your LinkedIn App settings in the [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. **The URL must match exactly** - including protocol (`http://` or `https://`), domain, port, and path
3. **The same callback URL** must be used in both the authorization request and token exchange

---

## OAuth Flow

### Step 1: Generate Authorization URL

Use the `getLinkedInAuthUrl` tool to generate the LinkedIn authorization URL.

**Tool Parameters:**
- `callbackUrl` (required): The URL where LinkedIn will redirect after authorization
- `state` (optional): CSRF protection token (auto-generated if not provided)

**Example Request:**
```bash
curl -X POST http://localhost:3001/mcp/v1 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"getLinkedInAuthUrl",
      "arguments":{
        "callbackUrl":"http://localhost:8000/api/integrations/linkedin/callback"
      }
    }
  }'
```

**Response:**
```json
{
  "authorizationUrl": "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fintegrations%2Flinkedin%2Fcallback&state=RANDOM_STATE&scope=openid%20profile%20w_member_social",
  "state": "RANDOM_STATE_TOKEN",
  "callbackUrl": "http://localhost:8000/api/integrations/linkedin/callback",
  "instructions": [
    "1. Direct the user to open the authorizationUrl in their browser",
    "2. User will authenticate and authorize the application",
    "3. LinkedIn will redirect to the callbackUrl with a \"code\" parameter",
    "4. Use the \"code\" with the exchangeLinkedInAuthCode tool to get an access token"
  ]
}
```

### Step 2: User Authorization

1. Direct the user to open the `authorizationUrl` in their browser
2. User logs into LinkedIn and grants permissions
3. LinkedIn redirects to your callback URL with query parameters:
   ```
   http://localhost:8000/api/integrations/linkedin/callback?code=AUTHORIZATION_CODE&state=RANDOM_STATE
   ```

### Step 3: Exchange Authorization Code for Access Token

**Important:** This step **must be performed server-side** to keep your client secret secure.

Use the `exchangeLinkedInAuthCode` tool to get the token exchange information.

**Tool Parameters:**
- `code` (required): The authorization code from the callback
- `callbackUrl` (required): The same callback URL used in Step 1

**Example Request:**
```bash
curl -X POST http://localhost:3001/mcp/v1 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"exchangeLinkedInAuthCode",
      "arguments":{
        "code":"AUTHORIZATION_CODE_FROM_CALLBACK",
        "callbackUrl":"http://localhost:8000/api/integrations/linkedin/callback"
      }
    }
  }'
```

**Response:**
```json
{
  "message": "Token exchange must be performed server-side for security",
  "endpoint": "POST https://www.linkedin.com/oauth/v2/accessToken",
  "requiredParameters": {
    "grant_type": "authorization_code",
    "code": "AUTHORIZATION_CODE",
    "redirect_uri": "http://localhost:8000/api/integrations/linkedin/callback",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "(server-side only)"
  },
  "instructions": [
    "This token exchange should be handled by your backend server",
    "The client_secret must never be exposed to the client",
    "The redirect_uri must match exactly what was used in the authorization request",
    "After exchange, you will receive an access_token",
    "Use the access_token with other LinkedIn tools"
  ]
}
```

### Step 4: Server-Side Token Exchange

Your server at `http://localhost:8000/api/integrations/linkedin/callback` should:

1. Receive the authorization code from LinkedIn's redirect
2. Verify the `state` parameter matches what was generated
3. Make a POST request to LinkedIn's token endpoint:

```bash
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=http://localhost:8000/api/integrations/linkedin/callback" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

**LinkedIn Response:**
```json
{
  "access_token": "ACCESS_TOKEN_HERE",
  "expires_in": 5184000,
  "refresh_token": "REFRESH_TOKEN_HERE",
  "refresh_token_expires_in": 31536000,
  "scope": "openid profile w_member_social"
}
```

4. Store the `access_token` securely
5. Return or redirect with the token to your client application

---

## Using the Access Token

Once you have the access token, you can use it with other LinkedIn tools:

### Post to LinkedIn
```bash
curl -X POST http://localhost:3001/mcp/v1 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"postToLinkedIn",
      "arguments":{
        "accessToken":"YOUR_ACCESS_TOKEN",
        "content":"Hello LinkedIn! This is posted via MCP."
      }
    }
  }'
```

### Available LinkedIn Tools

| Tool Name | Description |
|-----------|-------------|
| `getLinkedInAuthUrl` | Generate authorization URL |
| `exchangeLinkedInAuthCode` | Get token exchange instructions |
| `postToLinkedIn` | Create a new LinkedIn post |
| `listLinkedInPosts` | List user's recent posts |
| `getLinkedInPostLikes` | Get likes for a post |
| `commentOnLinkedInPost` | Comment on a post |
| `getLinkedInPostComments` | Get comments for a post |
| `shareLinkedInArticle` | Share an article with commentary |
| `listLinkedInConnections` | List user's connections |

---

## Configuration Examples

### Example 1: Development (localhost)
```
Callback URL: http://localhost:8000/api/integrations/linkedin/callback
```

### Example 2: Production
```
Callback URL: https://yourdomain.com/api/integrations/linkedin/callback
```

### Example 3: Multiple Environments
You can use different callback URLs for different environments:
- Development: `http://localhost:8000/api/integrations/linkedin/callback`
- Staging: `https://staging.yourdomain.com/api/integrations/linkedin/callback`
- Production: `https://yourdomain.com/api/integrations/linkedin/callback`

**Important:** Each callback URL must be registered in your LinkedIn App settings.

---

## Security Best Practices

1. ✅ **Never expose client_secret** to the client-side code
2. ✅ **Always validate the state parameter** to prevent CSRF attacks
3. ✅ **Use HTTPS in production** (not http://)
4. ✅ **Store access tokens securely** (encrypted database, secure session storage)
5. ✅ **Implement token refresh** logic for long-lived access
6. ✅ **Match callback URLs exactly** - including trailing slashes if present

---

## Common Issues

### Issue: "redirect_uri_mismatch" Error

**Cause:** The callback URL doesn't match what's registered in LinkedIn App settings.

**Solution:**
1. Go to your LinkedIn App settings
2. Navigate to "Auth" tab
3. Add the exact callback URL to "Authorized redirect URLs"
4. Ensure protocol, domain, port, and path match exactly

### Issue: Invalid Authorization Code

**Cause:** Authorization code was already used or expired.

**Solution:**
- Authorization codes are single-use only
- They expire after 30 seconds
- Generate a new authorization URL and start the flow again

### Issue: Access Token Expired

**Cause:** LinkedIn access tokens expire after 60 days by default.

**Solution:**
- Implement token refresh using the `refresh_token`
- Prompt user to re-authenticate if refresh fails

---

## Architecture Diagram

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Client    │         │ MCP Server   │         │   LinkedIn   │
│ (Browser)   │         │ (Port 3001)  │         │   OAuth API  │
└──────┬──────┘         └──────┬───────┘         └──────┬───────┘
       │                       │                        │
       │ 1. getLinkedInAuthUrl │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │ 2. authorizationUrl   │                        │
       │<──────────────────────┤                        │
       │                       │                        │
       │ 3. Open URL in browser│                        │
       ├───────────────────────┼───────────────────────>│
       │                       │                        │
       │ 4. User authorizes    │                        │
       │<───────────────────────┼────────────────────────┤
       │                       │                        │
       │ 5. Redirect with code │                        │
       │    (to localhost:8000)│                        │
       │<──────────────────────┼────────────────────────┤
       │                       │                        │
       
┌──────┴──────┐               │                        │
│Your Backend │               │                        │
│(Port 8000)  │               │                        │
└──────┬──────┘               │                        │
       │                       │                        │
       │ 6. Exchange code for token                     │
       ├────────────────────────────────────────────────>│
       │                       │                        │
       │ 7. Access token       │                        │
       │<────────────────────────────────────────────────┤
       │                       │                        │
       │ 8. Return token to client                      │
       ├──────────────────────>│                        │
       │                       │                        │
```

---

## Summary

The MCPSocial LinkedIn OAuth tools now provide **flexible callback URL configuration**, allowing you to integrate with any client application architecture. The key changes:

- ✅ `callbackUrl` is now a **required parameter** for `getLinkedInAuthUrl`
- ✅ `callbackUrl` is now a **required parameter** for `exchangeLinkedInAuthCode`
- ✅ No more hardcoded callback URLs
- ✅ Works with any registered LinkedIn App redirect URI
- ✅ Supports multiple environments (dev, staging, prod)

For additional help, refer to the [LinkedIn OAuth Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication).
