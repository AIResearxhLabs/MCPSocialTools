import { openaiConfig } from '../config';

// OpenAI API client for generating captions and scheduling suggestions
// Uses the official OpenAI Node.js SDK

export class OpenAIClient {
  private apiKey: string;
  private baseURL: string = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = openaiConfig.apiKey;
  }

  async generateCaption(prompt: string): Promise<string> {
    console.log(`Generating caption with prompt: ${prompt}`);

    const fullPrompt = `You are a creative social media expert. Generate three distinct and engaging captions for a social media post based on the following prompt.
Each caption should be tailored for a different tone: one professional, one casual, and one witty.
Return the captions in a JSON object with keys "professional", "casual", and "witty".

Prompt: "${prompt}"`;

    try {
      // Call OpenAI API
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a creative social media expert. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Try to parse as JSON, fallback to raw content
      try {
        JSON.parse(content);
        return content;
      } catch {
        // If not valid JSON, wrap in default structure
        return JSON.stringify({
          professional: `Professional caption: ${content}`,
          casual: `Casual caption: ${content}`,
          witty: `Witty caption: ${content}`,
        });
      }
    } catch (error) {
      console.error('Error generating caption:', error);
      // Fallback response
      return JSON.stringify({
        professional: `This is a professional caption for: "${prompt}"`,
        casual: `Here's a casual take on: "${prompt}"`,
        witty: `A witty remark about: "${prompt}"`,
      });
    }
  }

  async getSchedulingSuggestion(postContent: string): Promise<string> {
    console.log(`Getting scheduling suggestion for post: ${postContent}`);

    const prompt = `You are a social media analyst. Based on the following post content, provide three optimal posting times to maximize engagement on LinkedIn, Facebook, and Instagram. Consider typical user behavior on each platform.
Return the suggestions as a JSON object with keys "linkedIn", "facebook", and "instagram".

Post Content: "${postContent}"`;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a social media analyst. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      try {
        JSON.parse(content);
        return content;
      } catch {
        return JSON.stringify({
          linkedIn: "Tomorrow at 9:00 AM (Weekday)",
          facebook: "Today at 8:00 PM (Evening)",
          instagram: "Tomorrow at 12:00 PM (Lunchtime)",
        });
      }
    } catch (error) {
      console.error('Error getting scheduling suggestion:', error);
      return JSON.stringify({
        linkedIn: "Tomorrow at 9:00 AM (Weekday)",
        facebook: "Today at 8:00 PM (Evening)",
        instagram: "Tomorrow at 12:00 PM (Lunchtime)",
      });
    }
  }
}
