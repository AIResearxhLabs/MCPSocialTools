# Twitter Token Refresh Guide

Quick reference for handling Twitter OAuth token expiration and refresh.

## Problem: 401 Unauthorized Error

If you see this error when posting to Twitter:
```json
{
  "error": "Request failed with status code 401",
  "message": "Tweet creation unauthorized. Your access token is invalid or expired."
}
```

**Cause:** Your Twitter access token has expired (typically after 2 hours).

## Solution: Token Refresh Flow

### Prerequisites

1. **Ensure you have `offline.access` scope** during initial authorization
2. **Save the refresh token** from the initial authentication
3. **Have Twitter Client ID and Secret** configured

### Step-by-Step Token Refresh

#### 1. Initial Authentication (One Time)

When first authenticating, ensure the scope includes `offline.access`:

```bash
# Get authorization URL with offline.access scope
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "getTwitterAuthUrl",
    "params": {
      "callbackUrl": "http://localhost:3001/auth/twitter/callback"
    }
  }'
```

The default scope already includes: `tweet.read tweet.write users.read offline.access`

#### 2. Save Tokens from Initial Auth

After exchanging the auth code, save **both tokens**:

```json
{
  "accessToken": "abc123...",      // Expires in ~2 hours
  "refreshToken": "xyz789...",     // Long-lived, use to get new access tokens
  "expiresIn": 7200               // 2 hours
}
```

#### 3. Refresh When Token Expires

Use the `refreshTwitterToken` tool:

```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "refreshTwitterToken",
    "params": {
      "refreshToken": "YOUR_REFRESH_TOKEN"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully refreshed Twitter access token!",
  "accessToken": "new_access_token_here",
  "refreshToken": "new_refresh_token_here",
  "expiresIn": 7200,
  "note": "Store the new accessToken and refreshToken securely."
}
```

#### 4. Use New Access Token

Update your application to use the new `accessToken` for all subsequent Twitter API calls.

**Important:** Twitter may issue a new `refreshToken`. Always update both tokens after refresh.

## Automatic Token Refresh

### Recommended Implementation

```javascript
// Example: Auto-refresh before token expires
class TwitterTokenManager {
  constructor(accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = Date.now() + (expiresIn * 1000);
  }

  async getValidToken() {
    // Refresh if token expires in less than 5 minutes
    if (Date.now() > this.expiresAt - 300000) {
      await this.refreshToken();
    }
    return this.accessToken;
  }

  async refreshToken() {
    const response = await fetch('http://localhost:3001/mcp/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolName: 'refreshTwitterToken',
        params: { refreshToken: this.refreshToken }
      })
    });
    
    const data = await response.json();
    this.accessToken = data.result.accessToken;
    this.refreshToken = data.result.refreshToken;
    this.expiresAt = Date.now() + (data.result.expiresIn * 1000);
  }
}
```

## Error Handling

### Common Refresh Token Errors

#### 1. Invalid Refresh Token (400)
```json
{
  "error": "Invalid refresh token. You may need to re-authenticate."
}
```
**Solution:** The refresh token is invalid or expired. User must re-authenticate from scratch.

#### 2. Revoked Token (401)
```json
{
  "error": "Invalid client credentials or refresh token has been revoked."
}
```
**Solution:** User revoked app access in Twitter settings. User must re-authorize your app.

#### 3. Client Credential Error (401)
```json
{
  "error": "Invalid client credentials."
}
```
**Solution:** Check your Twitter Client ID and Secret in configuration.

## Token Storage Best Practices

### Security Considerations

1. **Never expose tokens in logs or error messages**
2. **Store tokens encrypted** in database or secure storage
3. **Use environment variables** for client credentials
4. **Implement token rotation** - always use latest tokens
5. **Handle token expiration gracefully** with automatic refresh

### Database Schema Example

```sql
CREATE TABLE user_tokens (
    user_id VARCHAR(255) PRIMARY KEY,
    twitter_access_token TEXT ENCRYPTED,
    twitter_refresh_token TEXT ENCRYPTED,
    twitter_token_expires_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing Token Refresh

### Test Scenario 1: Expired Token

```bash
# 1. Get auth URL and complete OAuth flow
# 2. Wait for token to expire (or use an old token)
# 3. Try to post (should fail with 401)
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "postToTwitter",
    "params": {
      "accessToken": "EXPIRED_TOKEN",
      "content": "Test tweet"
    }
  }'

# Expected error: "Tweet creation unauthorized. Your access token is invalid or expired."

# 4. Refresh the token
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "refreshTwitterToken",
    "params": {
      "refreshToken": "YOUR_REFRESH_TOKEN"
    }
  }'

# 5. Retry posting with new token
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "postToTwitter",
    "params": {
      "accessToken": "NEW_ACCESS_TOKEN",
      "content": "Test tweet"
    }
  }'

# Should succeed!
```

## Monitoring & Alerts

### Recommended Metrics

1. **Token Refresh Success Rate** - Should be >99%
2. **Token Expiration Warnings** - Alert when tokens expire in <5 min
3. **Failed Refresh Attempts** - Monitor for 400/401 errors
4. **Re-authentication Required** - Track how often users must re-auth

### Log Analysis

Look for these patterns in logs:

**Successful refresh:**
```json
{
  "level": "INFO",
  "message": "Twitter Token Refresh Successful",
  "duration": 234
}
```

**Failed refresh:**
```json
{
  "level": "ERROR",
  "message": "Twitter Token Refresh Failed",
  "error": "Invalid refresh token"
}
```

**Token expiration detected:**
```json
{
  "level": "ERROR",
  "message": "Twitter API Error Details",
  "statusCode": 401,
  "errorMessage": "Unauthorized"
}
```

## FAQ

### Q: How often should I refresh the token?

**A:** Proactively refresh 5-10 minutes before expiration (Twitter tokens last 2 hours). Don't wait for 401 errors.

### Q: Do I need to re-authenticate if refresh token expires?

**A:** Yes, if the refresh token is revoked or expires, the user must complete the OAuth flow again.

### Q: Can I use the same refresh token multiple times?

**A:** Twitter may issue a new refresh token with each refresh. Always store and use the latest refresh token.

### Q: What if I didn't include offline.access scope initially?

**A:** You must re-authenticate with the correct scope. Old tokens without offline.access cannot be refreshed.

### Q: How long do refresh tokens last?

**A:** Twitter refresh tokens are long-lived but can be revoked by the user or expire due to inactivity. Assume they may need renewal.

## Quick Reference

| Action | Tool | Required Params |
|--------|------|----------------|
| Get auth URL | `getTwitterAuthUrl` | `callbackUrl` |
| Exchange code | `exchangeTwitterAuthCode` | `code`, `codeVerifier`, `callbackUrl` |
| Refresh token | `refreshTwitterToken` | `refreshToken` |
| Post tweet | `postToTwitter` | `accessToken`, `content` |

## Support

For additional help:
- [Twitter OAuth 2.0 Documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [Twitter API Error Codes](https://developer.twitter.com/en/support/twitter-api/error-troubleshooting)
- See also: `TWITTER_OAUTH_TEST_GUIDE.md` for detailed testing instructions

---

**Last Updated:** December 15, 2025  
**API Version:** Twitter API v2  
**OAuth Version:** OAuth 2.0 with PKCE
