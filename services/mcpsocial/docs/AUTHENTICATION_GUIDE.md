# Authentication Guide - MCPSocial Server

## Overview

This guide covers all authentication mechanisms used by the MCPSocial server, with detailed instructions for each social media platform.

## Table of Contents

- [LinkedIn OAuth 2.0](#linkedin-oauth-20)
- [Facebook Authentication](#facebook-authentication)
- [Instagram Authentication](#instagram-authentication)
- [Security Best Practices](#security-best-practices)
- [Token Management](#token-management)

---

## LinkedIn OAuth 2.0

LinkedIn uses **OAuth 2.0 Authorization Code Flow** for secure authentication.

### Configuration

**Scope**: `openid profile w_member_social`

This scope grants:
- ✅ Read user profile information
- ✅ Create posts on user's behalf
- ✅ Access connection data

### OAuth Flow

```
User → Your App → LinkedIn → Your App → MCPSocial
```

#### Step 1: Initiate OAuth Flow

**Endpoint**: `GET http://3.141.18.225:3001/api/auth/linkedin`

This redirects the user to LinkedIn's authorization page:

```
https://www.linkedin.com/oauth/v2/authorization?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_CALLBACK_URL&
  state=RANDOM_STATE&
  scope=openid+profile+w_member_social
```

#### Step 2: User Authorizes

The user logs in and authorizes your application on LinkedIn's page.

#### Step 3: Callback with Authorization Code

LinkedIn redirects to your callback URL:

```
http://3.141.18.225:3001/api/auth/linkedin/callback?
  code=AUTHORIZATION_CODE&
  state=RANDOM_STATE
```

#### Step 4: Exchange Code for Token

The server automatically exchanges the code for an access token:

**Response**:
```json
{
  "message": "Successfully authenticated with LinkedIn!",
  "accessToken": "AQXdSP_W...",
  "expiresIn": 5184000
}
```

### Using the Access Token

Include the token in the Authorization header for all LinkedIn API calls:

```bash
curl -X POST http://3.141.18.225:3001/api/linkedin/posts \
  -H "Authorization: Bearer AQXdSP_W..." \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello LinkedIn!"}'
```

### Token Expiration

LinkedIn access tokens expire after **60 days** (5,184,000 seconds).

**When token expires**:
1. User must re-authenticate through OAuth flow
2. Previous token becomes invalid
3. New token is issued

### Security Features

✅ **State Parameter**: CSRF protection (validates state matches)  
✅ **HTTPS Only**: OAuth flow requires HTTPS in production  
✅ **Secure Storage**: Tokens should be stored securely, never in plain text  
✅ **Scope Limitation**: Only requests minimal required permissions  

---

## Facebook Authentication

Facebook uses **long-lived access tokens** configured at the server level.

### Configuration

**Environment Variable**: `FACEBOOK_ACCESS_TOKEN`

### Obtaining a Facebook Token

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create an app and select "Business" type
3. Configure Facebook Login product
4. Generate a User Access Token
5. Convert to Long-Lived Token (60 days)
6. Configure on server

### Token Scope

Required permissions:
- `pages_manage_posts`
- `pages_read_engagement`
- `public_profile`

### Using Facebook Endpoints

No additional authentication required - the server uses the configured token:

```bash
curl -X POST http://3.141.18.225:3001/api/facebook/posts \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello Facebook!"}'
```

---

## Instagram Authentication

Instagram uses the **Instagram Graph API** with access tokens configured at server level.

### Configuration

**Environment Variable**: `INSTAGRAM_ACCESS_TOKEN`

### Obtaining an Instagram Token

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create an app with Instagram Graph API
3. Connect your Instagram Business Account
4. Generate an Access Token
5. Configure on server

### Token Scope

Required permissions:
- `instagram_basic`
- `instagram_content_publish`
- `pages_read_engagement`

### Using Instagram Endpoints

No additional authentication required:

```bash
curl -X POST http://3.141.18.225:3001/api/instagram/posts \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "caption": "Hello Instagram!"
  }'
```

---

## Security Best Practices

### 1. Token Storage

**❌ Never do this**:
```javascript
const token = "AQXdSP_W..."; // Hardcoded token
```

**✅ Always do this**:
```javascript
const token = process.env.LINKEDIN_ACCESS_TOKEN;
```

### 2. Token Transmission

- Always use **HTTPS** in production
- Never log tokens
- Never include tokens in URLs
- Use Authorization headers

### 3. Token Validation

```typescript
// Validate token before use
if (!accessToken || accessToken.length < 10) {
  throw new Error('Invalid access token');
}
```

### 4. Error Handling

```typescript
try {
  await linkedinClient.createPost(content);
} catch (error) {
  if (error.response?.status === 401) {
    // Token expired - prompt for re-authentication
    console.log('Token expired. Please re-authenticate.');
  }
}
```

---

## Token Management

### Token Lifecycle

| Platform | Token Type | Expiration | Refresh Mechanism |
|----------|-----------|------------|-------------------|
| LinkedIn | OAuth 2.0 | 60 days | User must re-authenticate |
| Facebook | Long-Lived | 60 days | Manual renewal or OAuth refresh |
| Instagram | Long-Lived | 60 days | Manual renewal |

### Token Refresh Strategy

#### For LinkedIn (OAuth)

```javascript
class TokenManager {
  async refreshLinkedInToken(userId) {
    // Prompt user to re-authenticate
    const newToken = await initiateOAuthFlow(userId);
    return newToken;
  }
}
```

#### For Facebook/Instagram

```javascript
class TokenManager {
  async refreshFacebookToken(shortToken) {
    // Exchange short-lived for long-lived token
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/oauth/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: FB_APP_ID,
          client_secret: FB_APP_SECRET,
          fb_exchange_token: shortToken
        }
      }
    );
    return response.data.access_token;
  }
}
```

### Monitoring Token Health

```bash
# Check LinkedIn token validity
curl http://3.141.18.225:3001/api/linkedin/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# If you get 401, token is invalid/expired
```

---

## MCP Tool Authentication

When using MCP tools that require authentication:

### Example: Post to LinkedIn via MCP

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "postToLinkedIn",
    "arguments": {
      "accessToken": "YOUR_LINKEDIN_TOKEN",
      "content": "Hello from MCP!"
    }
  }
}
```

**Important**: The `accessToken` parameter is required for LinkedIn tools because LinkedIn uses user-specific OAuth tokens.

### Example: Post to Facebook via MCP

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "postToFacebook",
    "arguments": {
      "content": "Hello from MCP!"
    }
  }
}
```

**Note**: No token required - server uses configured token.

---

## Troubleshooting Authentication Issues

### Problem: 401 Unauthorized

**LinkedIn**:
- Token expired (60 days)
- Token revoked by user
- Insufficient scope
- Token not included in header

**Solution**: Re-authenticate user through OAuth flow

### Problem: 403 Forbidden

- User doesn't have permission
- App doesn't have required permissions
- Rate limit exceeded

**Solution**: Check app permissions and rate limits

### Problem: Invalid Token Format

```json
{
  "error": "Authorization token is required",
  "code": "AUTH_REQUIRED"
}
```

**Solution**: Ensure token is in format: `Authorization: Bearer TOKEN`

---

## Production Deployment Considerations

### Environment Variables

Securely configure tokens using AWS Secrets Manager or similar:

```bash
# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name mcpsocial/facebook-token \
  --secret-string "YOUR_TOKEN"

# Reference in ECS task definition
{
  "secrets": [
    {
      "name": "FACEBOOK_ACCESS_TOKEN",
      "valueFrom": "arn:aws:secretsmanager:region:account:secret:mcpsocial/facebook-token"
    }
  ]
}
```

### Token Rotation

Implement automated token rotation:

1. Monitor token expiration dates
2. Alert 7 days before expiration
3. Provide UI for users to re-authenticate
4. Update server configuration with new tokens

---

## Testing Authentication

### Test LinkedIn OAuth

```bash
# Step 1: Get authorization URL
curl http://3.141.18.225:3001/api/auth/linkedin

# Step 2: Follow redirect and authorize

# Step 3: Test the received token
curl http://3.141.18.225:3001/api/linkedin/profile \
  -H "Authorization: Bearer YOUR_NEW_TOKEN"
```

### Test MCP Tool Authentication

```bash
# Test postToLinkedIn tool
curl -X POST http://3.141.18.225:3001/mcp/v1/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "postToLinkedIn",
      "arguments": {
        "accessToken": "YOUR_TOKEN",
        "content": "Test post"
      }
    }
  }'
```

---

## Support

For authentication issues:
- Check token validity
- Verify scope permissions
- Review [API_REFERENCE.md](./API_REFERENCE.md) for error codes
- Check [MCP_INTEGRATION_GUIDE.md](./MCP_INTEGRATION_GUIDE.md) for troubleshooting
