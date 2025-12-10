import { LinkedInClient } from './core/linkedin-client';
import { OpenAIClient } from './core/openai-client';
import { FacebookClient } from './core/facebook-client';
import { InstagramClient } from './core/instagram-client';
import { linkedinConfig } from './config';
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
  private facebookClient: FacebookClient;
  private instagramClient: InstagramClient;
  
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
    this.facebookClient = new FacebookClient();
    this.instagramClient = new InstagramClient();
    this.registerLinkedInAuthTools();
    this.registerLinkedInTools();
    this.registerFacebookTools();
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
   * Registers the tools and resources related to Facebook.
   */
  private registerFacebookTools() {
    const postToFacebookTool: McpTool = {
      name: 'postToFacebook',
      description: 'Creates a new post on Facebook.',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The text content of the post.' },
        },
        required: ['content'],
      },
      execute: async (params: { content: string }) => {
        return await this.facebookClient.createPost(params.content);
      },
    };

    const facebookPageResource: McpResource = {
      name: 'getFacebookPageInfo',
      description: 'Retrieves information about the Facebook page.',
      fetch: async () => {
        return await this.facebookClient.getPageInfo();
      },
    };

    this.tools.set(postToFacebookTool.name, postToFacebookTool);
    this.resources.set(facebookPageResource.name, facebookPageResource);
  }

  /**
   * Registers the tools and resources related to Instagram.
   */
  private registerInstagramTools() {
    const postToInstagramTool: McpTool = {
      name: 'postToInstagram',
      description: 'Creates a new post on Instagram.',
      inputSchema: {
        type: 'object',
        properties: {
          imageUrl: { type: 'string', description: 'The URL of the image to post.' },
          caption: { type: 'string', description: 'The caption for the post.' },
        },
        required: ['imageUrl', 'caption'],
      },
      execute: async (params: { imageUrl: string; caption: string }) => {
        return await this.instagramClient.createPost(params.imageUrl, params.caption);
      },
    };

    const instagramProfileResource: McpResource = {
      name: 'getInstagramProfile',
      description: 'Retrieves the user\'s Instagram profile information.',
      fetch: async () => {
        return await this.instagramClient.getUserProfile();
      },
    };

    this.tools.set(postToInstagramTool.name, postToInstagramTool);
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
