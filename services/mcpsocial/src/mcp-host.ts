import { LinkedInClient } from './core/linkedin-client';
import { OpenAIClient } from './core/openai-client';
import { FacebookClient, FacebookOAuthHelper } from './core/facebook-client';
import { InstagramClient, InstagramOAuthHelper } from './core/instagram-client';
import { TwitterClient, TwitterOAuthHelper } from './core/twitter-client';
import { linkedinConfig, twitterConfig, facebookConfig, instagramConfig } from './config';
import { logger } from './utils/logger';
import crypto from 'crypto';
import qs from 'qs';
import axios from 'axios';

/**
 * Defines the structure for a tool that can be exposed by the MCP Host.
 */
interface McpTool {
  name: string;
  description: string;
  inputSchema: object;
  // eslint-disable-next-line @typescript-eslint/ban-types
  execute: Function;
}

/**
 * Defines the structure for a resource that can be exposed by the MCP Host.
 */
interface McpResource {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/ban-types
  fetch: Function;
}

/**
 * MCP Server metadata
 */
interface McpServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities: {
    tools: boolean;
    resources: boolean;
  };
}

/**
 * The MCP Host for the Social Platform service.
 * This host exposes tools and resources for interacting with social media platforms
 * and the Gemini API.
 */
export class McpSocialHost {
  private tools: Map<string, McpTool> = new Map();
  private resources: Map<string, McpResource> = new Map();
  private openaiClient: OpenAIClient;
  
  private serverInfo: McpServerInfo = {
    name: 'mcpsocial',
    version: '1.0.0',
    protocolVersion: '1.0',
    capabilities: {
      tools: true,
      resources: true,
    },
  };

  constructor() {
    this.openaiClient = new OpenAIClient();
    this.registerLinkedInAuthTools();
    this.registerLinkedInTools();
    this.registerTwitterAuthTools();
    this.registerTwitterTools();
    this.registerFacebookAuthTools();
    this.registerFacebookTools();
    this.registerInstagramAuthTools();
    this.registerInstagramTools();
    this.registerOpenAITools();
  }

  /**
   * Registers LinkedIn authentication tools.
   */
  private registerLinkedInAuthTools() {
    // Tool: Get LinkedIn OAuth authorization URL
    const getLinkedInAuthUrlTool: McpTool = {
      name: 'getLinkedInAuthUrl',
      description: 'Generates the LinkedIn OAuth 2.0 authorization URL to initiate user authentication. Returns a URL that the user must visit in their browser to authorize the application. After authorization, LinkedIn will redirect to the specified callback URL with an authorization code.',
      inputSchema: {
        type: 'object',
        properties: {
          callbackUrl: {
            type: 'string',
            description: 'The URL where LinkedIn will redirect after authorization. This must match exactly with the URL registered in your LinkedIn App settings (including protocol, domain, port, and path).',
          },
          state: {
            type: 'string',
            description: 'Optional CSRF protection state parameter. If not provided, a random state will be generated. This should be stored and verified in the callback.',
          },
        },
        required: ['callbackUrl'],
      },
      execute: async (params: { callbackUrl: string; state?: string }) => {
        const state = params.state || crypto.randomBytes(16).toString('hex');
        const scope = 'openid profile w_member_social';
        
        const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${qs.stringify({
          response_type: 'code',
          client_id: linkedinConfig.apiKey,
          redirect_uri: params.callbackUrl,
          state,
          scope,
        })}`;

        return {
          authorizationUrl: authUrl,
          state: state,
          callbackUrl: params.callbackUrl,
          instructions: [
            '1. Direct the user to open the authorizationUrl in their browser',
            '2. User will authenticate and authorize the application',
            '3. LinkedIn will redirect to the callbackUrl with a "code" parameter',
            '4. Extract the "code" from the callback URL query parameters',
            '5. Use the exchangeLinkedInAuthCode tool with the code to receive an access_token',
            '6. Use the returned access_token with other LinkedIn tools to post, read, and interact with LinkedIn',
          ],
        };
      },
    };

    // Tool: Exchange authorization code for access token
    const exchangeLinkedInAuthCodeTool: McpTool = {
      name: 'exchangeLinkedInAuthCode',
      description: 'Exchanges a LinkedIn authorization code for an access token. This tool performs the server-side token exchange and returns the access_token that can be used with other LinkedIn tools (postToLinkedIn, listLinkedInPosts, etc.) to interact with LinkedIn APIs on behalf of the authenticated user.',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The authorization code received from LinkedIn OAuth callback',
          },
          callbackUrl: {
            type: 'string',
            description: 'The same callback URL that was used in the authorization request. This must match exactly.',
          },
        },
        required: ['code', 'callbackUrl'],
      },
      execute: async (params: { code: string; callbackUrl: string }) => {
        const getTimer = logger.startTimer();
        
        try {
          logger.info('LinkedIn Token Exchange Started', undefined, { 
            code: params.code.substring(0, 10) + '...', 
            callbackUrl: params.callbackUrl 
          });
          
          const tokenResponse = await axios.post(
            'https://www.linkedin.com/oauth/v2/accessToken',
            qs.stringify({
              grant_type: 'authorization_code',
              code: params.code,
              redirect_uri: params.callbackUrl,
              client_id: linkedinConfig.apiKey,
              client_secret: linkedinConfig.apiSecret,
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );

          const { access_token, expires_in, refresh_token, refresh_token_expires_in, scope } = tokenResponse.data;
          const duration = getTimer();
          
          logger.info('LinkedIn Token Exchange Successful', { duration }, { 
            expiresIn: expires_in, 
            hasRefreshToken: !!refresh_token,
            scope
          });

          return {
            success: true,
            message: 'Successfully authenticated with LinkedIn! You can now use the access_token with other LinkedIn tools.',
            accessToken: access_token,
            expiresIn: expires_in,
            refreshToken: refresh_token,
            refreshTokenExpiresIn: refresh_token_expires_in,
            scope: scope,
            usage: [
              'Use this accessToken with tools like:',
              '- postToLinkedIn: Create posts on LinkedIn',
              '- listLinkedInPosts: View your recent posts',
              '- getLinkedInPostLikes: Get engagement metrics',
              '- commentOnLinkedInPost: Engage with content',
              '- shareLinkedInArticle: Share articles with your network',
              '- listLinkedInConnections: View your connections',
            ],
          };
        } catch (error) {
          const duration = getTimer();
          const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
          
          logger.error('LinkedIn Token Exchange Failed', { duration }, { 
            error: errorMsg,
            code: params.code.substring(0, 10) + '...',
            callbackUrl: params.callbackUrl
          });
          
          // Provide helpful error messages
          if (axios.isAxiosError(error) && error.response) {
            const statusCode = error.response.status;
            const errorData = error.response.data;
            
            if (statusCode === 400) {
              throw new Error(`LinkedIn OAuth Error: ${errorData.error_description || 'Invalid authorization code or callback URL mismatch. Ensure the callback URL matches exactly what was used in the authorization request.'}`);
            } else if (statusCode === 401) {
              throw new Error('LinkedIn OAuth Error: Invalid client credentials. Check your LinkedIn API key and secret in the configuration.');
            }
          }
          
          throw new Error(`Failed to exchange authorization code for access token: ${errorMsg}`);
        }
      },
    };

    this.tools.set(getLinkedInAuthUrlTool.name, getLinkedInAuthUrlTool);
    this.tools.set(exchangeLinkedInAuthCodeTool.name, exchangeLinkedInAuthCodeTool);
  }

  /**
   * Registers the tools and resources related to LinkedIn.
   */
  private registerLinkedInTools() {
    // Tool: Create a new post on LinkedIn
    const postToLinkedInTool: McpTool = {
      name: 'postToLinkedIn',
      description: 'Creates a new text-based post on LinkedIn.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s LinkedIn account.',
          },
          content: {
            type: 'string',
            description: 'The text content of the post.',
          },
        },
        required: ['accessToken', 'content'],
      },
      execute: async (params: { accessToken: string; content: string }) => {
        const { accessToken, content } = params;
        const linkedinClient = new LinkedInClient(accessToken);
        return await linkedinClient.createPost(content);
      },
    };

    // Tool: List the last 5 posts on LinkedIn
    const listLinkedInPostsTool: McpTool = {
      name: 'listLinkedInPosts',
      description: 'Lists the last 5 posts from the user\'s LinkedIn account.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s LinkedIn account.',
          },
        },
        required: ['accessToken'],
      },
      execute: async (params: { accessToken: string }) => {
        const { accessToken } = params;
        const linkedinClient = new LinkedInClient(accessToken);
        return await linkedinClient.listLast5Posts();
      },
    };

    // Tool: Get likes for a specific LinkedIn post
    const getLinkedInPostLikesTool: McpTool = {
      name: 'getLinkedInPostLikes',
      description: 'Gets the likes for a specific LinkedIn post.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s LinkedIn account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to get likes for.',
          },
        },
        required: ['accessToken', 'postId'],
      },
      execute: async (params: { accessToken: string; postId: string }) => {
        const { accessToken, postId } = params;
        const linkedinClient = new LinkedInClient(accessToken);
        return await linkedinClient.getLikesForPost(postId);
      },
    };

    // Tool: Comment on a specific LinkedIn post
    const commentOnLinkedInPostTool: McpTool = {
      name: 'commentOnLinkedInPost',
      description: 'Adds a comment to a specific LinkedIn post.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s LinkedIn account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to comment on.',
          },
          comment: {
            type: 'string',
            description: 'The text content of the comment.',
          },
        },
        required: ['accessToken', 'postId', 'comment'],
      },
      execute: async (params: { accessToken: string; postId: string; comment: string }) => {
        const { accessToken, postId, comment } = params;
        const linkedinClient = new LinkedInClient(accessToken);
        return await linkedinClient.commentOnPost(postId, comment);
      },
    };

    // Tool: Get comments for a specific LinkedIn post
    const getLinkedInPostCommentsTool: McpTool = {
      name: 'getLinkedInPostComments',
      description: 'Gets the comments for a specific LinkedIn post.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s LinkedIn account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to get comments for.',
          },
        },
        required: ['accessToken', 'postId'],
      },
      execute: async (params: { accessToken: string; postId: string }) => {
        const { accessToken, postId } = params;
        const linkedinClient = new LinkedInClient(accessToken);
        return await linkedinClient.getPostComments(postId);
      },
    };

    // Tool: Share an article on LinkedIn
    const shareLinkedInArticleTool: McpTool = {
      name: 'shareLinkedInArticle',
      description: 'Shares an article on LinkedIn with optional commentary text.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s LinkedIn account.',
          },
          url: {
            type: 'string',
            description: 'The URL of the article to share.',
          },
          text: {
            type: 'string',
            description: 'Optional commentary text to accompany the shared article.',
          },
        },
        required: ['accessToken', 'url'],
      },
      execute: async (params: { accessToken: string; url: string; text?: string }) => {
        const { accessToken, url, text } = params;
        const linkedinClient = new LinkedInClient(accessToken);
        return await linkedinClient.shareArticle(url, text || '');
      },
    };

    // Tool: List LinkedIn connections
    const listLinkedInConnectionsTool: McpTool = {
      name: 'listLinkedInConnections',
      description: 'Lists the user\'s LinkedIn connections.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s LinkedIn account.',
          },
        },
        required: ['accessToken'],
      },
      execute: async (params: { accessToken: string }) => {
        const { accessToken } = params;
        const linkedinClient = new LinkedInClient(accessToken);
        return await linkedinClient.listConnections();
      },
    };

    // Resource: Get LinkedIn profile information
    const linkedInProfileResource: McpResource = {
      name: 'getLinkedInProfile',
      description: 'Retrieves the user\'s LinkedIn profile information.',
      fetch: async (params: { accessToken: string }) => {
        const { accessToken } = params;
        const linkedinClient = new LinkedInClient(accessToken);
        return await linkedinClient.getProfileInfo();
      },
    };

    // Register all tools
    this.tools.set(postToLinkedInTool.name, postToLinkedInTool);
    this.tools.set(listLinkedInPostsTool.name, listLinkedInPostsTool);
    this.tools.set(getLinkedInPostLikesTool.name, getLinkedInPostLikesTool);
    this.tools.set(commentOnLinkedInPostTool.name, commentOnLinkedInPostTool);
    this.tools.set(getLinkedInPostCommentsTool.name, getLinkedInPostCommentsTool);
    this.tools.set(shareLinkedInArticleTool.name, shareLinkedInArticleTool);
    this.tools.set(listLinkedInConnectionsTool.name, listLinkedInConnectionsTool);
    
    // Register resource
    this.resources.set(linkedInProfileResource.name, linkedInProfileResource);
  }

  /**
   * Registers Twitter authentication tools.
   */
  private registerTwitterAuthTools() {
    // Tool: Get Twitter OAuth authorization URL with PKCE
    const getTwitterAuthUrlTool: McpTool = {
      name: 'getTwitterAuthUrl',
      description: 'Generates the Twitter/X OAuth 2.0 authorization URL with PKCE to initiate user authentication. Returns a URL that the user must visit in their browser to authorize the application. After authorization, Twitter will redirect to the specified callback URL with an authorization code.',
      inputSchema: {
        type: 'object',
        properties: {
          callbackUrl: {
            type: 'string',
            description: 'The URL where Twitter will redirect after authorization. This must match exactly with the URL registered in your Twitter App settings.',
          },
          state: {
            type: 'string',
            description: 'Optional CSRF protection state parameter. If not provided, a random state will be generated.',
          },
        },
        required: ['callbackUrl'],
      },
      execute: async (params: { callbackUrl: string; state?: string }) => {
        const state = params.state || TwitterOAuthHelper.generateState();
        const codeVerifier = TwitterOAuthHelper.generateCodeVerifier();
        const codeChallenge = TwitterOAuthHelper.generateCodeChallenge(codeVerifier);
        const scope = 'tweet.read tweet.write users.read offline.access';
        
        const authUrl = `https://twitter.com/i/oauth2/authorize?${qs.stringify({
          response_type: 'code',
          client_id: twitterConfig.clientId,
          redirect_uri: params.callbackUrl,
          state,
          scope,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        })}`;

        return {
          authorizationUrl: authUrl,
          state: state,
          codeVerifier: codeVerifier,
          callbackUrl: params.callbackUrl,
          instructions: [
            '1. IMPORTANT: Save the codeVerifier - you will need it for token exchange!',
            '2. Direct the user to open the authorizationUrl in their browser',
            '3. User will authenticate and authorize the application',
            '4. Twitter will redirect to the callbackUrl with a "code" parameter',
            '5. Extract the "code" from the callback URL query parameters',
            '6. Use the exchangeTwitterAuthCode tool with both the code and codeVerifier',
            '7. Use the returned access_token with other Twitter tools',
          ],
        };
      },
    };

    // Tool: Exchange authorization code for access token
    const exchangeTwitterAuthCodeTool: McpTool = {
      name: 'exchangeTwitterAuthCode',
      description: 'Exchanges a Twitter authorization code for an access token using PKCE. This tool performs the server-side token exchange and returns the access_token that can be used with other Twitter tools (postToTwitter, listTwitterTweets, etc.).',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The authorization code received from Twitter OAuth callback',
          },
          codeVerifier: {
            type: 'string',
            description: 'The code verifier that was generated during the authorization URL creation. This must match the verifier used to generate the code challenge.',
          },
          callbackUrl: {
            type: 'string',
            description: 'The same callback URL that was used in the authorization request.',
          },
        },
        required: ['code', 'codeVerifier', 'callbackUrl'],
      },
      execute: async (params: { code: string; codeVerifier: string; callbackUrl: string }) => {
        const getTimer = logger.startTimer();
        
        try {
          logger.info('Twitter Token Exchange Started', undefined, { 
            code: params.code.substring(0, 10) + '...', 
            callbackUrl: params.callbackUrl 
          });
          
          const tokenResponse = await axios.post(
            'https://api.twitter.com/2/oauth2/token',
            qs.stringify({
              grant_type: 'authorization_code',
              code: params.code,
              redirect_uri: params.callbackUrl,
              code_verifier: params.codeVerifier,
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${twitterConfig.clientId}:${twitterConfig.clientSecret}`).toString('base64')}`,
              },
            }
          );

          const { access_token, expires_in, refresh_token, scope, token_type } = tokenResponse.data;
          const duration = getTimer();
          
          logger.info('Twitter Token Exchange Successful', { duration }, { 
            expiresIn: expires_in, 
            hasRefreshToken: !!refresh_token,
            scope,
            tokenType: token_type
          });

          return {
            success: true,
            message: 'Successfully authenticated with Twitter! You can now use the access_token with other Twitter tools.',
            accessToken: access_token,
            tokenType: token_type,
            expiresIn: expires_in,
            refreshToken: refresh_token,
            scope: scope,
            usage: [
              'Use this accessToken with tools like:',
              '- postToTwitter: Create tweets',
              '- replyToTweet: Reply to tweets',
              '- listTwitterTweets: View your recent tweets',
              '- searchTwitter: Search for tweets',
              '- likeTweet: Like tweets',
              '- retweetTweet: Retweet tweets',
              '- getTweetEngagement: Get engagement metrics',
              '- deleteTweet: Delete your tweets',
              '- getUserMentions: Get mentions of you',
            ],
          };
        } catch (error) {
          const duration = getTimer();
          const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
          
          logger.error('Twitter Token Exchange Failed', { duration }, { 
            error: errorMsg,
            code: params.code.substring(0, 10) + '...',
            callbackUrl: params.callbackUrl
          });
          
          if (axios.isAxiosError(error) && error.response) {
            const statusCode = error.response.status;
            const errorData = error.response.data;
            
            if (statusCode === 400) {
              throw new Error(`Twitter OAuth Error: ${errorData.error_description || 'Invalid authorization code, code verifier, or callback URL mismatch.'}`);
            } else if (statusCode === 401) {
              throw new Error('Twitter OAuth Error: Invalid client credentials. Check your Twitter Client ID and Secret.');
            }
          }
          
          throw new Error(`Failed to exchange authorization code for access token: ${errorMsg}`);
        }
      },
    };

    // Tool: Refresh Twitter access token
    const refreshTwitterTokenTool: McpTool = {
      name: 'refreshTwitterToken',
      description: 'Refreshes an expired Twitter access token using a refresh token. This allows you to obtain a new access token without requiring the user to re-authenticate. The refresh token is obtained during the initial OAuth flow when offline.access scope is included.',
      inputSchema: {
        type: 'object',
        properties: {
          refreshToken: {
            type: 'string',
            description: 'The refresh token obtained during initial authentication',
          },
        },
        required: ['refreshToken'],
      },
      execute: async (params: { refreshToken: string }) => {
        const getTimer = logger.startTimer();
        
        try {
          logger.info('Twitter Token Refresh Started', undefined, { 
            refreshToken: params.refreshToken.substring(0, 10) + '...'
          });
          
          const tokenResponse = await axios.post(
            'https://api.twitter.com/2/oauth2/token',
            qs.stringify({
              grant_type: 'refresh_token',
              refresh_token: params.refreshToken,
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${twitterConfig.clientId}:${twitterConfig.clientSecret}`).toString('base64')}`,
              },
            }
          );

          const { access_token, expires_in, refresh_token, scope, token_type } = tokenResponse.data;
          const duration = getTimer();
          
          logger.info('Twitter Token Refresh Successful', { duration }, { 
            expiresIn: expires_in, 
            hasNewRefreshToken: !!refresh_token,
            scope,
            tokenType: token_type
          });

          return {
            success: true,
            message: 'Successfully refreshed Twitter access token! Use the new access_token with Twitter tools.',
            accessToken: access_token,
            tokenType: token_type,
            expiresIn: expires_in,
            refreshToken: refresh_token || params.refreshToken, // Twitter may issue a new refresh token
            scope: scope,
            note: 'Store the new accessToken and refreshToken securely. The old access token is now invalid.',
          };
        } catch (error) {
          const duration = getTimer();
          const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
          
          logger.error('Twitter Token Refresh Failed', { duration }, { 
            error: errorMsg,
            refreshToken: params.refreshToken.substring(0, 10) + '...'
          });
          
          if (axios.isAxiosError(error) && error.response) {
            const statusCode = error.response.status;
            const errorData = error.response.data;
            
            if (statusCode === 400) {
              throw new Error(`Twitter Token Refresh Error: ${errorData.error_description || 'Invalid refresh token. You may need to re-authenticate.'}`);
            } else if (statusCode === 401) {
              throw new Error('Twitter Token Refresh Error: Invalid client credentials or refresh token has been revoked. Re-authentication required.');
            }
          }
          
          throw new Error(`Failed to refresh access token: ${errorMsg}. You may need to re-authenticate.`);
        }
      },
    };

    this.tools.set(getTwitterAuthUrlTool.name, getTwitterAuthUrlTool);
    this.tools.set(exchangeTwitterAuthCodeTool.name, exchangeTwitterAuthCodeTool);
    this.tools.set(refreshTwitterTokenTool.name, refreshTwitterTokenTool);
  }

  /**
   * Registers the tools and resources related to Twitter.
   */
  private registerTwitterTools() {
    // Tool: Create a new tweet
    const postToTwitterTool: McpTool = {
      name: 'postToTwitter',
      description: 'Creates a new tweet on Twitter/X (max 280 characters).',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Twitter account.',
          },
          content: {
            type: 'string',
            description: 'The text content of the tweet (max 280 characters).',
          },
        },
        required: ['accessToken', 'content'],
      },
      execute: async (params: { accessToken: string; content: string }) => {
        const { accessToken, content } = params;
        const twitterClient = new TwitterClient(accessToken);
        return await twitterClient.createTweet(content);
      },
    };

    // Tool: Reply to a tweet
    const replyToTweetTool: McpTool = {
      name: 'replyToTweet',
      description: 'Replies to an existing tweet on Twitter/X.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Twitter account.',
          },
          tweetId: {
            type: 'string',
            description: 'The ID of the tweet to reply to.',
          },
          content: {
            type: 'string',
            description: 'The text content of the reply (max 280 characters).',
          },
        },
        required: ['accessToken', 'tweetId', 'content'],
      },
      execute: async (params: { accessToken: string; tweetId: string; content: string }) => {
        const { accessToken, tweetId, content } = params;
        const twitterClient = new TwitterClient(accessToken);
        return await twitterClient.replyToTweet(tweetId, content);
      },
    };

    // Tool: List user's recent tweets
    const listTwitterTweetsTool: McpTool = {
      name: 'listTwitterTweets',
      description: 'Lists the authenticated user\'s recent tweets.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Twitter account.',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of tweets to retrieve (default: 10, max: 100).',
          },
        },
        required: ['accessToken'],
      },
      execute: async (params: { accessToken: string; maxResults?: number }) => {
        const { accessToken, maxResults } = params;
        const twitterClient = new TwitterClient(accessToken);
        return await twitterClient.getUserTweets(maxResults);
      },
    };

    // Tool: Search tweets
    const searchTwitterTool: McpTool = {
      name: 'searchTwitter',
      description: 'Searches for tweets matching a query on Twitter/X.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Twitter account.',
          },
          query: {
            type: 'string',
            description: 'The search query string.',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results (default: 10, max: 100).',
          },
        },
        required: ['accessToken', 'query'],
      },
      execute: async (params: { accessToken: string; query: string; maxResults?: number }) => {
        const { accessToken, query, maxResults } = params;
        const twitterClient = new TwitterClient(accessToken);
        return await twitterClient.searchTweets(query, maxResults);
      },
    };

    // Tool: Like a tweet
    const likeTweetTool: McpTool = {
      name: 'likeTweet',
      description: 'Likes a tweet on Twitter/X.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Twitter account.',
          },
          tweetId: {
            type: 'string',
            description: 'The ID of the tweet to like.',
          },
        },
        required: ['accessToken', 'tweetId'],
      },
      execute: async (params: { accessToken: string; tweetId: string }) => {
        const { accessToken, tweetId } = params;
        const twitterClient = new TwitterClient(accessToken);
        return await twitterClient.likeTweet(tweetId);
      },
    };

    // Tool: Retweet a tweet
    const retweetTweetTool: McpTool = {
      name: 'retweetTweet',
      description: 'Retweets a tweet on Twitter/X.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Twitter account.',
          },
          tweetId: {
            type: 'string',
            description: 'The ID of the tweet to retweet.',
          },
        },
        required: ['accessToken', 'tweetId'],
      },
      execute: async (params: { accessToken: string; tweetId: string }) => {
        const { accessToken, tweetId } = params;
        const twitterClient = new TwitterClient(accessToken);
        return await twitterClient.retweetTweet(tweetId);
      },
    };

    // Tool: Get tweet engagement metrics
    const getTweetEngagementTool: McpTool = {
      name: 'getTweetEngagement',
      description: 'Gets engagement metrics (likes, retweets, replies) for a specific tweet.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Twitter account.',
          },
          tweetId: {
            type: 'string',
            description: 'The ID of the tweet to get metrics for.',
          },
        },
        required: ['accessToken', 'tweetId'],
      },
      execute: async (params: { accessToken: string; tweetId: string }) => {
        const { accessToken, tweetId } = params;
        const twitterClient = new TwitterClient(accessToken);
        return await twitterClient.getTweetEngagement(tweetId);
      },
    };

    // Tool: Delete a tweet
    const deleteTweetTool: McpTool = {
      name: 'deleteTweet',
      description: 'Deletes a tweet owned by the authenticated user.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Twitter account.',
          },
          tweetId: {
            type: 'string',
            description: 'The ID of the tweet to delete.',
          },
        },
        required: ['accessToken', 'tweetId'],
      },
      execute: async (params: { accessToken: string; tweetId: string }) => {
        const { accessToken, tweetId } = params;
        const twitterClient = new TwitterClient(accessToken);
        return await twitterClient.deleteTweet(tweetId);
      },
    };

    // Tool: Get user mentions
    const getUserMentionsTool: McpTool = {
      name: 'getUserMentions',
      description: 'Gets tweets mentioning the authenticated user.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Twitter account.',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of mentions to retrieve (default: 10, max: 100).',
          },
        },
        required: ['accessToken'],
      },
      execute: async (params: { accessToken: string; maxResults?: number }) => {
        const { accessToken, maxResults } = params;
        const twitterClient = new TwitterClient(accessToken);
        return await twitterClient.getUserMentions(maxResults);
      },
    };

    // Resource: Get Twitter profile information
    const twitterProfileResource: McpResource = {
      name: 'getTwitterProfile',
      description: 'Retrieves the authenticated user\'s Twitter profile information.',
      fetch: async (params: { accessToken: string }) => {
        const { accessToken } = params;
        const twitterClient = new TwitterClient(accessToken);
        return await twitterClient.getUserProfile();
      },
    };

    // Register all tools
    this.tools.set(postToTwitterTool.name, postToTwitterTool);
    this.tools.set(replyToTweetTool.name, replyToTweetTool);
    this.tools.set(listTwitterTweetsTool.name, listTwitterTweetsTool);
    this.tools.set(searchTwitterTool.name, searchTwitterTool);
    this.tools.set(likeTweetTool.name, likeTweetTool);
    this.tools.set(retweetTweetTool.name, retweetTweetTool);
    this.tools.set(getTweetEngagementTool.name, getTweetEngagementTool);
    this.tools.set(deleteTweetTool.name, deleteTweetTool);
    this.tools.set(getUserMentionsTool.name, getUserMentionsTool);

    // Register resource
    this.resources.set(twitterProfileResource.name, twitterProfileResource);
  }

  /**
   * Registers Facebook authentication tools.
   */
  private registerFacebookAuthTools() {
    // Tool: Get Facebook OAuth authorization URL
    const getFacebookAuthUrlTool: McpTool = {
      name: 'getFacebookAuthUrl',
      description: 'Generates the Facebook OAuth 2.0 authorization URL to initiate user authentication. Returns a URL that the user must visit in their browser to authorize the application. After authorization, Facebook will redirect to the specified callback URL with an authorization code.',
      inputSchema: {
        type: 'object',
        properties: {
          callbackUrl: {
            type: 'string',
            description: 'The URL where Facebook will redirect after authorization. This must match exactly with the URL registered in your Facebook App settings.',
          },
          state: {
            type: 'string',
            description: 'Optional CSRF protection state parameter. If not provided, a random state will be generated.',
          },
          scope: {
            type: 'string',
            description: 'Optional permissions scope. Default: "public_profile,email,pages_manage_posts,pages_read_engagement"',
          },
        },
        required: ['callbackUrl'],
      },
      execute: async (params: { callbackUrl: string; state?: string; scope?: string }) => {
        const state = params.state || FacebookOAuthHelper.generateState();
        const scope = params.scope || 'public_profile,email,pages_manage_posts,pages_read_engagement';
        
        const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${qs.stringify({
          client_id: facebookConfig.appId,
          redirect_uri: params.callbackUrl,
          state,
          scope,
          response_type: 'code',
        })}`;

        return {
          authorizationUrl: authUrl,
          state: state,
          callbackUrl: params.callbackUrl,
          instructions: [
            '1. Direct the user to open the authorizationUrl in their browser',
            '2. User will authenticate and authorize the application',
            '3. Facebook will redirect to the callbackUrl with a "code" parameter',
            '4. Extract the "code" from the callback URL query parameters',
            '5. Use the exchangeFacebookAuthCode tool with the code to receive an access_token',
            '6. Use the returned access_token with other Facebook tools',
          ],
        };
      },
    };

    // Tool: Exchange authorization code for access token
    const exchangeFacebookAuthCodeTool: McpTool = {
      name: 'exchangeFacebookAuthCode',
      description: 'Exchanges a Facebook authorization code for an access token. This tool performs the server-side token exchange and returns the access_token that can be used with other Facebook tools.',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The authorization code received from Facebook OAuth callback',
          },
          callbackUrl: {
            type: 'string',
            description: 'The same callback URL that was used in the authorization request.',
          },
        },
        required: ['code', 'callbackUrl'],
      },
      execute: async (params: { code: string; callbackUrl: string }) => {
        const getTimer = logger.startTimer();
        
        try {
          logger.info('Facebook Token Exchange Started', undefined, { 
            code: params.code.substring(0, 10) + '...', 
            callbackUrl: params.callbackUrl 
          });
          
          const tokenResponse = await axios.get(
            'https://graph.facebook.com/v19.0/oauth/access_token',
            {
              params: {
                client_id: facebookConfig.appId,
                client_secret: facebookConfig.appSecret,
                redirect_uri: params.callbackUrl,
                code: params.code,
              },
            }
          );

          const { access_token, token_type, expires_in } = tokenResponse.data;
          const duration = getTimer();
          
          logger.info('Facebook Token Exchange Successful', { duration }, { 
            expiresIn: expires_in,
            tokenType: token_type
          });

          return {
            success: true,
            message: 'Successfully authenticated with Facebook! You can now use the access_token with other Facebook tools.',
            accessToken: access_token,
            tokenType: token_type,
            expiresIn: expires_in,
            usage: [
              'Use this accessToken with tools like:',
              '- postToFacebook: Create posts on Facebook',
              '- listFacebookPosts: View your recent posts',
              '- getFacebookPostLikes: Get engagement metrics',
              '- commentOnFacebookPost: Engage with content',
              '- uploadFacebookPhoto: Upload photos',
              '- shareFacebookLink: Share links',
              '- likeFacebookPost: Like posts',
              '- deleteFacebookPost: Delete your posts',
            ],
          };
        } catch (error) {
          const duration = getTimer();
          const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
          
          logger.error('Facebook Token Exchange Failed', { duration }, { 
            error: errorMsg,
            code: params.code.substring(0, 10) + '...',
            callbackUrl: params.callbackUrl
          });
          
          if (axios.isAxiosError(error) && error.response) {
            const statusCode = error.response.status;
            const errorData = error.response.data;
            
            if (statusCode === 400) {
              throw new Error(`Facebook OAuth Error: ${errorData.error?.message || 'Invalid authorization code or callback URL mismatch.'}`);
            } else if (statusCode === 401) {
              throw new Error('Facebook OAuth Error: Invalid client credentials. Check your Facebook App ID and Secret.');
            }
          }
          
          throw new Error(`Failed to exchange authorization code for access token: ${errorMsg}`);
        }
      },
    };

    this.tools.set(getFacebookAuthUrlTool.name, getFacebookAuthUrlTool);
    this.tools.set(exchangeFacebookAuthCodeTool.name, exchangeFacebookAuthCodeTool);
  }

  /**
   * Registers the tools and resources related to Facebook.
   */
  private registerFacebookTools() {
    // Tool: Create a new post on Facebook
    const postToFacebookTool: McpTool = {
      name: 'postToFacebook',
      description: 'Creates a new text-based post on Facebook.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Facebook account.',
          },
          content: {
            type: 'string',
            description: 'The text content of the post.',
          },
        },
        required: ['accessToken', 'content'],
      },
      execute: async (params: { accessToken: string; content: string }) => {
        const { accessToken, content } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.createPost(content);
      },
    };

    // Tool: List recent Facebook posts
    const listFacebookPostsTool: McpTool = {
      name: 'listFacebookPosts',
      description: 'Lists the user\'s recent Facebook posts.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Facebook account.',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of posts to retrieve (default: 5).',
          },
        },
        required: ['accessToken'],
      },
      execute: async (params: { accessToken: string; maxResults?: number }) => {
        const { accessToken, maxResults } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.listLast5Posts(maxResults);
      },
    };

    // Tool: Get likes for a Facebook post
    const getFacebookPostLikesTool: McpTool = {
      name: 'getFacebookPostLikes',
      description: 'Gets the likes for a specific Facebook post.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Facebook account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to get likes for.',
          },
        },
        required: ['accessToken', 'postId'],
      },
      execute: async (params: { accessToken: string; postId: string }) => {
        const { accessToken, postId } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.getLikesForPost(postId);
      },
    };

    // Tool: Comment on a Facebook post
    const commentOnFacebookPostTool: McpTool = {
      name: 'commentOnFacebookPost',
      description: 'Adds a comment to a specific Facebook post.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Facebook account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to comment on.',
          },
          comment: {
            type: 'string',
            description: 'The text content of the comment.',
          },
        },
        required: ['accessToken', 'postId', 'comment'],
      },
      execute: async (params: { accessToken: string; postId: string; comment: string }) => {
        const { accessToken, postId, comment } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.commentOnPost(postId, comment);
      },
    };

    // Tool: Get comments for a Facebook post
    const getFacebookPostCommentsTool: McpTool = {
      name: 'getFacebookPostComments',
      description: 'Gets the comments for a specific Facebook post.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Facebook account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to get comments for.',
          },
        },
        required: ['accessToken', 'postId'],
      },
      execute: async (params: { accessToken: string; postId: string }) => {
        const { accessToken, postId } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.getPostComments(postId);
      },
    };

    // Tool: Upload a photo to Facebook
    const uploadFacebookPhotoTool: McpTool = {
      name: 'uploadFacebookPhoto',
      description: 'Uploads a photo to Facebook with an optional caption.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Facebook account.',
          },
          imageUrl: {
            type: 'string',
            description: 'The URL of the image to upload.',
          },
          caption: {
            type: 'string',
            description: 'Optional caption for the photo.',
          },
        },
        required: ['accessToken', 'imageUrl'],
      },
      execute: async (params: { accessToken: string; imageUrl: string; caption?: string }) => {
        const { accessToken, imageUrl, caption } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.uploadPhoto(imageUrl, caption || '');
      },
    };

    // Tool: Like a Facebook post
    const likeFacebookPostTool: McpTool = {
      name: 'likeFacebookPost',
      description: 'Likes a post on Facebook.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Facebook account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to like.',
          },
        },
        required: ['accessToken', 'postId'],
      },
      execute: async (params: { accessToken: string; postId: string }) => {
        const { accessToken, postId } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.likePost(postId);
      },
    };

    // Tool: Share a link on Facebook
    const shareFacebookLinkTool: McpTool = {
      name: 'shareFacebookLink',
      description: 'Shares a link on Facebook with optional message.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Facebook account.',
          },
          link: {
            type: 'string',
            description: 'The URL to share.',
          },
          message: {
            type: 'string',
            description: 'Optional message to accompany the link.',
          },
        },
        required: ['accessToken', 'link'],
      },
      execute: async (params: { accessToken: string; link: string; message?: string }) => {
        const { accessToken, link, message } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.shareLink(link, message || '');
      },
    };

    // Tool: Delete a Facebook post
    const deleteFacebookPostTool: McpTool = {
      name: 'deleteFacebookPost',
      description: 'Deletes a post owned by the authenticated user.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Facebook account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to delete.',
          },
        },
        required: ['accessToken', 'postId'],
      },
      execute: async (params: { accessToken: string; postId: string }) => {
        const { accessToken, postId } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.deletePost(postId);
      },
    };

    // Tool: Get Facebook page info
    const getFacebookPageInfoTool: McpTool = {
      name: 'getFacebookPageInfo',
      description: 'Gets information about Facebook pages the user manages.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Facebook account.',
          },
        },
        required: ['accessToken'],
      },
      execute: async (params: { accessToken: string }) => {
        const { accessToken } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.getPageInfo();
      },
    };

    // Tool: Get Facebook friends
    const getFacebookFriendsTool: McpTool = {
      name: 'getFacebookFriends',
      description: 'Gets the user\'s Facebook friends list (limited by privacy settings).',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Facebook account.',
          },
        },
        required: ['accessToken'],
      },
      execute: async (params: { accessToken: string }) => {
        const { accessToken } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.getUserFriends();
      },
    };

    // Resource: Get Facebook profile information
    const facebookProfileResource: McpResource = {
      name: 'getFacebookProfile',
      description: 'Retrieves the user\'s Facebook profile information.',
      fetch: async (params: { accessToken: string }) => {
        const { accessToken } = params;
        const facebookClient = new FacebookClient(accessToken);
        return await facebookClient.getUserProfile();
      },
    };

    // Register all tools
    this.tools.set(postToFacebookTool.name, postToFacebookTool);
    this.tools.set(listFacebookPostsTool.name, listFacebookPostsTool);
    this.tools.set(getFacebookPostLikesTool.name, getFacebookPostLikesTool);
    this.tools.set(commentOnFacebookPostTool.name, commentOnFacebookPostTool);
    this.tools.set(getFacebookPostCommentsTool.name, getFacebookPostCommentsTool);
    this.tools.set(uploadFacebookPhotoTool.name, uploadFacebookPhotoTool);
    this.tools.set(likeFacebookPostTool.name, likeFacebookPostTool);
    this.tools.set(shareFacebookLinkTool.name, shareFacebookLinkTool);
    this.tools.set(deleteFacebookPostTool.name, deleteFacebookPostTool);
    this.tools.set(getFacebookPageInfoTool.name, getFacebookPageInfoTool);
    this.tools.set(getFacebookFriendsTool.name, getFacebookFriendsTool);
    
    // Register resource
    this.resources.set(facebookProfileResource.name, facebookProfileResource);
  }

  /**
   * Registers Instagram authentication tools.
   */
  private registerInstagramAuthTools() {
    // Tool: Get Instagram OAuth authorization URL
    const getInstagramAuthUrlTool: McpTool = {
      name: 'getInstagramAuthUrl',
      description: 'Generates the Instagram OAuth 2.0 authorization URL to initiate user authentication. Returns a URL that the user must visit in their browser to authorize the application. After authorization, Instagram will redirect to the specified callback URL with an authorization code. Note: Instagram requires a Business or Creator account.',
      inputSchema: {
        type: 'object',
        properties: {
          callbackUrl: {
            type: 'string',
            description: 'The URL where Instagram will redirect after authorization. This must match exactly with the URL registered in your Facebook/Instagram App settings.',
          },
          state: {
            type: 'string',
            description: 'Optional CSRF protection state parameter. If not provided, a random state will be generated.',
          },
          scope: {
            type: 'string',
            description: 'Optional permissions scope. Default: "user_profile,user_media"',
          },
        },
        required: ['callbackUrl'],
      },
      execute: async (params: { callbackUrl: string; state?: string; scope?: string }) => {
        const state = params.state || InstagramOAuthHelper.generateState();
        const scope = params.scope || 'user_profile,user_media';
        
        const authUrl = `https://api.instagram.com/oauth/authorize?${qs.stringify({
          client_id: instagramConfig.appId,
          redirect_uri: params.callbackUrl,
          scope,
          response_type: 'code',
          state,
        })}`;

        return {
          authorizationUrl: authUrl,
          state: state,
          callbackUrl: params.callbackUrl,
          instructions: [
            '1. Direct the user to open the authorizationUrl in their browser',
            '2. User will authenticate and authorize the application (requires Business/Creator account)',
            '3. Instagram will redirect to the callbackUrl with a "code" parameter',
            '4. Extract the "code" from the callback URL query parameters',
            '5. Use the exchangeInstagramAuthCode tool with the code to receive an access_token',
            '6. Use the returned access_token with other Instagram tools',
          ],
          note: 'Instagram Basic Display API requires a Business or Creator account for full functionality.',
        };
      },
    };

    // Tool: Exchange authorization code for access token
    const exchangeInstagramAuthCodeTool: McpTool = {
      name: 'exchangeInstagramAuthCode',
      description: 'Exchanges an Instagram authorization code for an access token. This tool performs the server-side token exchange and returns the access_token that can be used with other Instagram tools.',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The authorization code received from Instagram OAuth callback',
          },
          callbackUrl: {
            type: 'string',
            description: 'The same callback URL that was used in the authorization request.',
          },
        },
        required: ['code', 'callbackUrl'],
      },
      execute: async (params: { code: string; callbackUrl: string }) => {
        const getTimer = logger.startTimer();
        
        try {
          logger.info('Instagram Token Exchange Started', undefined, { 
            code: params.code.substring(0, 10) + '...', 
            callbackUrl: params.callbackUrl 
          });
          
          const tokenResponse = await axios.post(
            'https://api.instagram.com/oauth/access_token',
            qs.stringify({
              client_id: instagramConfig.appId,
              client_secret: instagramConfig.appSecret,
              grant_type: 'authorization_code',
              redirect_uri: params.callbackUrl,
              code: params.code,
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );

          const { access_token, user_id } = tokenResponse.data;
          const duration = getTimer();
          
          logger.info('Instagram Token Exchange Successful', { duration }, { 
            userId: user_id
          });

          return {
            success: true,
            message: 'Successfully authenticated with Instagram! You can now use the access_token with other Instagram tools.',
            accessToken: access_token,
            userId: user_id,
            usage: [
              'Use this accessToken with tools like:',
              '- postToInstagram: Create posts on Instagram',
              '- listInstagramPosts: View your recent posts',
              '- getInstagramPostLikes: Get engagement metrics',
              '- commentOnInstagramPost: Engage with content',
              '- getInstagramFollowers: Get followers count',
              '- getInstagramFollowing: Get following count',
              '- getInstagramPostInsights: Get post analytics (Business accounts)',
              '- getInstagramAccountInsights: Get account analytics (Business accounts)',
            ],
            note: 'For Business accounts, you can access additional insights and analytics features.',
          };
        } catch (error) {
          const duration = getTimer();
          const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
          
          logger.error('Instagram Token Exchange Failed', { duration }, { 
            error: errorMsg,
            code: params.code.substring(0, 10) + '...',
            callbackUrl: params.callbackUrl
          });
          
          if (axios.isAxiosError(error) && error.response) {
            const statusCode = error.response.status;
            const errorData = error.response.data;
            
            if (statusCode === 400) {
              throw new Error(`Instagram OAuth Error: ${errorData.error_message || 'Invalid authorization code or callback URL mismatch.'}`);
            } else if (statusCode === 401) {
              throw new Error('Instagram OAuth Error: Invalid client credentials. Check your Instagram App ID and Secret.');
            }
          }
          
          throw new Error(`Failed to exchange authorization code for access token: ${errorMsg}`);
        }
      },
    };

    this.tools.set(getInstagramAuthUrlTool.name, getInstagramAuthUrlTool);
    this.tools.set(exchangeInstagramAuthCodeTool.name, exchangeInstagramAuthCodeTool);
  }

  /**
   * Registers the tools and resources related to Instagram.
   */
  private registerInstagramTools() {
    // Tool: Create a new post on Instagram
    const postToInstagramTool: McpTool = {
      name: 'postToInstagram',
      description: 'Creates a new post on Instagram with an image and caption (two-step process).',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Instagram account.',
          },
          imageUrl: {
            type: 'string',
            description: 'The URL of the image to post (must be publicly accessible).',
          },
          caption: {
            type: 'string',
            description: 'The caption for the post.',
          },
        },
        required: ['accessToken', 'imageUrl', 'caption'],
      },
      execute: async (params: { accessToken: string; imageUrl: string; caption: string }) => {
        const { accessToken, imageUrl, caption } = params;
        const instagramClient = new InstagramClient(accessToken);
        return await instagramClient.createPost(imageUrl, caption);
      },
    };

    // Tool: List recent Instagram posts
    const listInstagramPostsTool: McpTool = {
      name: 'listInstagramPosts',
      description: 'Lists the user\'s recent Instagram posts.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Instagram account.',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of posts to retrieve (default: 5).',
          },
        },
        required: ['accessToken'],
      },
      execute: async (params: { accessToken: string; maxResults?: number }) => {
        const { accessToken, maxResults } = params;
        const instagramClient = new InstagramClient(accessToken);
        return await instagramClient.listLast5Posts(maxResults);
      },
    };

    // Tool: Get likes for an Instagram post
    const getInstagramPostLikesTool: McpTool = {
      name: 'getInstagramPostLikes',
      description: 'Gets the likes count for a specific Instagram post.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Instagram account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to get likes for.',
          },
        },
        required: ['accessToken', 'postId'],
      },
      execute: async (params: { accessToken: string; postId: string }) => {
        const { accessToken, postId } = params;
        const instagramClient = new InstagramClient(accessToken);
        return await instagramClient.getLikesForPost(postId);
      },
    };

    // Tool: Comment on an Instagram post
    const commentOnInstagramPostTool: McpTool = {
      name: 'commentOnInstagramPost',
      description: 'Adds a comment to a specific Instagram post.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Instagram account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to comment on.',
          },
          comment: {
            type: 'string',
            description: 'The text content of the comment.',
          },
        },
        required: ['accessToken', 'postId', 'comment'],
      },
      execute: async (params: { accessToken: string; postId: string; comment: string }) => {
        const { accessToken, postId, comment } = params;
        const instagramClient = new InstagramClient(accessToken);
        return await instagramClient.commentOnPost(postId, comment);
      },
    };

    // Tool: Get comments for an Instagram post
    const getInstagramPostCommentsTool: McpTool = {
      name: 'getInstagramPostComments',
      description: 'Gets the comments for a specific Instagram post.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Instagram account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to get comments for.',
          },
        },
        required: ['accessToken', 'postId'],
      },
      execute: async (params: { accessToken: string; postId: string }) => {
        const { accessToken, postId } = params;
        const instagramClient = new InstagramClient(accessToken);
        return await instagramClient.getPostComments(postId);
      },
    };

    // Tool: Get Instagram followers count
    const getInstagramFollowersTool: McpTool = {
      name: 'getInstagramFollowers',
      description: 'Gets the user\'s Instagram followers count.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Instagram account.',
          },
        },
        required: ['accessToken'],
      },
      execute: async (params: { accessToken: string }) => {
        const { accessToken } = params;
        const instagramClient = new InstagramClient(accessToken);
        return await instagramClient.getFollowers();
      },
    };

    // Tool: Get Instagram following count
    const getInstagramFollowingTool: McpTool = {
      name: 'getInstagramFollowing',
      description: 'Gets the user\'s Instagram following count.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Instagram account.',
          },
        },
        required: ['accessToken'],
      },
      execute: async (params: { accessToken: string }) => {
        const { accessToken } = params;
        const instagramClient = new InstagramClient(accessToken);
        return await instagramClient.getFollowing();
      },
    };

    // Tool: Get Instagram post insights
    const getInstagramPostInsightsTool: McpTool = {
      name: 'getInstagramPostInsights',
      description: 'Gets insights (analytics) for a specific Instagram post. Requires Instagram Business account.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Instagram account.',
          },
          postId: {
            type: 'string',
            description: 'The ID of the post to get insights for.',
          },
        },
        required: ['accessToken', 'postId'],
      },
      execute: async (params: { accessToken: string; postId: string }) => {
        const { accessToken, postId } = params;
        const instagramClient = new InstagramClient(accessToken);
        return await instagramClient.getPostInsights(postId);
      },
    };

    // Tool: Get Instagram account insights
    const getInstagramAccountInsightsTool: McpTool = {
      name: 'getInstagramAccountInsights',
      description: 'Gets account insights (analytics) for the user. Requires Instagram Business account.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Instagram account.',
          },
          metric: {
            type: 'string',
            description: 'Optional metrics to retrieve (default: "impressions,reach,profile_views").',
          },
          period: {
            type: 'string',
            description: 'Optional time period: "day", "week", "days_28", or "lifetime" (default: "day").',
          },
        },
        required: ['accessToken'],
      },
      execute: async (params: { accessToken: string; metric?: string; period?: string }) => {
        const { accessToken, metric, period } = params;
        const instagramClient = new InstagramClient(accessToken);
        return await instagramClient.getAccountInsights(metric, period);
      },
    };

    // Tool: Reply to a comment on Instagram
    const replyToInstagramCommentTool: McpTool = {
      name: 'replyToInstagramComment',
      description: 'Replies to a comment on an Instagram post.',
      inputSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'The OAuth 2.0 access token for the user\'s Instagram account.',
          },
          commentId: {
            type: 'string',
            description: 'The ID of the comment to reply to.',
          },
          message: {
            type: 'string',
            description: 'The reply text.',
          },
        },
        required: ['accessToken', 'commentId', 'message'],
      },
      execute: async (params: { accessToken: string; commentId: string; message: string }) => {
        const { accessToken, commentId, message } = params;
        const instagramClient = new InstagramClient(accessToken);
        return await instagramClient.replyToComment(commentId, message);
      },
    };

    // Resource: Get Instagram profile information
    const instagramProfileResource: McpResource = {
      name: 'getInstagramProfile',
      description: 'Retrieves the user\'s Instagram profile information.',
      fetch: async (params: { accessToken: string }) => {
        const { accessToken } = params;
        const instagramClient = new InstagramClient(accessToken);
        return await instagramClient.getUserProfile();
      },
    };

    // Register all tools
    this.tools.set(postToInstagramTool.name, postToInstagramTool);
    this.tools.set(listInstagramPostsTool.name, listInstagramPostsTool);
    this.tools.set(getInstagramPostLikesTool.name, getInstagramPostLikesTool);
    this.tools.set(commentOnInstagramPostTool.name, commentOnInstagramPostTool);
    this.tools.set(getInstagramPostCommentsTool.name, getInstagramPostCommentsTool);
    this.tools.set(getInstagramFollowersTool.name, getInstagramFollowersTool);
    this.tools.set(getInstagramFollowingTool.name, getInstagramFollowingTool);
    this.tools.set(getInstagramPostInsightsTool.name, getInstagramPostInsightsTool);
    this.tools.set(getInstagramAccountInsightsTool.name, getInstagramAccountInsightsTool);
    this.tools.set(replyToInstagramCommentTool.name, replyToInstagramCommentTool);
    
    // Register resource
    this.resources.set(instagramProfileResource.name, instagramProfileResource);
  }

  /**
   * Registers the tools related to the OpenAI API.
   */
  private registerOpenAITools() {
    const generateCaptionTool: McpTool = {
      name: 'generateCaption',
      description: 'Generates a post caption using the OpenAI API.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The prompt to use for generating the caption.',
          },
        },
        required: ['prompt'],
      },
      execute: async (params: { prompt: string }) => {
        return await this.openaiClient.generateCaption(params.prompt);
      },
    };

    const getSchedulingSuggestionTool: McpTool = {
      name: 'getSchedulingSuggestion',
      description: 'Suggests the best time to post on social media for maximum engagement.',
      inputSchema: {
        type: 'object',
        properties: {
          postContent: {
            type: 'string',
            description: 'The content of the post to be scheduled.',
          },
        },
        required: ['postContent'],
      },
      execute: async (params: { postContent: string }) => {
        return await this.openaiClient.getSchedulingSuggestion(params.postContent);
      },
    };

    this.tools.set(generateCaptionTool.name, generateCaptionTool);
    this.tools.set(getSchedulingSuggestionTool.name, getSchedulingSuggestionTool);
  }

  /**
   * Retrieves a list of all available tools.
   * @returns An array of available tools.
   */
  getTools(): McpTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Retrieves a list of all available resources.
   * @returns An array of available resources.
   */
  getResources(): McpResource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Executes a tool with the given parameters.
   * @param toolName - The name of the tool to execute.
   * @param params - The parameters for the tool.
   * @returns The result of the tool's execution.
   */
  async executeTool(toolName: string, params: unknown): Promise<unknown> {
    const getTimer = logger.startTimer();
    
    // Log tool execution start
    logger.logToolExecution(toolName, params);
    
    const tool = this.tools.get(toolName);
    if (!tool) {
      const duration = getTimer();
      logger.logToolResult(toolName, false, null, `Tool "${toolName}" not found`, duration);
      throw new Error(`Tool "${toolName}" not found.`);
    }
    
    // Simple validation, should be more robust in a real application
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requiredParams = (tool.inputSchema as any).required || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const param of requiredParams) {
      if (!(params as object).hasOwnProperty(param)) {
        const duration = getTimer();
        const errorMsg = `Missing required parameter "${param}" for tool "${toolName}"`;
        logger.logToolResult(toolName, false, null, errorMsg, duration);
        throw new Error(errorMsg);
      }
    }

    try {
      const result = await tool.execute(params);
      const duration = getTimer();
      logger.logToolResult(toolName, true, result, undefined, duration);
      return result;
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.logToolResult(toolName, false, null, errorMsg, duration);
      throw error;
    }
  }

  /**
   * Fetches a resource with the given parameters.
   * @param resourceName - The name of the resource to fetch.
   * @param params - The parameters for the resource.
   * @returns The result of the resource fetch.
   */
  async fetchResource(resourceName: string, params: unknown = {}): Promise<unknown> {
    const getTimer = logger.startTimer();
    
    // Log resource fetch start
    logger.info(`Resource Fetch Started: ${resourceName}`, { resourceName }, { params });
    
    const resource = this.resources.get(resourceName);
    if (!resource) {
      const duration = getTimer();
      logger.error(`Resource Fetch Failed: ${resourceName}`, { resourceName, duration }, { error: `Resource "${resourceName}" not found` });
      throw new Error(`Resource "${resourceName}" not found.`);
    }
    
    try {
      const result = await resource.fetch(params);
      const duration = getTimer();
      logger.info(`Resource Fetch Completed: ${resourceName}`, { resourceName, duration }, { result });
      return result;
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error(`Resource Fetch Error: ${resourceName}`, { resourceName, duration }, { error: errorMsg });
      throw error;
    }
  }

  /**
   * Retrieves server information including version and capabilities.
   * @returns Server metadata.
   */
  getServerInfo(): McpServerInfo {
    return this.serverInfo;
  }
}
