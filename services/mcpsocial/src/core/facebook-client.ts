import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/**
 * A client for interacting with the Facebook Graph API.
 * Implements OAuth 2.0 for authentication.
 * An access token is required for all operations and should be provided by the user's session.
 */
export class FacebookClient {
  private apiClient: AxiosInstance;

  /**
   * Creates an instance of FacebookClient.
   * @param accessToken - The user's OAuth 2.0 access token.
   */
  constructor(private accessToken: string) {
    if (!accessToken) {
      throw new Error('Facebook API access token is required.');
    }
    this.apiClient = axios.create({
      baseURL: 'https://graph.facebook.com/v19.0',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Retrieves the authenticated user's profile information.
   * @returns The user's profile data including id, name, email, etc.
   */
  async getUserProfile() {
    const getTimer = logger.startTimer();
    const endpoint = '/me';
    
    logger.logApiCall('Facebook', endpoint, 'GET');
    
    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          fields: 'id,name,email,picture,friends.summary(true),posts.limit(1)',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return response.data;
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve Facebook user profile. The access token may be invalid or expired.');
    }
  }

  /**
   * Creates a new post on the user's Facebook feed.
   * @param content - The text content of the post.
   * @returns An object containing the ID of the created post.
   */
  async createPost(content: string) {
    const getTimer = logger.startTimer();
    const endpoint = '/me/feed';

    const postBody = {
      message: content,
    };

    logger.logApiCall('Facebook', endpoint, 'POST', postBody);

    try {
      const response = await this.apiClient.post(endpoint, postBody);
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        id: response.data.id,
        message: content,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
      if (axios.isAxiosError(error) && error.response) {
        const statusCode = error.response.status;
        if (statusCode === 403) {
          throw new Error('Post creation forbidden. Check if your app has publish permissions and the user has authorized them.');
        } else if (statusCode === 429) {
          throw new Error('Rate limit exceeded. Please wait before creating more posts.');
        }
      }
      
      throw new Error('Could not create post on Facebook.');
    }
  }

  /**
   * Retrieves the user's recent posts.
   * @param maxResults - Maximum number of posts to retrieve (default: 5).
   * @returns An array of the user's recent posts.
   */
  async listLast5Posts(maxResults: number = 5) {
    const getTimer = logger.startTimer();
    const endpoint = '/me/posts';
    
    logger.logApiCall('Facebook', endpoint, 'GET');

    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          fields: 'id,message,created_time,likes.summary(true),comments.summary(true),shares',
          limit: maxResults,
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return response.data.data || [];
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve Facebook posts.');
    }
  }

  /**
   * Gets likes for a specific post.
   * @param postId - The ID of the post.
   * @returns An object containing the like count and summary.
   */
  async getLikesForPost(postId: string) {
    const getTimer = logger.startTimer();
    const endpoint = `/${postId}/likes`;
    
    logger.logApiCall('Facebook', endpoint, 'GET');

    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          summary: true,
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return {
        post_id: postId,
        count: response.data.summary?.total_count || 0,
        likes: response.data.data || [],
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
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

    logger.logApiCall('Facebook', endpoint, 'POST', commentBody);

    try {
      const response = await this.apiClient.post(endpoint, commentBody);
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        id: response.data.id,
        message: comment,
        post_id: postId,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
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
    
    logger.logApiCall('Facebook', endpoint, 'GET');

    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          fields: 'id,from,message,created_time,like_count',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return response.data.data || [];
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not get comments for post ${postId}.`);
    }
  }

  /**
   * Uploads a photo to Facebook with an optional caption.
   * @param imageUrl - The URL of the image to upload.
   * @param caption - Optional caption for the photo.
   * @returns An object containing the ID of the uploaded photo.
   */
  async uploadPhoto(imageUrl: string, caption: string = '') {
    const getTimer = logger.startTimer();
    const endpoint = '/me/photos';

    const photoBody = {
      url: imageUrl,
      caption: caption,
    };

    logger.logApiCall('Facebook', endpoint, 'POST', photoBody);

    try {
      const response = await this.apiClient.post(endpoint, photoBody);
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        id: response.data.id,
        post_id: response.data.post_id,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not upload photo to Facebook.');
    }
  }

  /**
   * Gets information about a Facebook page the user manages.
   * @returns Page information including ID, name, followers, etc.
   */
  async getPageInfo() {
    const getTimer = logger.startTimer();
    const endpoint = '/me/accounts';
    
    logger.logApiCall('Facebook', endpoint, 'GET');

    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          fields: 'id,name,category,followers_count,fan_count,access_token',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return response.data.data || [];
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve Facebook page info.');
    }
  }

  /**
   * Gets the user's friends list (limited by Facebook privacy settings).
   * @returns An array of friends.
   */
  async getUserFriends() {
    const getTimer = logger.startTimer();
    const endpoint = '/me/friends';
    
    logger.logApiCall('Facebook', endpoint, 'GET');

    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          fields: 'id,name,picture',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return {
        friends: response.data.data || [],
        summary: response.data.summary,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve Facebook friends list.');
    }
  }

  /**
   * Likes a post on Facebook.
   * @param postId - The ID of the post to like.
   * @returns An object indicating success.
   */
  async likePost(postId: string) {
    const getTimer = logger.startTimer();
    const endpoint = `/${postId}/likes`;
    
    logger.logApiCall('Facebook', endpoint, 'POST');

    try {
      const response = await this.apiClient.post(endpoint);
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        success: response.data.success || true,
        post_id: postId,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not like post ${postId}.`);
    }
  }

  /**
   * Shares a link on Facebook with optional message.
   * @param link - The URL to share.
   * @param message - Optional message to accompany the link.
   * @returns An object containing the ID of the created post.
   */
  async shareLink(link: string, message: string = '') {
    const getTimer = logger.startTimer();
    const endpoint = '/me/feed';

    const shareBody = {
      link: link,
      message: message,
    };

    logger.logApiCall('Facebook', endpoint, 'POST', shareBody);

    try {
      const response = await this.apiClient.post(endpoint, shareBody);
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        id: response.data.id,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not share link on Facebook.');
    }
  }

  /**
   * Deletes a post owned by the authenticated user.
   * @param postId - The ID of the post to delete.
   * @returns An object indicating success.
   */
  async deletePost(postId: string) {
    const getTimer = logger.startTimer();
    const endpoint = `/${postId}`;
    
    logger.logApiCall('Facebook', endpoint, 'DELETE');

    try {
      const response = await this.apiClient.delete(endpoint);
      const duration = getTimer();
      
      logger.logApiResponse('Facebook', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        success: response.data.success || true,
        post_id: postId,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Facebook', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not delete post ${postId}.`);
    }
  }
}

/**
 * Utility functions for Facebook OAuth 2.0 flow
 */
export class FacebookOAuthHelper {
  /**
   * Generates a random state parameter for CSRF protection.
   * @returns A random state string.
   */
  static generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
