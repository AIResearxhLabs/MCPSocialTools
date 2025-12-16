import { Router, Request, Response, NextFunction } from 'express';

const capabilities = {
    "api": {
        "linkedin": {
            "auth": {
                "GET /api/auth/linkedin": "Initiates the LinkedIn OAuth2 flow.",
                "GET /api/auth/linkedin/callback": "Callback URL for LinkedIn OAuth2."
            },
            "posts": {
                "POST /api/linkedin/posts": "Create a new post.",
                "GET /api/linkedin/posts": "List the last 5 posts.",
                "GET /api/linkedin/posts/:id/likes": "Get likes for a specific post.",
                "POST /api/linkedin/posts/:id/comments": "Comment on a specific post.",
                "GET /api/linkedin/posts/:id/comments": "Get comments for a specific post."
            },
            "profile": {
                "GET /api/linkedin/profile": "Get the user's profile information."
            },
            "sharing": {
                "POST /api/linkedin/share": "Share an article."
            },
            "connections": {
                "GET /api/linkedin/connections": "List the user's connections."
            }
        },
        "facebook": {
            "posts": {
                "POST /api/facebook/posts": "Create a new post.",
                "GET /api/facebook/posts": "List the last 5 posts.",
                "GET /api/facebook/posts/:id/likes": "Get likes for a specific post.",
                "POST /api/facebook/posts/:id/comments": "Comment on a specific post.",
                "GET /api/facebook/posts/:id/comments": "Get comments for a specific post."
            },
            "photos": {
                "POST /api/facebook/photos": "Upload a photo."
            },
            "page": {
                "GET /api/facebook/page": "Get information about the user's page."
            },
            "friends": {
                "GET /api/facebook/friends": "List the user's friends."
            }
        },
        "instagram": {
            "posts": {
                "POST /api/instagram/posts": "Create a new post.",
                "GET /api/instagram/posts": "List the last 5 posts.",
                "GET /api/instagram/posts/:id/likes": "Get likes for a specific post.",
                "POST /api/instagram/posts/:id/comments": "Comment on a specific post.",
                "GET /api/instagram/posts/:id/comments": "Get comments for a specific post."
            },
            "profile": {
                "GET /api/instagram/profile": "Get the user's profile information."
            },
            "followers": {
                "GET /api/instagram/followers": "List the user's followers."
            },
            "following": {
                "GET /api/instagram/following": "List the users the user is following."
            }
        },
        "openai": {
            "caption": {
                "POST /api/openai/caption": "Generate a caption for a post."
            },
            "schedule": {
                "POST /api/openai/schedule": "Get a suggestion for when to schedule a post."
            }
        }
    }
};

import { LinkedInClient } from '../core/linkedin-client';
import { FacebookClient } from '../core/facebook-client';
import { InstagramClient } from '../core/instagram-client';
import { OpenAIClient } from '../core/openai-client';
import { linkedinConfig } from '../config';
import axios from 'axios';
import qs from 'qs';
import crypto from 'crypto';

const router = Router();

router.get('/capabilities', (req: Request, res: Response) => {
    res.json(capabilities.api);
});

// Middleware to create a LinkedIn client for each request
const linkedinAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  res.locals.linkedinClient = new LinkedInClient(accessToken);
  next();
};

// Middleware to create a Facebook client for each request
const facebookAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  res.locals.facebookClient = new FacebookClient(accessToken);
  next();
};

// Middleware to create an Instagram client for each request
const instagramAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  res.locals.instagramClient = new InstagramClient(accessToken);
  next();
};

const openaiClient = new OpenAIClient();

// LinkedIn Auth Routes
// NOTE: These legacy REST endpoints are deprecated. Use the MCP tools instead:
// - getLinkedInAuthUrl (to generate authorization URL with custom callback)
// - exchangeLinkedInAuthCode (to get token exchange instructions)
// These endpoints are kept for backward compatibility but require callback_url as query parameter

router.get('/auth/linkedin', (req: Request, res: Response) => {
    const callbackUrl = req.query.callback_url as string;
    
    if (!callbackUrl) {
        return res.status(400).json({ 
            error: 'callback_url query parameter is required',
            message: 'Use MCP tools (getLinkedInAuthUrl) for better OAuth flow management'
        });
    }

    const state = crypto.randomBytes(16).toString('hex');
    console.log(`Generated state: ${state}`);

    const scope = 'openid profile w_member_social';

    const authorizationUrl = `https://www.linkedin.com/oauth/v2/authorization?${qs.stringify({
        response_type: 'code',
        client_id: linkedinConfig.apiKey,
        redirect_uri: callbackUrl,
        state,
        scope,
    })}`;

    res.redirect(authorizationUrl);
});

router.get('/auth/linkedin/callback', async (req: Request, res: Response) => {
    const { code, state, callback_url } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing.' });
    }

    if (!callback_url) {
        return res.status(400).json({ 
            error: 'callback_url query parameter is required for token exchange',
            message: 'The callback_url must match what was used in the authorization request'
        });
    }

    try {
        const tokenResponse = await axios.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            qs.stringify({
                grant_type: 'authorization_code',
                code: code as string,
                redirect_uri: callback_url as string,
                client_id: linkedinConfig.apiKey,
                client_secret: linkedinConfig.apiSecret,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token, expires_in } = tokenResponse.data;

        res.json({
            message: 'Successfully authenticated with LinkedIn!',
            accessToken: access_token,
            expiresIn: expires_in,
        });
    } catch (error) {
        console.error('Error exchanging authorization code for access token:', error);
        res.status(500).json({ error: 'Failed to authenticate with LinkedIn.' });
    }
});


// LinkedIn Routes (all protected by the authentication middleware)
router.use('/linkedin', linkedinAuthMiddleware);

router.post('/linkedin/posts', async (req: Request, res: Response) => {
  const { content } = req.body;
  const post = await res.locals.linkedinClient.createPost(content);
  res.json(post);
});

router.get('/linkedin/posts', async (req: Request, res: Response) => {
  const posts = await res.locals.linkedinClient.listLast5Posts();
  res.json(posts);
});

router.get('/linkedin/posts/:id/likes', async (req: Request, res: Response) => {
  const { id } = req.params;
  const likes = await res.locals.linkedinClient.getLikesForPost(id);
  res.json(likes);
});

router.post('/linkedin/posts/:id/comments', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { comment } = req.body;
  const newComment = await res.locals.linkedinClient.commentOnPost(id, comment);
  res.json(newComment);
});

router.get('/linkedin/posts/:id/comments', async (req: Request, res: Response) => {
  const { id } = req.params;
  const comments = await res.locals.linkedinClient.getPostComments(id);
  res.json(comments);
});

router.get('/linkedin/profile', async (req: Request, res: Response) => {
  const profile = await res.locals.linkedinClient.getProfileInfo();
  res.json(profile);
});

router.post('/linkedin/share', async (req: Request, res: Response) => {
  const { url, text } = req.body;
  const share = await res.locals.linkedinClient.shareArticle(url, text);
  res.json(share);
});

router.get('/linkedin/connections', async (req: Request, res: Response) => {
  const connections = await res.locals.linkedinClient.listConnections();
  res.json(connections);
});

// Facebook Routes (all protected by the authentication middleware)
router.use('/facebook', facebookAuthMiddleware);

router.post('/facebook/posts', async (req: Request, res: Response) => {
    const { content } = req.body;
    const post = await res.locals.facebookClient.createPost(content);
    res.json(post);
});
router.get('/facebook/posts', async (req: Request, res: Response) => {
    const posts = await res.locals.facebookClient.listLast5Posts();
    res.json(posts);
});
router.get('/facebook/posts/:id/likes', async (req: Request, res: Response) => {
    const { id } = req.params;
    const likes = await res.locals.facebookClient.getLikesForPost(id);
    res.json(likes);
});
router.post('/facebook/posts/:id/comments', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    const newComment = await res.locals.facebookClient.commentOnPost(id, comment);
    res.json(newComment);
});
router.get('/facebook/posts/:id/comments', async (req: Request, res: Response) => {
    const { id } = req.params;
    const comments = await res.locals.facebookClient.getPostComments(id);
    res.json(comments);
});
router.post('/facebook/photos', async (req: Request, res: Response) => {
    const { imageUrl, caption } = req.body;
    const photo = await res.locals.facebookClient.uploadPhoto(imageUrl, caption);
    res.json(photo);
});
router.get('/facebook/page', async (req: Request, res: Response) => {
    const pageInfo = await res.locals.facebookClient.getPageInfo();
    res.json(pageInfo);
});
router.get('/facebook/friends', async (req: Request, res: Response) => {
    const friends = await res.locals.facebookClient.getUserFriends();
    res.json(friends);
});

// Instagram Routes (all protected by the authentication middleware)
router.use('/instagram', instagramAuthMiddleware);

router.post('/instagram/posts', async (req: Request, res: Response) => {
    const { imageUrl, caption } = req.body;
    const post = await res.locals.instagramClient.createPost(imageUrl, caption);
    res.json(post);
});
router.get('/instagram/posts', async (req: Request, res: Response) => {
    const posts = await res.locals.instagramClient.listLast5Posts();
    res.json(posts);
});
router.get('/instagram/posts/:id/likes', async (req: Request, res: Response) => {
    const { id } = req.params;
    const likes = await res.locals.instagramClient.getLikesForPost(id);
    res.json(likes);
});
router.post('/instagram/posts/:id/comments', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { comment } = req.body;
    const newComment = await res.locals.instagramClient.commentOnPost(id, comment);
    res.json(newComment);
});
router.get('/instagram/posts/:id/comments', async (req: Request, res: Response) => {
    const { id } = req.params;
    const comments = await res.locals.instagramClient.getPostComments(id);
    res.json(comments);
});
router.get('/instagram/profile', async (req: Request, res: Response) => {
    const profile = await res.locals.instagramClient.getUserProfile();
    res.json(profile);
});
router.get('/instagram/followers', async (req: Request, res: Response) => {
    const followers = await res.locals.instagramClient.getFollowers();
    res.json(followers);
});
router.get('/instagram/following', async (req: Request, res: Response) => {
    const following = await res.locals.instagramClient.getFollowing();
    res.json(following);
});

// OpenAI Routes
router.post('/openai/caption', async (req, res) => {
    const { prompt } = req.body;
    const caption = await openaiClient.generateCaption(prompt);
    res.json({ caption });
});

router.post('/openai/schedule', async (req, res) => {
    const { postContent } = req.body;
    const suggestion = await openaiClient.getSchedulingSuggestion(postContent);
    res.json({ suggestion });
});

export default router;
