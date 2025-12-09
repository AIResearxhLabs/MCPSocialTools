import axios from 'axios';
import { facebookConfig } from '../config';

const apiClient = axios.create({
  baseURL: 'https://graph.facebook.com/v19.0',
  headers: {
    'Authorization': `Bearer ${facebookConfig.accessToken}`,
  },
});

export class FacebookClient {
  async createPost(content: string) {
    // Placeholder
    console.log(`Creating Facebook post with content: ${content}`);
    return { id: 'dummy-post-id', content };
  }

  async listLast5Posts() {
    // Placeholder
    console.log('Listing last 5 Facebook posts');
    return [{ id: 'dummy-post-id', content: 'My first post' }];
  }

  async getLikesForPost(postId: string) {
    // Placeholder
    console.log(`Getting likes for Facebook post: ${postId}`);
    return { count: 10 };
  }

  async commentOnPost(postId: string, comment: string) {
    // Placeholder
    console.log(`Commenting on Facebook post ${postId}: ${comment}`);
    return { id: 'dummy-comment-id', comment };
  }

  async getPostComments(postId: string) {
    // Placeholder
    console.log(`Getting comments for Facebook post: ${postId}`);
    return [{ id: 'dummy-comment-id', comment: 'Great post!' }];
  }

  async uploadPhoto(imageUrl: string, caption: string) {
    // Placeholder
    console.log(`Uploading photo to Facebook: ${imageUrl}`);
    return { id: 'dummy-photo-id' };
  }

  async getPageInfo() {
    // Placeholder
    console.log('Getting Facebook page info');
    return { id: 'dummy-page-id', name: 'My Page' };
  }

  async getUserFriends() {
    // Placeholder
    console.log('Listing Facebook friends');
    return [{ id: 'dummy-user-id-3', name: 'Peter Pan' }];
  }
}
