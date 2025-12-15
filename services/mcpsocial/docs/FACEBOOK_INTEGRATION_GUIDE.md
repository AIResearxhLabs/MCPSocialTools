# Facebook Integration Guide

Complete guide for integrating Facebook with the MCPSocial MCP server, including OAuth authentication and API operations.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [OAuth 2.0 Authentication Flow](#oauth-20-authentication-flow)
4. [Available Tools](#available-tools)
5. [Available Resources](#available-resources)
6. [Usage Examples](#usage-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Overview

The Facebook integration provides comprehensive access to Facebook's Graph API, allowing you to:

- **Authenticate** users via OAuth 2.0
- **Create and manage** posts on Facebook
- **Engage** with posts through likes and comments
- **Upload** photos and share links
- **Retrieve** engagement metrics and user information
- **Manage** Facebook pages

All operations are performed securely using OAuth 2.0 access tokens obtained through the authorization flow.

---

## Prerequisites

### 1. Facebook App Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new Facebook App or use an existing one
3. Navigate to **Settings > Basic**
4. Note your **App ID** and **App Secret**

### 2. Configure OAuth Settings

1. In your Facebook App, go to **Facebook Login > Settings**
2. Add your OAuth Redirect URIs (callback URLs)
   - For local development: `http://localhost:3001/auth/facebook/callback`
   - For production: `https://yourdomain.com/auth/facebook/callback`
3. Enable **Client OAuth Login** and **Web OAuth Login**

### 3. Configure Permissions

Request the following permissions for your app:
- `public_profile` - Basic profile information
- `email` - User email address
- `pages_manage_posts` - Manage page posts
- `pages_read_engagement` - Read page engagement data

### 4. Environment Configuration

Add your Facebook credentials to the configuration:

```json
{
  "facebook": {
    "appId": "YOUR_FACEBOOK_APP_ID",
    "appSecret": "YOUR_FACEBOOK_APP_SECRET"
  }
}
```

Or use environment variables:
```bash
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
```

---

## OAuth 2.0 Authentication Flow

### Step 1: Generate Authorization URL

Use the `getFacebookAuthUrl` tool to generate the authorization URL:

```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "getFacebookAuthUrl",
    "params": {
      "callbackUrl": "http://localhost:3001/auth/facebook/callback"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "authorizationUrl": "https://www.facebook.com/v19.0/dialog/oauth?client_id=...",
    "state": "random_csrf_token",
    "callbackUrl": "http://localhost:3001/auth/facebook/callback",
    "instructions": [
      "1. Direct the user to open the authorizationUrl in their browser",
      "2. User will authenticate and authorize the application",
      "3. Facebook will redirect to the callbackUrl with a 'code' parameter",
      "4. Extract the 'code' from the callback URL query parameters",
      "5. Use the exchangeFacebookAuthCode tool with the code to receive an access_token",
      "6. Use the returned access_token with other Facebook tools"
    ]
  }
}
```

### Step 2: User Authorization

1. Direct the user to open `authorizationUrl` in their browser
2. User logs in to Facebook and authorizes your application
3. Facebook redirects to your `callbackUrl` with an authorization code:
   ```
   http://localhost:3001/auth/facebook/callback?code=AUTHORIZATION_CODE&state=STATE
   ```

### Step 3: Exchange Code for Access Token

Use the `exchangeFacebookAuthCode` tool to exchange the authorization code for an access token:

```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "exchangeFacebookAuthCode",
    "params": {
      "code": "AUTHORIZATION_CODE_FROM_CALLBACK",
      "callbackUrl": "http://localhost:3001/auth/facebook/callback"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "message": "Successfully authenticated with Facebook!",
    "accessToken": "ACCESS_TOKEN",
    "tokenType": "bearer",
    "expiresIn": 5183944,
    "usage": [
      "Use this accessToken with tools like:",
      "- postToFacebook: Create posts on Facebook",
      "- listFacebookPosts: View your recent posts",
      "- getFacebookPostLikes: Get engagement metrics",
      "..."
    ]
  }
}
```

**Important:** Store the `accessToken` securely. You'll need it for all subsequent API calls.

---

## Available Tools

### Authentication Tools

#### 1. getFacebookAuthUrl
Generates the OAuth 2.0 authorization URL.

**Parameters:**
- `callbackUrl` (required): OAuth redirect URI
- `state` (optional): CSRF protection token
- `scope` (optional): Permissions scope

#### 2. exchangeFacebookAuthCode
Exchanges authorization code for access token.

**Parameters:**
- `code` (required): Authorization code from callback
- `callbackUrl` (required): Same callback URL used in authorization

### Post Management Tools

#### 3. postToFacebook
Creates a new text-based post on Facebook.

**Parameters:**
- `accessToken` (required): OAuth access token
- `content` (required): Post text content

**Example:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "postToFacebook",
    "params": {
      "accessToken": "YOUR_ACCESS_TOKEN",
      "content": "Hello from MCPSocial! 🚀"
    }
  }'
```

#### 4. listFacebookPosts
Lists the user's recent Facebook posts.

**Parameters:**
- `accessToken` (required): OAuth access token
- `maxResults` (optional): Maximum number of posts (default: 5)

#### 5. deleteFacebookPost
Deletes a post owned by the authenticated user.

**Parameters:**
- `accessToken` (required): OAuth access token
- `postId` (required): ID of the post to delete

### Engagement Tools

#### 6. likeFacebookPost
Likes a post on Facebook.

**Parameters:**
- `accessToken` (required): OAuth access token
- `postId` (required): ID of the post to like

#### 7. getFacebookPostLikes
Gets likes for a specific post.

**Parameters:**
- `accessToken` (required): OAuth access token
- `postId` (required): ID of the post

**Example Response:**
```json
{
  "post_id": "123456789_987654321",
  "count": 42,
  "likes": [
    {
      "id": "user_id_1",
      "name": "John Doe"
    }
  ]
}
```

#### 8. commentOnFacebookPost
Adds a comment to a specific post.

**Parameters:**
- `accessToken` (required): OAuth access token
- `postId` (required): ID of the post
- `comment` (required): Comment text

#### 9. getFacebookPostComments
Gets comments for a specific post.

**Parameters:**
- `accessToken` (required): OAuth access token
- `postId` (required): ID of the post

### Media Tools

#### 10. uploadFacebookPhoto
Uploads a photo to Facebook with an optional caption.

**Parameters:**
- `accessToken` (required): OAuth access token
- `imageUrl` (required): URL of the image to upload
- `caption` (optional): Photo caption

**Example:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "uploadFacebookPhoto",
    "params": {
      "accessToken": "YOUR_ACCESS_TOKEN",
      "imageUrl": "https://example.com/image.jpg",
      "caption": "Beautiful sunset! 🌅"
    }
  }'
```

#### 11. shareFacebookLink
Shares a link on Facebook with optional message.

**Parameters:**
- `accessToken` (required): OAuth access token
- `link` (required): URL to share
- `message` (optional): Message to accompany the link

### Page & Profile Tools

#### 12. getFacebookPageInfo
Gets information about Facebook pages the user manages.

**Parameters:**
- `accessToken` (required): OAuth access token

**Response:**
```json
[
  {
    "id": "page_id",
    "name": "Page Name",
    "category": "Company",
    "followers_count": 1500,
    "fan_count": 1500,
    "access_token": "page_access_token"
  }
]
```

#### 13. getFacebookFriends
Gets the user's Facebook friends list (limited by privacy settings).

**Parameters:**
- `accessToken` (required): OAuth access token

---

## Available Resources

### getFacebookProfile
Retrieves the authenticated user's Facebook profile information.

**Access via MCP:**
```bash
curl -X POST http://localhost:3001/mcp/v1 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "resources/read",
    "params": {
      "uri": "mcpsocial:///getFacebookProfile",
      "arguments": {
        "accessToken": "YOUR_ACCESS_TOKEN"
      }
    }
  }'
```

**Response:**
```json
{
  "id": "user_id",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "picture": {
    "data": {
      "url": "https://platform-lookaside.fbsbx.com/..."
    }
  }
}
```

---

## Usage Examples

### Complete Posting Workflow

```bash
# 1. Get authorization URL
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "getFacebookAuthUrl",
    "params": {
      "callbackUrl": "http://localhost:3001/auth/facebook/callback"
    }
  }')

AUTH_URL=$(echo $AUTH_RESPONSE | jq -r '.result.authorizationUrl')
echo "Visit: $AUTH_URL"

# 2. After user authorizes, exchange code for token
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"exchangeFacebookAuthCode\",
    \"params\": {
      \"code\": \"$AUTH_CODE\",
      \"callbackUrl\": \"http://localhost:3001/auth/facebook/callback\"
    }
  }")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.result.accessToken')

# 3. Create a post
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"postToFacebook\",
    \"params\": {
      \"accessToken\": \"$ACCESS_TOKEN\",
      \"content\": \"Excited to share my latest project! 🚀\"
    }
  }"
```

### Engagement Workflow

```bash
# 1. List recent posts
POSTS=$(curl -s -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"listFacebookPosts\",
    \"params\": {
      \"accessToken\": \"$ACCESS_TOKEN\",
      \"maxResults\": 10
    }
  }")

# 2. Like a post
POST_ID=$(echo $POSTS | jq -r '.result[0].id')
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"likeFacebookPost\",
    \"params\": {
      \"accessToken\": \"$ACCESS_TOKEN\",
      \"postId\": \"$POST_ID\"
    }
  }"

# 3. Comment on the post
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"commentOnFacebookPost\",
    \"params\": {
      \"accessToken\": \"$ACCESS_TOKEN\",
      \"postId\": \"$POST_ID\",
      \"comment\": \"Great post! 👍\"
    }
  }"
```

---

## Error Handling

### Common Errors

#### 1. Invalid Access Token
```json
{
  "error": "Could not retrieve Facebook user profile. The access token may be invalid or expired."
}
```
**Solution:** Re-authenticate to obtain a new access token.

#### 2. Permission Denied (403)
```json
{
  "error": "Post creation forbidden. Check if your app has publish permissions and the user has authorized them."
}
```
**Solution:** Ensure your app has the required permissions and the user has granted them.

#### 3. Rate Limit Exceeded (429)
```json
{
  "error": "Rate limit exceeded. Please wait before creating more posts."
}
```
**Solution:** Implement exponential backoff and respect rate limits.

#### 4. Invalid Authorization Code
```json
{
  "error": "Facebook OAuth Error: Invalid authorization code or callback URL mismatch."
}
```
**Solution:** Ensure the callback URL matches exactly and the code hasn't expired.

---

## Best Practices

### 1. Token Management
- **Store tokens securely** in encrypted storage
- **Implement token refresh** before expiration
- **Never expose** tokens in client-side code or logs

### 2. Rate Limiting
- Facebook has rate limits per user and per app
- Implement **exponential backoff** for retries
- Monitor your API usage in Facebook Developer Console

### 3. Error Handling
- Always check response status codes
- Implement proper error handling for network failures
- Log errors for debugging without exposing sensitive data

### 4. Content Guidelines
- Follow Facebook's [Community Standards](https://transparency.fb.com/policies/community-standards/)
- Respect user privacy and data protection regulations
- Avoid spamming or automated posting abuse

### 5. Testing
- Use Facebook's **Test Users** for development
- Test OAuth flow thoroughly before production
- Validate all input parameters

### 6. Security
- Use HTTPS for all OAuth callbacks
- Validate the `state` parameter to prevent CSRF attacks
- Keep your App Secret confidential

---

## API Limitations

### Post Frequency
- Facebook limits the number of posts per time period
- Excessive posting may trigger spam detection

### Image Requirements
- Images must be publicly accessible via URL
- Supported formats: JPEG, PNG, GIF
- Maximum file size: 10MB

### Text Limits
- Post text: No strict character limit, but readability matters
- Comments: 8,000 characters maximum

---

## Troubleshooting

### OAuth Issues

**Problem:** "Invalid OAuth Redirect URI"
**Solution:** Ensure the redirect URI in your Facebook App settings exactly matches the `callbackUrl` parameter.

**Problem:** "App Not Set Up for Facebook Login"
**Solution:** Enable Facebook Login in your app's products section.

### API Issues

**Problem:** "OAuthException: This authorization code has been used"
**Solution:** Authorization codes are single-use. Generate a new authorization URL.

**Problem:** "Insufficient Permissions"
**Solution:** Request the required permissions in your OAuth scope.

---

## Support Resources

- [Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [Facebook OAuth Documentation](https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow)
- [Facebook Platform Status](https://developers.facebook.com/status/)
- [Facebook Developers Community](https://developers.facebook.com/community/)

---

**Last Updated:** December 15, 2025  
**API Version:** v19.0  
**Server Version:** 1.0.0
