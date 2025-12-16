# Twitter OAuth Migration Guide: 1.0a to 2.0

This guide helps you migrate your Twitter application from OAuth 1.0a to OAuth 2.0 with PKCE.

## Why Migrate to OAuth 2.0?

| Feature | OAuth 1.0a | OAuth 2.0 |
|---------|-----------|-----------|
| **API Version** | v1.1 only | v1.1 + v2 |
| **Token Format** | access_token + access_secret | Bearer access_token |
| **Token Expiry** | Never (until revoked) | 2 hours (with refresh) |
| **Security** | Signature-based | PKCE + Bearer token |
| **Refresh Capability** | ❌ No | ✅ Yes (with offline.access) |
| **Modern Features** | Limited | Full API v2 access |

## Prerequisites

Before starting, ensure you have:
- Access to Twitter Developer Portal
- Your Twitter App credentials
- Admin access to modify app settings

## Step 1: Configure Twitter App for OAuth 2.0

### 1.1 Access Twitter Developer Portal

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Select your app
3. Navigate to **Settings** → **User authentication settings**

### 1.2 Enable OAuth 2.0

Click **"Set up"** or **"Edit"** under User authentication settings:

**App permissions:**
- ✅ Read and write (for posting tweets)
- ✅ Read (minimum for profile access)

**Type of App:**
- ✅ Web App, Automated App or Bot
- ✅ Native App (if mobile)

**App info:**
```
Callback URL / Redirect URL: 
http://localhost:3001/auth/twitter/callback
(or your production callback URL)

Website URL: 
https://yourapp.com
```

**Important:** OAuth 2.0 requires HTTPS in production. Use `http://localhost` only for development.

### 1.3 Save OAuth 2.0 Credentials

After saving, Twitter will show:
- ✅ **Client ID** (like: `VGhpc19pc19hbl9leGFtcGxl`)
- ✅ **Client Secret** (like: `VGhpc19pc19hbl9leGFtcGxlX2NsaWVudF9zZWNyZXQ`)

**⚠️ Important:** Save these immediately. The Client Secret is only shown once.

## Step 2: Update Application Configuration

### 2.1 Update config.json

Replace your OAuth 1.0a credentials with OAuth 2.0:

**Before (OAuth 1.0a):**
```json
{
  "twitter": {
    "consumerKey": "YOUR_CONSUMER_KEY",
    "consumerSecret": "YOUR_CONSUMER_SECRET",
    "accessToken": "YOUR_ACCESS_TOKEN",
    "accessSecret": "YOUR_ACCESS_SECRET"
  }
}
```

**After (OAuth 2.0):**
```json
{
  "twitter": {
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET"
  }
}
```

### 2.2 Update Environment Variables

If using `.env` file:

```bash
# Remove OAuth 1.0a variables
# TWITTER_CONSUMER_KEY=...
# TWITTER_CONSUMER_SECRET=...
# TWITTER_ACCESS_TOKEN=...
# TWITTER_ACCESS_SECRET=...

# Add OAuth 2.0 variables
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
```

## Step 3: User Re-Authentication Required

### 3.1 Why Re-authentication is Needed

OAuth 1.0a and OAuth 2.0 use **completely different token formats**:
- OAuth 1.0a tokens cannot be converted to OAuth 2.0
- All users must go through the OAuth 2.0 flow to get new tokens

### 3.2 OAuth 2.0 Authentication Flow

**Step 1: Get Authorization URL**

```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "getTwitterAuthUrl",
    "params": {
      "callbackUrl": "http://localhost:3001/auth/twitter/callback"
    }
  }'
```

**Response:**
```json
{
  "authorizationUrl": "https://twitter.com/i/oauth2/authorize?...",
  "state": "random_state_string",
  "codeVerifier": "SAVE_THIS_CODE_VERIFIER",
  "callbackUrl": "http://localhost:3001/auth/twitter/callback"
}
```

**⚠️ CRITICAL:** Save the `codeVerifier` - you'll need it in Step 3!

**Step 2: User Authorizes App**

1. Direct user to the `authorizationUrl`
2. User logs in to Twitter
3. User authorizes your app
4. Twitter redirects to callback URL with `code` parameter

Example callback:
```
http://localhost:3001/auth/twitter/callback?
  code=VGhpc19pc19hbl9leGFtcGxl&
  state=random_state_string
```

**Step 3: Exchange Code for Tokens**

```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "exchangeTwitterAuthCode",
    "params": {
      "code": "AUTHORIZATION_CODE_FROM_CALLBACK",
      "codeVerifier": "CODE_VERIFIER_FROM_STEP_1",
      "callbackUrl": "http://localhost:3001/auth/twitter/callback"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "accessToken": "ZG9jdG9yX3dob19hY2Nlc3NfdG9rZW4",
  "tokenType": "bearer",
  "expiresIn": 7200,
  "refreshToken": "cmVmcmVzaF90b2tlbl9leGFtcGxl",
  "scope": "tweet.read tweet.write users.read offline.access"
}
```

**⚠️ CRITICAL:** Save both `accessToken` AND `refreshToken`!

## Step 4: Token Storage

### 4.1 Database Schema

OAuth 2.0 requires storing additional fields:

```sql
CREATE TABLE user_twitter_tokens (
    user_id VARCHAR(255) PRIMARY KEY,
    access_token TEXT NOT NULL,           -- OAuth 2.0 Bearer token
    refresh_token TEXT NOT NULL,          -- For token refresh
    token_expires_at TIMESTAMP NOT NULL,  -- Calculate: now + expiresIn
    scope TEXT NOT NULL,                  -- Granted permissions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for token expiry checks
CREATE INDEX idx_token_expiry ON user_twitter_tokens(token_expires_at);
```

### 4.2 Token Lifecycle Management

```javascript
class TwitterTokenManager {
  constructor(userId, accessToken, refreshToken, expiresIn) {
    this.userId = userId;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = new Date(Date.now() + expiresIn * 1000);
  }

  isExpired() {
    // Check if token expires in less than 5 minutes
    return Date.now() > this.expiresAt.getTime() - 300000;
  }

  async refreshIfNeeded() {
    if (this.isExpired()) {
      await this.refresh();
    }
    return this.accessToken;
  }

  async refresh() {
    const response = await fetch('http://localhost:3001/mcp/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolName: 'refreshTwitterToken',
        params: { refreshToken: this.refreshToken }
      })
    });
    
    const data = await response.json();
    
    // Update stored tokens
    this.accessToken = data.result.accessToken;
    this.refreshToken = data.result.refreshToken; // Twitter may issue new one
    this.expiresAt = new Date(Date.now() + data.result.expiresIn * 1000);
    
    // Save to database
    await this.saveToDatabase();
  }

  async saveToDatabase() {
    // Update database with new tokens
    await db.query(
      'UPDATE user_twitter_tokens SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = NOW() WHERE user_id = ?',
      [this.accessToken, this.refreshToken, this.expiresAt, this.userId]
    );
  }
}
```

## Step 5: Update Your Application Code

### 5.1 Using OAuth 2.0 Tokens

**Before (OAuth 1.0a):**
```javascript
// OAuth 1.0a required complex signature generation
const oauth = new OAuth(
  'https://api.twitter.com/oauth/request_token',
  'https://api.twitter.com/oauth/access_token',
  consumerKey,
  consumerSecret,
  '1.0A',
  null,
  'HMAC-SHA1'
);
```

**After (OAuth 2.0):**
```javascript
// OAuth 2.0 uses simple Bearer token
const response = await fetch('http://localhost:3001/mcp/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    toolName: 'postToTwitter',
    params: {
      accessToken: bearerToken,  // Just the access token!
      content: 'Hello Twitter!'
    }
  })
});
```

### 5.2 Handle Token Expiration

```javascript
async function postTweet(userId, content) {
  // Get token manager for user
  const tokenManager = await TwitterTokenManager.loadFromDatabase(userId);
  
  // Automatically refresh if needed
  const validToken = await tokenManager.refreshIfNeeded();
  
  // Post tweet with valid token
  const response = await fetch('http://localhost:3001/mcp/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toolName: 'postToTwitter',
      params: {
        accessToken: validToken,
        content: content
      }
    })
  });
  
  // Handle 401 errors (token revoked/expired despite refresh)
  if (response.status === 401) {
    // Redirect user to re-authenticate
    return { error: 'REAUTHENTICATION_REQUIRED' };
  }
  
  return await response.json();
}
```

## Step 6: Testing Migration

### 6.1 Test Checklist

- [ ] Twitter app configured for OAuth 2.0
- [ ] Client ID and Secret saved in config
- [ ] Can generate authorization URL
- [ ] Can complete OAuth flow and get tokens
- [ ] Access token works for posting tweets
- [ ] Token refresh works when token expires
- [ ] Error handling for revoked tokens

### 6.2 Test Script

```bash
#!/bin/bash

echo "=== Twitter OAuth 2.0 Migration Test ==="

# Step 1: Get auth URL
echo "1. Getting authorization URL..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "getTwitterAuthUrl",
    "params": {
      "callbackUrl": "http://localhost:3001/auth/twitter/callback"
    }
  }')

echo "$AUTH_RESPONSE" | jq .
AUTH_URL=$(echo "$AUTH_RESPONSE" | jq -r '.result.authorizationUrl')
CODE_VERIFIER=$(echo "$AUTH_RESPONSE" | jq -r '.result.codeVerifier')

echo ""
echo "2. Visit this URL to authorize:"
echo "$AUTH_URL"
echo ""
echo "3. After authorization, you'll get a code. Save it along with:"
echo "   Code Verifier: $CODE_VERIFIER"
echo ""
echo "4. Then exchange the code for tokens using exchangeTwitterAuthCode"
```

## Step 7: Rollback Plan

If you need to rollback to OAuth 1.0a:

1. **Restore OAuth 1.0a credentials** in Twitter Developer Portal
2. **Revert config.json** to use consumerKey/consumerSecret
3. **Restore OAuth 1.0a client code** (we can provide this if needed)
4. **Users can continue** using their old OAuth 1.0a tokens

## Troubleshooting

### Error: "Invalid client credentials"
- ✅ Verify Client ID and Secret are correct
- ✅ Check they're for OAuth 2.0, not OAuth 1.0a
- ✅ Ensure no extra spaces in credentials

### Error: "Invalid code verifier"
- ✅ Ensure you're using the SAME codeVerifier from Step 1
- ✅ Check callback URL matches exactly
- ✅ Code can only be used once

### Error: "Token expired" immediately
- ✅ Check your system clock is correct
- ✅ Verify token storage is working
- ✅ Ensure you're saving the refresh token

### Users still seeing 401 errors
- ✅ Confirm all users have re-authenticated with OAuth 2.0
- ✅ Check database has OAuth 2.0 tokens (not OAuth 1.0a)
- ✅ Verify token refresh is implemented correctly

## Support

- [Twitter OAuth 2.0 Documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [API v2 Getting Started](https://developer.twitter.com/en/docs/twitter-api/getting-started/about-twitter-api)
- See also: `TWITTER_TOKEN_REFRESH_GUIDE.md`

---

**Migration Checklist:**
- [ ] Twitter app configured for OAuth 2.0
- [ ] OAuth 2.0 credentials in configuration
- [ ] User re-authentication flow implemented
- [ ] Token storage updated for OAuth 2.0
- [ ] Token refresh mechanism working
- [ ] Error handling for expired tokens
- [ ] All users migrated and tested
- [ ] Documentation updated

**Last Updated:** December 15, 2025  
**OAuth Version:** 2.0 with PKCE  
**API Version:** Twitter API v2
