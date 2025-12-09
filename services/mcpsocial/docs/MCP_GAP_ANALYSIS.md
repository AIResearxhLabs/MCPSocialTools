# MCP Tools Gap Analysis Report

**Date:** 2025-01-17  
**Server:** http://3.141.18.225:3001

## Executive Summary

After cross-checking the capabilities exposed via `/api/capabilities` against the MCP tools available at `/mcp/tools`, there is a **significant gap**. The MCP server exposes only **5 tools** and **3 resources**, while the REST API provides **29 distinct endpoints** across LinkedIn, Facebook, Instagram, and Gemini services.

**Critical Finding:** MCP clients cannot access the majority of API capabilities because they are not exposed as MCP tools.

---

## Detailed Comparison

### API Capabilities Count (from `/api/capabilities`)

| Platform | Category | Endpoints | Description |
|----------|----------|-----------|-------------|
| **LinkedIn** | Auth | 2 | OAuth flow initiation and callback |
| | Posts | 5 | Create, list, likes, comments (get/post) |
| | Profile | 1 | Get user profile |
| | Sharing | 1 | Share article |
| | Connections | 1 | List connections |
| **Facebook** | Posts | 5 | Create, list, likes, comments (get/post) |
| | Photos | 1 | Upload photo |
| | Page | 1 | Get page info |
| | Friends | 1 | List friends |
| **Instagram** | Posts | 5 | Create, list, likes, comments (get/post) |
| | Profile | 1 | Get user profile |
| | Followers | 1 | List followers |
| | Following | 1 | List following |
| **Gemini** | Caption | 1 | Generate caption |
| | Schedule | 1 | Get scheduling suggestion |
| **TOTAL** | | **29** | |

### MCP Tools Count (from `/mcp/tools`)

| Tool Name | Platform | Description |
|-----------|----------|-------------|
| `postToLinkedIn` | LinkedIn | Creates a new text-based post |
| `postToFacebook` | Facebook | Creates a new post |
| `postToInstagram` | Instagram | Creates a new post (requires image) |
| `generateCaption` | Gemini | Generates a post caption |
| `getSchedulingSuggestion` | Gemini | Suggests best posting time |
| **TOTAL** | | **5** |

### MCP Resources Count (from `/mcp/resources`)

| Resource Name | Platform | Description |
|---------------|----------|-------------|
| `getLinkedInProfile` | LinkedIn | Retrieves user profile |
| `getFacebookPageInfo` | Facebook | Retrieves page info |
| `getInstagramProfile` | Instagram | Retrieves user profile |
| **TOTAL** | | **3** |

---

## Missing Capabilities in MCP

### 🔴 Critical Missing Tools (High Priority)

#### LinkedIn
- ❌ **List Posts** - `GET /api/linkedin/posts` - List the last 5 posts
- ❌ **Get Post Likes** - `GET /api/linkedin/posts/:id/likes` - Get likes for a specific post
- ❌ **Comment on Post** - `POST /api/linkedin/posts/:id/comments` - Comment on a post
- ❌ **Get Post Comments** - `GET /api/linkedin/posts/:id/comments` - Get comments for a post
- ❌ **Share Article** - `POST /api/linkedin/share` - Share an article
- ❌ **List Connections** - `GET /api/linkedin/connections` - List user connections

#### Facebook
- ❌ **List Posts** - `GET /api/facebook/posts` - List the last 5 posts
- ❌ **Get Post Likes** - `GET /api/facebook/posts/:id/likes` - Get likes for a specific post
- ❌ **Comment on Post** - `POST /api/facebook/posts/:id/comments` - Comment on a post
- ❌ **Get Post Comments** - `GET /api/facebook/posts/:id/comments` - Get comments for a post
- ❌ **Upload Photo** - `POST /api/facebook/photos` - Upload a photo
- ❌ **List Friends** - `GET /api/facebook/friends` - List user friends

#### Instagram
- ❌ **List Posts** - `GET /api/instagram/posts` - List the last 5 posts
- ❌ **Get Post Likes** - `GET /api/instagram/posts/:id/likes` - Get likes for a specific post
- ❌ **Comment on Post** - `POST /api/instagram/posts/:id/comments` - Comment on a post
- ❌ **Get Post Comments** - `GET /api/instagram/posts/:id/comments` - Get comments for a post
- ❌ **List Followers** - `GET /api/instagram/followers` - List followers
- ❌ **List Following** - `GET /api/instagram/following` - List following

### ℹ️ Authentication Endpoints
- ℹ️ **LinkedIn OAuth** - Auth endpoints are not typically exposed as MCP tools (handled separately)

---

## Impact Assessment

### Current State
- **Coverage:** Only **17%** of API capabilities are exposed via MCP (5 tools + 3 resources out of 29 endpoints)
- **User Experience:** MCP clients can only perform basic posting operations and retrieve limited profile information
- **Functionality Gap:** Critical social media management features are unavailable:
  - Cannot retrieve or analyze existing posts
  - Cannot interact with posts (likes, comments)
  - Cannot access social graphs (connections, followers, friends)
  - Cannot upload media independently (photos)

### Client Impact
MCP clients trying to connect will:
1. ✅ Successfully connect to the server
2. ✅ See 5 available tools
3. ❌ **Cannot access 82% of the platform's capabilities**
4. ❌ **Missing essential social media management functions**

---

## Recommendations

### Priority 1: Expand MCP Tool Coverage

Add the following tools to `src/mcp-host.ts`:

#### LinkedIn Tools
```typescript
- listLinkedInPosts (GET posts)
- getLinkedInPostLikes (GET likes)
- commentOnLinkedInPost (POST comment)
- getLinkedInPostComments (GET comments)
- shareLinkedInArticle (POST share)
- listLinkedInConnections (GET connections)
```

#### Facebook Tools
```typescript
- listFacebookPosts (GET posts)
- getFacebookPostLikes (GET likes)
- commentOnFacebookPost (POST comment)
- getFacebookPostComments (GET comments)
- uploadFacebookPhoto (POST photo)
- listFacebookFriends (GET friends)
```

#### Instagram Tools
```typescript
- listInstagramPosts (GET posts)
- getInstagramPostLikes (GET likes)
- commentOnInstagramPost (POST comment)
- getInstagramPostComments (GET comments)
- listInstagramFollowers (GET followers)
- listInstagramFollowing (GET following)
```

### Priority 2: Enhance Resources

Convert read-only operations that don't require parameters to resources:
- LinkedIn connections list
- Facebook friends list
- Instagram followers/following lists

### Priority 3: Update Documentation

Update the following docs:
- `MCP_INTEGRATION_GUIDE.md` - Add all new tools
- `API_REFERENCE.md` - Map REST endpoints to MCP tools
- `README.md` - Update capabilities section

### Priority 4: Testing

Create integration tests to ensure:
- All REST API endpoints have corresponding MCP tools
- Tool schemas match API requirements
- Error handling is consistent

---

## Implementation Plan

### Phase 1: Core Read Operations (Week 1)
- Add list/get tools for posts, likes, comments
- Add social graph tools (connections, followers, friends)
- Test basic functionality

### Phase 2: Advanced Operations (Week 2)
- Add interaction tools (commenting, liking)
- Add media upload tools
- Add sharing capabilities

### Phase 3: Documentation & Testing (Week 3)
- Update all documentation
- Create comprehensive test suite
- Validate with MCP clients

---

## Conclusion

The current MCP implementation provides only basic posting capabilities, representing **17% coverage** of the available API. To provide a complete social media management experience for MCP clients, **24 additional tools** need to be implemented to match the REST API's functionality.

**Next Steps:**
1. Review and approve this gap analysis
2. Prioritize which tools to implement first
3. Update `src/mcp-host.ts` with new tool registrations
4. Test with MCP clients to ensure proper detection
5. Update documentation

---

**Report Generated:** 2025-01-17  
**Analyst:** Cline AI Assistant  
**Status:** Ready for Review
