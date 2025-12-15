import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import crypto from 'crypto';

/**
 * A client for interacting with the Twitter/X API v2.
 * Implements OAuth 2.0 with PKCE (Proof Key for Code Exchange).
 * An access token is required for all operations and should be provided by the user's session.
 */
export class TwitterClient {
  private apiClient: AxiosInstance;

  /**
   * Creates an instance of TwitterClient.
   * @param accessToken - The user's OAuth 2.0 access token.
   */
  constructor(private accessToken: string) {
    if (!accessToken) {
      throw new Error('Twitter API access token is required.');
    }
    this.apiClient = axios.create({
      baseURL: 'https://api.twitter.com/2',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Retrieves the authenticated user's profile information.
   * @returns The user's profile data including id, name, username, etc.
   */
  async getUserProfile() {
    const getTimer = logger.startTimer();
    const endpoint = '/users/me';
    
    logger.logApiCall('Twitter', endpoint, 'GET');
    
    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          'user.fields': 'id,name,username,description,profile_image_url,public_metrics,verified,created_at',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Twitter', endpoint, response.status, response.data, undefined, duration);
      
      return response.data.data;
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Twitter', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve Twitter user profile. The access token may be invalid or expired.');
    }
  }

  /**
   * Creates a new tweet (post) on Twitter.
   * @param content - The text content of the tweet (max 280 characters for standard accounts).
   * @returns An object containing the ID of the created tweet.
   */
  async createTweet(content: string) {
    const getTimer = logger.startTimer();
    const endpoint = '/tweets';

    if (content.length > 280) {
      throw new Error('Tweet content exceeds 280 characters limit.');
    }

    const tweetBody = {
      text: content,
    };

    logger.logApiCall('Twitter', endpoint, 'POST', tweetBody);

    try {
      const response = await this.apiClient.post(endpoint, tweetBody);
      const duration = getTimer();
      
      logger.logApiResponse('Twitter', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        id: response.data.data.id,
        text: response.data.data.text,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Twitter', endpoint, undefined, undefined, errorMsg, duration);
      
      if (axios.isAxiosError(error) && error.response) {
        const statusCode = error.response.status;
        if (statusCode === 403) {
          throw new Error('Tweet creation forbidden. Check if your app has write permissions and the user has authorized them.');
        } else if (statusCode === 429) {
          throw new Error('Rate limit exceeded. Please wait before creating more tweets.');
        }
      }
      
      throw new Error('Could not create tweet on Twitter.');
    }
  }

  /**
   * Replies to an existing tweet.
   * @param tweetId - The ID of the tweet to reply to.
   * @param content - The text content of the reply.
   * @returns An object containing the ID of the created reply.
   */
  async replyToTweet(tweetId: string, content: string) {
    const getTimer = logger.startTimer();
    const endpoint = '/tweets';

    if (content.length > 280) {
      throw new Error('Reply content exceeds 280 characters limit.');
    }

    const replyBody = {
      text: content,
      reply: {
        in_reply_to_tweet_id: tweetId,
      },
    };

    logger.logApiCall('Twitter', endpoint, 'POST', replyBody);

    try {
      const response = await this.apiClient.post(endpoint, replyBody);
      const duration = getTimer();
      
      logger.logApiResponse('Twitter', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        id: response.data.data.id,
        text: response.data.data.text,
        in_reply_to_tweet_id: tweetId,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Twitter', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not reply to tweet ${tweetId}.`);
    }
  }

  /**
   * Retrieves the authenticated user's recent tweets.
   * @param maxResults - Maximum number of tweets to retrieve (default: 10, max: 100).
   * @returns An array of the user's recent tweets.
   */
  async getUserTweets(maxResults: number = 10) {
    const getTimer = logger.startTimer();
    
    try {
      // First get the user's ID
      const userProfile = await this.getUserProfile();
      const userId = userProfile.id;
      
      const endpoint = `/users/${userId}/tweets`;
      
      logger.logApiCall('Twitter', endpoint, 'GET');
      
      const response = await this.apiClient.get(endpoint, {
        params: {
          max_results: Math.min(maxResults, 100),
          'tweet.fields': 'id,text,created_at,public_metrics,conversation_id',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Twitter', endpoint, response.status, response.data, undefined, duration);
      
      return response.data.data || [];
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Twitter', '/users/:id/tweets', undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve user tweets.');
    }
  }

  /**
   * Searches for tweets matching a query.
   * @param query - The search query string.
   * @param maxResults - Maximum number of results (default: 10, max: 100).
   * @returns An array of tweets matching the search query.
   */
  async searchTweets(query: string, maxResults: number = 10) {
    const getTimer = logger.startTimer();
    const endpoint = '/tweets/search/recent';
    
    logger.logApiCall('Twitter', endpoint, 'GET', { query });

    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          query: query,
          max_results: Math.min(maxResults, 100),
          'tweet.fields': 'id,text,created_at,author_id,public_metrics',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Twitter', endpoint, response.status, response.data, undefined, duration);
      
      return response.data.data || [];
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Twitter', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not search tweets with query: ${query}`);
    }
  }

  /**
   * Likes a tweet.
   * @param tweetId - The ID of the tweet to like.
   * @returns An object indicating success.
   */
  async likeTweet(tweetId: string) {
    const getTimer = logger.startTimer();
    
    try {
      // First get the user's ID
      const userProfile = await this.getUserProfile();
      const userId = userProfile.id;
      
      const endpoint = `/users/${userId}/likes`;
      
      const likeBody = {
        tweet_id: tweetId,
      };

      logger.logApiCall('Twitter', endpoint, 'POST', likeBody);

      const response = await this.apiClient.post(endpoint, likeBody);
      const duration = getTimer();
      
      logger.logApiResponse('Twitter', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        liked: response.data.data.liked,
        tweet_id: tweetId,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Twitter', '/users/:id/likes', undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not like tweet ${tweetId}.`);
    }
  }

  /**
   * Retweets a tweet.
   * @param tweetId - The ID of the tweet to retweet.
   * @returns An object indicating success.
   */
  async retweetTweet(tweetId: string) {
    const getTimer = logger.startTimer();
    
    try {
      // First get the user's ID
      const userProfile = await this.getUserProfile();
      const userId = userProfile.id;
      
      const endpoint = `/users/${userId}/retweets`;
      
      const retweetBody = {
        tweet_id: tweetId,
      };

      logger.logApiCall('Twitter', endpoint, 'POST', retweetBody);

      const response = await this.apiClient.post(endpoint, retweetBody);
      const duration = getTimer();
      
      logger.logApiResponse('Twitter', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        retweeted: response.data.data.retweeted,
        tweet_id: tweetId,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Twitter', '/users/:id/retweets', undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not retweet tweet ${tweetId}.`);
    }
  }

  /**
   * Gets engagement metrics for a specific tweet.
   * @param tweetId - The ID of the tweet.
   * @returns Engagement metrics including likes, retweets, replies, and impressions.
   */
  async getTweetEngagement(tweetId: string) {
    const getTimer = logger.startTimer();
    const endpoint = `/tweets/${tweetId}`;
    
    logger.logApiCall('Twitter', endpoint, 'GET');

    try {
      const response = await this.apiClient.get(endpoint, {
        params: {
          'tweet.fields': 'public_metrics,created_at',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Twitter', endpoint, response.status, response.data, undefined, duration);
      
      const metrics = response.data.data.public_metrics;
      return {
        tweet_id: tweetId,
        likes: metrics.like_count,
        retweets: metrics.retweet_count,
        replies: metrics.reply_count,
        quotes: metrics.quote_count,
        impressions: metrics.impression_count || 0,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Twitter', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not get engagement metrics for tweet ${tweetId}.`);
    }
  }

  /**
   * Deletes a tweet.
   * @param tweetId - The ID of the tweet to delete.
   * @returns An object indicating success.
   */
  async deleteTweet(tweetId: string) {
    const getTimer = logger.startTimer();
    const endpoint = `/tweets/${tweetId}`;
    
    logger.logApiCall('Twitter', endpoint, 'DELETE');

    try {
      const response = await this.apiClient.delete(endpoint);
      const duration = getTimer();
      
      logger.logApiResponse('Twitter', endpoint, response.status, response.data, undefined, duration);
      
      return { 
        deleted: response.data.data.deleted,
        tweet_id: tweetId,
      };
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Twitter', endpoint, undefined, undefined, errorMsg, duration);
      
      throw new Error(`Could not delete tweet ${tweetId}.`);
    }
  }

  /**
   * Gets mentions of the authenticated user.
   * @param maxResults - Maximum number of mentions to retrieve (default: 10, max: 100).
   * @returns An array of tweets mentioning the user.
   */
  async getUserMentions(maxResults: number = 10) {
    const getTimer = logger.startTimer();
    
    try {
      // First get the user's ID
      const userProfile = await this.getUserProfile();
      const userId = userProfile.id;
      
      const endpoint = `/users/${userId}/mentions`;
      
      logger.logApiCall('Twitter', endpoint, 'GET');
      
      const response = await this.apiClient.get(endpoint, {
        params: {
          max_results: Math.min(maxResults, 100),
          'tweet.fields': 'id,text,created_at,author_id,public_metrics',
        },
      });
      const duration = getTimer();
      
      logger.logApiResponse('Twitter', endpoint, response.status, response.data, undefined, duration);
      
      return response.data.data || [];
    } catch (error) {
      const duration = getTimer();
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      logger.logApiResponse('Twitter', '/users/:id/mentions', undefined, undefined, errorMsg, duration);
      
      throw new Error('Could not retrieve user mentions.');
    }
  }
}

/**
 * Utility functions for OAuth 2.0 PKCE flow
 */
export class TwitterOAuthHelper {
  /**
   * Generates a code verifier for PKCE.
   * @returns A random code verifier string.
   */
  static generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generates a code challenge from a code verifier for PKCE.
   * @param verifier - The code verifier.
   * @returns The code challenge (SHA-256 hash of verifier).
   */
  static generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  /**
   * Generates a random state parameter for CSRF protection.
   * @returns A random state string.
   */
  static generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
