import config from './config.json';

// In a real-world application, you would use environment variables
// and a more robust configuration management system.
// For this example, we'll read directly from the JSON file.

export const linkedinConfig = {
  apiKey: process.env.LINKEDIN_API_KEY || config.linkedin.apiKey,
  apiSecret: process.env.LINKEDIN_API_SECRET || config.linkedin.apiSecret,
};

export const facebookConfig = {
  appId: process.env.FACEBOOK_APP_ID || config.facebook.appId,
  appSecret: process.env.FACEBOOK_APP_SECRET || config.facebook.appSecret,
  accessToken: process.env.FACEBOOK_ACCESS_TOKEN || config.facebook.accessToken,
};

export const instagramConfig = {
  appId: process.env.INSTAGRAM_APP_ID || config.instagram.appId,
  appSecret: process.env.INSTAGRAM_APP_SECRET || config.instagram.appSecret,
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || config.instagram.accessToken,
};

export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || config.openai.apiKey,
};

export const twitterConfig = {
  clientId: process.env.TWITTER_CLIENT_ID || config.twitter.clientId,
  clientSecret: process.env.TWITTER_CLIENT_SECRET || config.twitter.clientSecret,
};
