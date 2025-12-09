# Functional Specification: MCPSocial Server

## 1. Overview

This document provides a detailed functional specification for the MCPSocial Server. It describes the server's capabilities, its interaction with external services, and the specific behavior of its tools and resources.

## 2. Core Components

### 2.1. MCP Host (`mcp-host.ts`)

The MCP Host is the central component of the server. It is responsible for:

*   Initializing and managing the social media and Gemini clients.
*   Registering all available tools and resources.
*   Handling requests to execute tools and fetch resources.

### 2.2. Social Media Clients

The server includes dedicated clients for interacting with the following social media platforms:

*   **`linkedin-client.ts`**: Handles all interactions with the LinkedIn API.
*   **`facebook-client.ts`**: Handles all interactions with the Facebook API.
*   **`instagram-client.ts`**: Handles all interactions with the Instagram API.

### 2.3. Gemini Client (`gemini-client.ts`)

The Gemini Client is responsible for all interactions with the Gemini API. It provides methods for generating content and getting suggestions.

## 3. Tools

The following tools are exposed by the MCP Host:

*   **`postToLinkedIn`**: Creates a new text-based post on LinkedIn.
    *   **Input:** `accessToken` (string), `content` (string)
    *   **Output:** An object containing the ID of the created post.
*   **`postToFacebook`**: Creates a new post on Facebook.
    *   **Input:** `content` (string)
    *   **Output:** An object containing the ID of the created post.
*   **`postToInstagram`**: Creates a new post on Instagram.
    *   **Input:** `imageUrl` (string), `caption` (string)
    *   **Output:** An object containing the ID of the created post.
*   **`generateCaption`**: Generates a post caption using the Gemini API.
    *   **Input:** `prompt` (string)
    *   **Output:** A JSON string containing three caption options: `professional`, `casual`, and `witty`.
*   **`getSchedulingSuggestion`**: Suggests the best time to post on social media.
    *   **Input:** `postContent` (string)
    *   **Output:** A JSON string containing optimal posting times for `linkedIn`, `facebook`, and `instagram`.

## 4. Resources

The following resources are exposed by the MCP Host:

*   **`getLinkedInProfile`**: Retrieves the user's LinkedIn profile information.
    *   **Parameters:** `accessToken` (string)
    *   **Output:** An object containing the user's profile data.
*   **`getFacebookPageInfo`**: Retrieves information about the Facebook page.
    *   **Output:** An object containing the page's data.
*   **`getInstagramProfile`**: Retrieves the user's Instagram profile information.
    *   **Output:** An object containing the user's profile data.

## 5. Configuration

The server is configured through environment variables. See the `README.md` for a complete list of required variables.
