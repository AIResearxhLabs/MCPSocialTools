import axios from 'axios';
import { instagramConfig } from '../config';

const apiClient = axios.create({
  baseURL: 'https://graph.instagram.com/v19.0',
  headers: {
    'Authorization': `Bearer ${instagramConfig.accessToken}`,
  },
});

export class InstagramClient {
  async createPost(imageUrl: string, caption: string) {
    // Placeholder
    console.log(`Creating Instagram post with image: ${imageUrl}`);
    return { id: 'dummy-post-id', caption };
  }

  async listLast5Posts() {
    // Placeholder
    console.log('Listing last 5 Instagram posts');
    return [{ id: 'dummy-post-id', content: 'My first post' }];
  }

  async getLikesForPost(postId: string) {
    // Placeholder
    console.log(`Getting likes for Instagram post: ${postId}`);
    return { count: 10 };
  }

  async commentOnPost(postId: string, comment: string) {
    // Placeholder
    console.log(`Commenting on Instagram post ${postId}: ${comment}`);
    return { id: 'dummy-comment-id', comment };
  }

  async getPostComments(postId: string) {
    // Placeholder
    console.log(`Getting comments for Instagram post: ${postId}`);
    return [{ id: 'dummy-comment-id', comment: 'Great post!' }];
  }

  async getUserProfile() {
    // Placeholder
    console.log('Getting Instagram user profile');
    return { id: 'dummy-user-id', username: 'john_doe' };
  }

  async getFollowers() {
    // Placeholder
    console.log('Getting Instagram followers');
    return [{ id: 'dummy-user-id-4', username: 'follower1' }];
  }

  async getFollowing() {
    // Placeholder
    console.log('Getting Instagram following');
    return [{ id: 'dummy-user-id-5', username: 'following1' }];
  }
}
