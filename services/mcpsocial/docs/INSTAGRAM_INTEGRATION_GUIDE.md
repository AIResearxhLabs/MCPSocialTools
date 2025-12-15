# Instagram Integration Guide

Complete guide for integrating Instagram with the MCPSocial MCP server, including OAuth authentication and API operations for Business/Creator accounts.

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

The Instagram integration provides comprehensive access to Instagram's Graph API, allowing you to:

- **Authenticate** users via OAuth 2.0
- **Create and publish** posts with images on Instagram
- **Engage** with posts through comments
- **Retrieve** engagement metrics (likes, comments)
- **Access analytics** (Business accounts only)
- **Manage** Instagram Business/Creator accounts

**Important:** Instagram Graph API requires a **Business or Creator account** for full functionality.

---

## Prerequisites

### 1. Instagram Business/Creator Account

1. Convert your Instagram account to a Business or Creator account
2. Connect it to a Facebook Page (required for API access)
3. Ensure your account is properly linked in Instagram settings

### 2. Facebook App Setup

Instagram API access is managed through Facebook Apps:

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new Facebook App or use an existing one
3. Add **Instagram Graph API** product to your app
4. Navigate to **Settings > Basic**
5. Note your **App ID** and **App Secret**

### 3. Configure OAuth Settings

1. In your Facebook App, go to **Instagram > Basic Display**
2. Add your OAuth Redirect URIs (callback URLs)
   - For local development: `http://localhost:3001/auth/instagram/callback`
   - For production: `https://yourdomain.com/auth/instagram/callback`
3. Add **Instagram Testers** (for development)

### 4. Configure Permissions

Request the following permissions for your app:
- `user_profile` - Basic profile information
- `user_media` - Access user's media (posts)
- For Business accounts:
  - `instagram_basic` - Basic Instagram data
  - `instagram_content_publish` - Publish content
  - `pages_read_engagement` - Read engagement metrics

### 5. Environment Configuration

Add your Instagram credentials to the configuration:

```json
{
  "instagram": {
    "appId": "YOUR_INSTAGRAM_APP_ID",
    "appSecret": "YOUR_INSTAGRAM_APP_SECRET"
  }
}
```

Or use environment variables:
```bash
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
```

---

## OAuth 2.0 Authentication Flow

### Step 1: Generate Authorization URL

Use the `getInstagramAuthUrl` tool to generate the authorization URL:

```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "getInstagramAuthUrl",
    "params": {
      "callbackUrl": "http://localhost:3001/auth/instagram/callback"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "authorizationUrl": "https://api.instagram.com/oauth/authorize?client_id=...",
    "state": "random_csrf_token",
    "callbackUrl": "http://localhost:3001/auth/instagram/callback",
    "instructions": [
      "1. Direct the user to open the authorizationUrl in their browser",
      "2. User will authenticate and authorize the application (requires Business/Creator account)",
      "3. Instagram will redirect to the callbackUrl with a 'code' parameter",
      "4. Extract the 'code' from the callback URL query parameters",
      "5. Use the exchangeInstagramAuthCode tool with the code to receive an access_token",
      "6. Use the returned access_token with other Instagram tools"
    ],
    "note": "Instagram Basic Display API requires a Business or Creator account for full functionality."
  }
}
```

### Step 2: User Authorization

1. Direct the user to open `authorizationUrl` in their browser
2. User logs in to Instagram and authorizes your application
3. Instagram redirects to your `callbackUrl` with an authorization code:
   ```
   http://localhost:3001/auth/instagram/callback?code=AUTHORIZATION_CODE&state=STATE
   ```

### Step 3: Exchange Code for Access Token

Use the `exchangeInstagramAuthCode` tool to exchange the authorization code for an access token:

```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "exchangeInstagramAuthCode",
    "params": {
      "code": "AUTHORIZATION_CODE_FROM_CALLBACK",
      "callbackUrl": "http://localhost:3001/auth/instagram/callback"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "message": "Successfully authenticated with Instagram!",
    "accessToken": "ACCESS_TOKEN",
    "userId": "user_instagram_id",
    "usage": [
      "Use this accessToken with tools like:",
      "- postToInstagram: Create posts on Instagram",
      "- listInstagramPosts: View your recent posts",
      "- getInstagramPostLikes: Get engagement metrics",
      "- getInstagramPostInsights: Get post analytics (Business accounts)",
      "..."
    ],
    "note": "For Business accounts, you can access additional insights and analytics features."
  }
}
```

**Important:** Store the `accessToken` securely. You'll need it for all subsequent API calls.

---

## Available Tools

### Authentication Tools

#### 1. getInstagramAuthUrl
Generates the OAuth 2.0 authorization URL.

**Parameters:**
- `callbackUrl` (required): OAuth redirect URI
- `state` (optional): CSRF protection token
- `scope` (optional): Permissions scope

#### 2. exchangeInstagramAuthCode
Exchanges authorization code for access token.

**Parameters:**
- `code` (required): Authorization code from callback
- `callbackUrl` (required): Same callback URL used in authorization

### Post Management Tools

#### 3. postToInstagram
Creates a new post on Instagram with an image and caption (two-step process).

**Parameters:**
- `accessToken` (required): OAuth access token
- `imageUrl` (required): URL of the image (must be publicly accessible)
- `caption` (required): Post caption

**Important Notes:**
- Image URL must be publicly accessible
- Instagram performs a two-step process: container creation + publishing
- Processing may take a few seconds

**Example:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "postToInstagram",
    "params": {
      "accessToken": "YOUR_ACCESS_TOKEN",
      "imageUrl": "https://example.com/image.jpg",
      "caption": "Beautiful day! ☀️ #nofilter"
    }
  }'
```

#### 4. listInstagramPosts
Lists the user's recent Instagram posts.

**Parameters:**
- `accessToken` (required): OAuth access token
- `maxResults` (optional): Maximum number of posts (default: 5)

**Response:**
```json
[
  {
    "id": "post_id",
    "caption": "Post caption",
    "media_type": "IMAGE",
    "media_url": "https://...",
    "permalink": "https://instagram.com/p/...",
    "timestamp": "2025-12-15T10:30:00+0000",
    "like_count": 42,
    "comments_count": 5
  }
]
```

### Engagement Tools

#### 5. getInstagramPostLikes
Gets the likes count for a specific post.

**Parameters:**
- `accessToken` (required): OAuth access token
- `postId` (required): ID of the post

**Response:**
```json
{
  "post_id": "post_id",
  "count": 42
}
```

#### 6. commentOnInstagramPost
Adds a comment to a specific post.

**Parameters:**
- `accessToken` (required): OAuth access token
- `postId` (required): ID of the post
- `comment` (required): Comment text

**Example:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "commentOnInstagramPost",
    "params": {
      "accessToken": "YOUR_ACCESS_TOKEN",
      "postId": "POST_ID",
      "comment": "Amazing photo! 📸"
    }
  }'
```

#### 7. getInstagramPostComments
Gets comments for a specific post.

**Parameters:**
- `accessToken` (required): OAuth access token
- `postId` (required): ID of the post

**Response:**
```json
[
  {
    "id": "comment_id",
    "text": "Great post!",
    "username": "user123",
    "timestamp": "2025-12-15T10:35:00+0000",
    "like_count": 3
  }
]
```

#### 8. replyToInstagramComment
Replies to a comment on a post.

**Parameters:**
- `accessToken` (required): OAuth access token
- `commentId` (required): ID of the comment to reply to
- `message` (required): Reply text

### Audience Tools

#### 9. getInstagramFollowers
Gets the user's Instagram followers count.

**Parameters:**
- `accessToken` (required): OAuth access token

**Response:**
```json
{
  "followers_count": 1542
}
```

#### 10. getInstagramFollowing
Gets the user's Instagram following count.

**Parameters:**
- `accessToken` (required): OAuth access token

**Response:**
```json
{
  "follows_count": 324
}
```

### Analytics Tools (Business Accounts Only)

#### 11. getInstagramPostInsights
Gets insights (analytics) for a specific post. Requires Instagram Business account.

**Parameters:**
- `accessToken` (required): OAuth access token
- `postId` (required): ID of the post

**Response:**
```json
{
  "post_id": "post_id",
  "engagement": 125,
  "impressions": 890,
  "reach": 750,
  "saved": 15
}
```

**Available Metrics:**
- `engagement` - Total interactions
- `impressions` - Total views
- `reach` - Unique accounts reached
- `saved` - Number of saves

#### 12. getInstagramAccountInsights
Gets account insights (analytics) for the user. Requires Instagram Business account.

**Parameters:**
- `accessToken` (required): OAuth access token
- `metric` (optional): Metrics to retrieve (default: "impressions,reach,profile_views")
- `period` (optional): Time period: "day", "week", "days_28", "lifetime" (default: "day")

**Example:**
```bash
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "getInstagramAccountInsights",
    "params": {
      "accessToken": "YOUR_ACCESS_TOKEN",
      "metric": "impressions,reach,profile_views",
      "period": "day"
    }
  }'
```

**Response:**
```json
{
  "impressions": 5420,
  "reach": 3210,
  "profile_views": 145
}
```

---

## Available Resources

### getInstagramProfile
Retrieves the authenticated user's Instagram profile information.

**Access via MCP:**
```bash
curl -X POST http://localhost:3001/mcp/v1 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "resources/read",
    "params": {
      "uri": "mcpsocial:///getInstagramProfile",
      "arguments": {
        "accessToken": "YOUR_ACCESS_TOKEN"
      }
    }
  }'
```

**Response:**
```json
{
  "id": "instagram_user_id",
  "username": "john_doe",
  "account_type": "BUSINESS",
  "media_count": 152
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
    "toolName": "getInstagramAuthUrl",
    "params": {
      "callbackUrl": "http://localhost:3001/auth/instagram/callback"
    }
  }')

AUTH_URL=$(echo $AUTH_RESPONSE | jq -r '.result.authorizationUrl')
echo "Visit: $AUTH_URL"

# 2. After user authorizes, exchange code for token
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"exchangeInstagramAuthCode\",
    \"params\": {
      \"code\": \"$AUTH_CODE\",
      \"callbackUrl\": \"http://localhost:3001/auth/instagram/callback\"
    }
  }")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.result.accessToken')

# 3. Create a post with image
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"postToInstagram\",
    \"params\": {
      \"accessToken\": \"$ACCESS_TOKEN\",
      \"imageUrl\": \"https://example.com/photo.jpg\",
      \"caption\": \"Exploring new horizons! 🌅 #adventure #travel\"
    }
  }"
```

### Analytics Workflow (Business Account)

```bash
# 1. Get account insights
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"getInstagramAccountInsights\",
    \"params\": {
      \"accessToken\": \"$ACCESS_TOKEN\",
      \"metric\": \"impressions,reach,profile_views\",
      \"period\": \"week\"
    }
  }"

# 2. List recent posts
POSTS=$(curl -s -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"listInstagramPosts\",
    \"params\": {
      \"accessToken\": \"$ACCESS_TOKEN\",
      \"maxResults\": 5
    }
  }")

# 3. Get insights for a specific post
POST_ID=$(echo $POSTS | jq -r '.result[0].id')
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"getInstagramPostInsights\",
    \"params\": {
      \"accessToken\": \"$ACCESS_TOKEN\",
      \"postId\": \"$POST_ID\"
    }
  }"
```

### Engagement Management

```bash
# 1. Get post comments
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"getInstagramPostComments\",
    \"params\": {
      \"accessToken\": \"$ACCESS_TOKEN\",
      \"postId\": \"$POST_ID\"
    }
  }"

# 2. Reply to a comment
COMMENT_ID="comment_id_here"
curl -X POST http://localhost:3001/mcp/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"toolName\": \"replyToInstagramComment\",
    \"params\": {
      \"accessToken\": \"$ACCESS_TOKEN\",
      \"commentId\": \"$COMMENT_ID\",
      \"message\": \"Thank you! 🙏\"
    }
  }"
```

---

## Error Handling

### Common Errors

#### 1. Invalid Access Token
```json
{
  "error": "Could not retrieve Instagram user profile. The access token may be invalid or expired."
}
```
**Solution:** Re-authenticate to obtain a new access token.

#### 2. Business Account Required (403)
```json
{
  "error": "Post creation forbidden. Ensure you have a Business or Creator account and proper permissions."
}
```
**Solution:** Convert your Instagram account to Business/Creator and link to a Facebook Page.

#### 3. Invalid Image URL
```json
{
  "error": "Could not create post on Instagram. Ensure the image URL is publicly accessible."
}
```
**Solution:** Verify the image URL is publicly accessible and returns a valid image format (JPEG/PNG).

#### 4. Rate Limit Exceeded (429)
```json
{
  "error": "Rate limit exceeded. Please wait before creating more posts."
}
```
**Solution:** Implement exponential backoff and respect rate limits.

#### 5. Insights Not Available
```json
{
  "error": "Could not get insights for post. Ensure you have a Business account."
}
```
**Solution:** Insights are only available for Business/Creator accounts.

---

## Best Practices

### 1. Account Setup
- **Use Business/Creator Account** for full API access
- **Link to Facebook Page** for proper authentication
- **Verify account connection** before requesting access tokens

### 2. Image Requirements
- **Public URLs Only:** Images must be accessible via public HTTPS URLs
- **Format:** JPEG or PNG only
- **Size:** Recommended 1080x1080px (square) or 1080x1350px (portrait)
- **File Size:** Under 8MB for optimal performance
- **Aspect Ratio:** Between 4:5 and 1.91:1

### 3. Content Guidelines
- Follow Instagram's [Community Guidelines](https://help.instagram.com/477434105621119)
- Avoid excessive hashtags (max 30)
- Don't spam or post duplicate content
- Respect copyright and intellectual property

### 4. Token Management
- **Store tokens securely** in encrypted storage
- **Tokens don't expire** by default, but can be invalidated
- **Handle token invalidation** gracefully

### 5. Posting Best Practices
- **Timing:** Post during peak engagement hours for your audience
- **Quality:** Use high-quality images
- **Captions:** Write engaging, relevant captions
- **Hashtags:** Use 5-10 relevant hashtags

### 6. Rate Limiting
- Instagram has strict rate limits per user
- Implement **exponential backoff** for retries
- Monitor API usage to avoid limits
- Limit posting frequency (avoid posting more than once per hour)

### 7. Analytics Usage
- Check insights regularly to optimize strategy
- Focus on engagement rate over follower count
- Track reach and impressions trends
- Analyze best-performing content

---

## API Limitations

### Posting Restrictions
- **Frequency:** Limit to avoid spam detection
- **Image Types:** Photos only (no videos via Basic API)
- **Stories:** Not supported via Basic Display API
- **Carousel Posts:** Not supported via Basic Display API

### Image Requirements
- **Formats:** JPEG, PNG only
- **Maximum Size:** 8MB
- **Aspect Ratios:** Between 4:5 and 1.91:1
- **URL Accessibility:** Must be publicly accessible

### Analytics
- **Business Accounts Only:** Insights require Business/Creator account
- **Data Availability:** Up to 90 days of historical data
- **Metrics:** Limited to predefined metric sets

### API Access
- **Account Type:** Business or Creator account required
- **Facebook Page:** Must be linked to a Facebook Page
- **App Review:** May require Facebook App Review for production

---

## Troubleshooting

### OAuth Issues

**Problem:** "Invalid OAuth Redirect URI"
**Solution:** Ensure the redirect URI matches exactly in Facebook App settings.

**Problem:** "User is not authorized for this endpoint"
**Solution:** Ensure the Instagram account is a Business/Creator account and properly linked to a Facebook Page.

### Posting Issues

**Problem:** "Image URL not accessible"
**Solution:** Verify the image URL is:
- Publicly accessible (no authentication required)
- Returns proper image content type
- Uses HTTPS protocol

**Problem:** "Post creation takes too long"
**Solution:** Instagram uses a two-step process. Wait for both container creation and publishing to complete.

### Analytics Issues

**Problem:** "Insights endpoint returns error"
**Solution:** Insights are only available for:
- Business/Creator accounts
- Posts older than 24 hours
- Valid metric/period combinations

---

## Support Resources

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Instagram Platform Policy](https://developers.facebook.com/docs/instagram-api/overview#instagram-platform-policy)
- [Facebook Developers Community](https://developers.facebook.com/community/)
- [Instagram Business Help Center](https://business.instagram.com/help)

---

## Additional Notes

### Instagram vs Instagram Graph API
- **Basic Display API:** For personal accounts, limited features
- **Instagram Graph API:** For Business/Creator accounts, full features including insights

### Migration from Basic Display to Graph API
If you need advanced features:
1. Convert account to Business/Creator
2. Link to Facebook Page
3. Request additional permissions
4. Update API endpoints accordingly

---

**Last Updated:** December 15, 2025  
**API Version:** Instagram Graph API  
**Server Version:** 1.0.0
