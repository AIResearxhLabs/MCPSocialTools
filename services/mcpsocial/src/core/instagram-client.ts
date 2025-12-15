import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/**
 * A client for interacting with the Instagram Graph API.
 * Implements OAuth 2.0 for authentication.
 * An access token is required for all operations and should be provided by the user's session.
 * Note: Instagram API requires a Business or Creator account.
 */
export class InstagramClient {
  private apiClient: AxiosInstance;

  /**
   * Creates an instance of InstagramClient.
   * @param accessToken - The user's OAuth 2.0 access token.
   */
  constructor(private accessToken: string) {
    if (!accessToken) {
      throw new Error('Instagram API access token is required.');
    }
    this.apiClient = axios.create({
      baseURL: 'https://graph.instagram.com',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Retrieves the authenticated user's profile information.
   * @returns The user's profile data including id, username, account type, etc.
   */
  async getUserProfile() {
    const getTimer = logger.startTimer();
    const endpoint = '/me';
    
    logger.logApiCall('Instagram', endpoint, 'GET');
    
    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          fields: 'id,username,account_type,media_count',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Instagram', endpoint, response.status, response.data, undefined, duration);
      
      return response.data;
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Instagram', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve Instagram user profile. The access token may be invalid or expired.');
    }
  }

  /**
   * Creates a new post on Instagram (container creation + publishing).
   * Note: This is a two-step process for Instagram API.
   * @param imageUrl - The URL of the image to post (must be publicly accessible).
   * @param caption - The caption for the post.
   * @returns An object containing the ID of the created post.
   */
  async createPost(imageUrl: string, caption: string) {
    const getTimer = logger.startTimer();
    
    try {
      // Step 1: Create a media container
      const profile = await this.getUserProfile();
      const userId = profile.id;
      
      const containerEndpoint = `/${userId}/media`;
      
      const containerBody = {
        image_url: imageUrl,
        caption: caption,
      };

      logger.logApiCall('Instagram', containerEndpoint, 'POST', containerBody);

      const containerResponse = await this.apiClient.post(containerEndpoint, null, {
        params: containerBody,
      });
      
      const containerId = containerResponse.data.id;
      
      // Step 2: Publish the media container
      const publishEndpoint = `/${userId}/media_publish`;
      
      const publishBody = {
        creation_id: containerId,
      };

      logger.logApiCall('Instagram', publishEndpoint, 'POST', publishBody);

      const publishResponse = await this.apiClient.post(publishEndpoint, null, {
        params: publishBody,
      });
      
      const duration = getTimer();
      
      logger.logApiResponse('Instagram', publishEndpoint, publishResponse.status, publishResponse.data, undefined, duration);
      
      return { 
        id: publishResponse.data.id,
        caption: caption,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Instagram', '/media', undefined, undefined, errorMsg, duration);
      
      if (axios.isAxiosError(error) && error.response) {
        const statusCode = error.response.status;
        if (statusCode === 403) {
          throw new Error('Post creation forbidden. Ensure you have a Business or Creator account and proper permissions.');
        } else if (statusCode === 429) {
          throw new Error('Rate limit exceeded. Please wait before creating more posts.');
        }
      }
      
      throw new Error('Could not create post on Instagram. Ensure the image URL is publicly accessible.');
    }
  }

  /**
   * Retrieves the user's recent posts.
   * @param maxResults - Maximum number of posts to retrieve (default: 5).
   * @returns An array of the user's recent posts.
   */
  async listLast5Posts(maxResults: number = 5) {
    const getTimer = logger.startTimer();
    
    try {
      const profile = await this.getUserProfile();
      const userId = profile.id;
      
      const endpoint = `/${userId}/media`;
      
      logger.logApiCall('Instagram', endpoint, 'GET');

      const response = await this.apiClient.get(endpoint, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
          limit: maxResults,
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Instagram', endpoint, response.status, response.data, undefined, duration);
      
      return response.data.data || [];
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Instagram', '/media', undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve Instagram posts.');
    }
  }

  /**
   * Gets likes count for a specific post.
   * @param postId - The ID of the post.
   * @returns An object containing the like count.
   */
  async getLikesForPost(postId: string) {
    const getTimer = logger.startTimer();
    const endpoint = `/${postId}`;
    
    logger.logApiCall('Instagram', endpoint, 'GET');

    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          fields: 'like_count',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Instagram', endpoint, response.status, response.data, undefined, duration);
      
      return {
        post_id: postId,
        count: response.data.like_count || 0,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Instagram', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not get likes for post ${postId}.`);
    }
  }

  /**
   * Adds a comment to a specific post.
   * @param postId - The ID of the post to comment on.
   * @param comment - The text content of the comment.
   * @returns An object containing the ID of the created comment.
   */
  async commentOnPost(postId: string, comment: string) {
    const getTimer = logger.startTimer();
    const endpoint = `/${postId}/comments`;

    const commentBody = {
      message: comment,
    };

    logger.logApiCall('Instagram', endpoint, 'POST', commentBody);

    try {
      const response = await this.apiClient.post(endpoint, null, {
        params: commentBody,
      });
      const duration = getTimer();
      
      logger.logApiResponse('Instagram', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        id: response.data.id,
        message: comment,
        post_id: postId,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Instagram', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not comment on post ${postId}.`);
    }
  }

  /**
   * Gets comments for a specific post.
   * @param postId - The ID of the post.
   * @returns An array of comments on the post.
   */
  async getPostComments(postId: string) {
    const getTimer = logger.startTimer();
    const endpoint = `/${postId}/comments`;
    
    logger.logApiCall('Instagram', endpoint, 'GET');

    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          fields: 'id,text,username,timestamp,like_count',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Instagram', endpoint, response.status, response.data, undefined, duration);
      
      return response.data.data || [];
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Instagram', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not get comments for post ${postId}.`);
    }
  }

  /**
   * Gets the user's followers count (limited information due to API restrictions).
   * @returns An object with followers count.
   */
  async getFollowers() {
    const getTimer = logger.startTimer();
    
    try {
      const profile = await this.getUserProfile();
      const userId = profile.id;
      
      const endpoint = `/${userId}`;
      
      logger.logApiCall('Instagram', endpoint, 'GET');

      const response = await this.apiClient.get(endpoint, {
        params: {
          fields: 'followers_count',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Instagram', endpoint, response.status, response.data, undefined, duration);
      
      return {
        followers_count: response.data.followers_count || 0,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Instagram', '/followers', undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve Instagram followers count.');
    }
  }

  /**
   * Gets the user's following count (limited information due to API restrictions).
   * @returns An object with following count.
   */
  async getFollowing() {
    const getTimer = logger.startTimer();
    
    try {
      const profile = await this.getUserProfile();
      const userId = profile.id;
      
      const endpoint = `/${userId}`;
      
      logger.logApiCall('Instagram', endpoint, 'GET');

      const response = await this.apiClient.get(endpoint, {
        params: {
          fields: 'follows_count',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Instagram', endpoint, response.status, response.data, undefined, duration);
      
      return {
        follows_count: response.data.follows_count || 0,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Instagram', '/following', undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve Instagram following count.');
    }
  }

  /**
   * Gets insights (analytics) for a specific post.
   * Requires Instagram Business account.
   * @param postId - The ID of the post.
   * @returns An object containing engagement metrics.
   */
  async getPostInsights(postId: string) {
    const getTimer = logger.startTimer();
    const endpoint = `/${postId}/insights`;
    
    logger.logApiCall('Instagram', endpoint, 'GET');

    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          metric: 'engagement,impressions,reach,saved',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Instagram', endpoint, response.status, response.data, undefined, duration);
      
      const insights: any = {};
      if (response.data.data) {
        response.data.data.forEach((metric: any) => {
          insights[metric.name] = metric.values[0]?.value || 0;
        });
      }
      
      return {
        post_id: postId,
        ...insights,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Instagram', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not get insights for post ${postId}. Ensure you have a Business account.`);
    }
  }

  /**
   * Gets account insights (analytics) for the user.
   * Requires Instagram Business account.
   * @param metric - The metrics to retrieve (e.g., 'impressions,reach,profile_views').
   * @param period - The time period ('day', 'week', 'days_28', 'lifetime').
   * @returns An object containing account metrics.
   */
  async getAccountInsights(metric: string = 'impressions,reach,profile_views', period: string = 'day') {
    const getTimer = logger.startTimer();
    
    try {
      const profile = await this.getUserProfile();
      const userId = profile.id;
      
      const endpoint = `/${userId}/insights`;
      
      logger.logApiCall('Instagram', endpoint, 'GET');

      const response = await this.apiClient.get(endpoint, {
        params: {
          metric: metric,
          period: period,
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Instagram', endpoint, response.status, response.data, undefined, duration);
      
      const insights: any = {};
      if (response.data.data) {
        response.data.data.forEach((metricData: any) => {
          insights[metricData.name] = metricData.values[0]?.value || 0;
        });
      }
      
      return insights;
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Instagram', '/insights', undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not get account insights. Ensure you have a Business account.');
    }
  }

  /**
   * Replies to a comment on a post.
   * @param commentId - The ID of the comment to reply to.
   * @param message - The reply text.
   * @returns An object containing the ID of the created reply.
   */
  async replyToComment(commentId: string, message: string) {
    const getTimer = logger.startTimer();
    const endpoint = `/${commentId}/replies`;

    const replyBody = {
      message: message,
    };

    logger.logApiCall('Instagram', endpoint, 'POST', replyBody);

    try {
      const response = await this.apiClient.post(endpoint, null, {
        params: replyBody,
      });
      const duration = getTimer();
      
      logger.logApiResponse('Instagram', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        id: response.data.id,
        message: message,
        comment_id: commentId,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Instagram', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not reply to comment ${commentId}.`);
    }
  }
}

/**
 * Utility functions for Instagram OAuth 2.0 flow
 */
export class InstagramOAuthHelper {
  /**
   * Generates a random state parameter for CSRF protection.
   * @returns A random state string.
   */
  static generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
