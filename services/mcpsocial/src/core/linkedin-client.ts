import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

/**
 * A client for interacting with the LinkedIn API.
 * An access token is required for all operations and should be provided by the user's session.
 */
export class LinkedInClient {
  private apiClient: AxiosInstance;

  /**
   * Creates an instance of LinkedInClient.
   * @param accessToken - The user's OAuth 2.0 access token.
   */
  constructor(private accessToken: string) {
    if (!accessToken) {
      throw new Error('LinkedIn API access token is required.');
    }
    this.apiClient = axios.create({
      baseURL: 'https://api.linkedin.com/v2',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });
  }

  /**
   * Retrieves the URN of the authenticated user.
   * The user URN is required to author a post.
   * @returns The URN of the user (e.g., "urn:li:person:...").
   */
  private async getAuthenticatedUserUrn(): Promise<string> {
    const getTimer = logger.startTimer();
    const endpoint = '/userinfo';
    
    logger.logApiCall('LinkedIn', endpoint, 'GET');
    
    try {
      const response = await this.apiClient.get(endpoint);
      const duration = getTimer();
      
      logger.logApiResponse('LinkedIn', endpoint, response.status, { sub: response.data.sub }, undefined, duration);
      
      // The 'sub' field in the userinfo response is the user's ID.
      // We need to construct the full URN from this.
      return `urn:li:person:${response.data.sub}`;
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('LinkedIn', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve LinkedIn user profile. The access token may be invalid or expired.');
    }
  }

  /**
   * Creates a new text-based post on LinkedIn on behalf of the authenticated user.
   * @param content - The text content of the post.
   * @returns An object containing the ID of the created post.
   */
  async createPost(content: string) {
    const getTimer = logger.startTimer();
    const authorUrn = await this.getAuthenticatedUserUrn();
    const endpoint = '/ugcPosts';

    const postBody = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS', // Changed to CONNECTIONS for safety
      },
    };

    logger.logApiCall('LinkedIn', endpoint, 'POST', postBody);

    try {
      const response = await this.apiClient.post(endpoint, postBody);
      const duration = getTimer();
      
      logger.logApiResponse('LinkedIn', endpoint, response.status, { id: response.data.id }, undefined, duration);
      
      return { id: response.data.id };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('LinkedIn', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not create LinkedIn post.');
    }
  }

  async listLast5Posts() {
    // Placeholder - requires implementation
    console.log('Listing last 5 LinkedIn posts');
    return [{ id: 'dummy-post-id', content: 'My first post' }];
  }

  async getLikesForPost(postId: string) {
    // Placeholder - requires implementation
    console.log(`Getting likes for LinkedIn post: ${postId}`);
    return { count: 10 };
  }

  async commentOnPost(postId: string, comment: string) {
    // Placeholder - requires implementation
    console.log(`Commenting on LinkedIn post ${postId}: ${comment}`);
    return { id: 'dummy-comment-id', comment };
  }

  async getPostComments(postId: string) {
    // Placeholder - requires implementation
    console.log(`Getting comments for LinkedIn post: ${postId}`);
    return [{ id: 'dummy-comment-id', comment: 'Great post!' }];
  }

  async getProfileInfo() {
    // This can use the getAuthenticatedUserUrn method's response
    try {
        const response = await this.apiClient.get('/userinfo');
        return { id: response.data.sub, name: response.data.name };
    } catch (error) {
        console.error('Failed to get LinkedIn profile info:', error);
        throw new Error('Could not retrieve LinkedIn profile info.');
    }
  }

  async shareArticle(url: string, text: string) {
    // Placeholder - requires implementation
    console.log(`Sharing article on LinkedIn: ${url}`);
    return { id: 'dummy-share-id' };
  }

  async listConnections() {
    // Placeholder - requires implementation
    console.log('Listing LinkedIn connections');
    return [{ id: 'dummy-user-id-2', name: 'Jane Smith' }];
  }
}
