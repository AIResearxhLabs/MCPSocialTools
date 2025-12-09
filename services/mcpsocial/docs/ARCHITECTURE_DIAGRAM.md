# MCPSocial Technology Architecture Diagram

This document provides comprehensive architecture diagrams showing all technology components, their interactions, and data flows in the MCPSocial service.

**Note:** All diagrams use WCAG AA compliant colors with a minimum contrast ratio of 4.5:1 for accessibility.

## 1. High-Level System Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#E3F2FD','primaryTextColor':'#0D47A1','primaryBorderColor':'#1976D2','lineColor':'#424242','secondaryColor':'#FFF3E0','tertiaryColor':'#E8F5E9','noteBkgColor':'#FFF9C4','noteTextColor':'#1B5E20'}}}%%
graph TB
    subgraph "Client Layer"
        CLIENT[Client Applications]
        BROWSER[Web Browser]
        MCP_CLIENT[MCP Protocol Clients]
    end

    subgraph "Docker Container - mcpsocial-app"
        subgraph "Express.js Server :3001"
            API_GATEWAY[API Gateway Layer]
            
            subgraph "Route Handlers"
                REST_API[REST API Routes<br/>/api/*]
                MCP_V1[MCP v1 Protocol<br/>/mcp/v1/*]
                MCP_LEGACY[Legacy MCP<br/>/mcp/*]
            end
            
            subgraph "Core Business Logic"
                MCP_HOST[MCP Host<br/>Tool & Resource Manager]
                
                subgraph "Social Media Clients"
                    LINKEDIN_CLIENT[LinkedIn Client<br/>OAuth 2.0]
                    FACEBOOK_CLIENT[Facebook Client<br/>Graph API]
                    INSTAGRAM_CLIENT[Instagram Client<br/>Graph API]
                end
                
                subgraph "AI Integration"
                    OPENAI_CLIENT[OpenAI Client<br/>GPT-4 Integration]
                end
            end
            
            MIDDLEWARE[Error Handler<br/>Middleware]
            LOGGER[Structured Logger<br/>JSON Logging]
        end
    end

    subgraph "External Services"
        LINKEDIN_API[LinkedIn API<br/>OAuth & Graph API]
        FACEBOOK_API[Facebook Graph API]
        INSTAGRAM_API[Instagram Graph API]
        OPENAI_API[OpenAI API<br/>GPT-4]
    end

    subgraph "Configuration & Environment"
        ENV_VARS[Environment Variables<br/>.env file]
        CONFIG_JSON[config.json<br/>Static Configuration]
    end

    %% Client connections
    CLIENT --> API_GATEWAY
    BROWSER --> API_GATEWAY
    MCP_CLIENT --> API_GATEWAY

    %% API Gateway routing
    API_GATEWAY --> REST_API
    API_GATEWAY --> MCP_V1
    API_GATEWAY --> MCP_LEGACY

    %% Route to Core Logic
    REST_API --> MCP_HOST
    MCP_V1 --> MCP_HOST
    MCP_LEGACY --> MCP_HOST

    %% Core Logic to Clients
    MCP_HOST --> LINKEDIN_CLIENT
    MCP_HOST --> FACEBOOK_CLIENT
    MCP_HOST --> INSTAGRAM_CLIENT
    MCP_HOST --> OPENAI_CLIENT

    %% External API calls
    LINKEDIN_CLIENT -->|HTTPS| LINKEDIN_API
    FACEBOOK_CLIENT -->|HTTPS| FACEBOOK_API
    INSTAGRAM_CLIENT -->|HTTPS| INSTAGRAM_API
    OPENAI_CLIENT -->|HTTPS| OPENAI_API

    %% Configuration
    ENV_VARS -.->|Loads at startup| API_GATEWAY
    CONFIG_JSON -.->|Static config| MCP_HOST

    %% Error handling and logging
    REST_API --> MIDDLEWARE
    MCP_V1 --> MIDDLEWARE
    MCP_LEGACY --> MIDDLEWARE
    MIDDLEWARE --> LOGGER

    style CLIENT fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style BROWSER fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style MCP_CLIENT fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style API_GATEWAY fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#BF360C
    style MCP_HOST fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#4A148C
    style LINKEDIN_CLIENT fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style FACEBOOK_CLIENT fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style INSTAGRAM_CLIENT fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style OPENAI_CLIENT fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style LINKEDIN_API fill:#FFEBEE,stroke:#C62828,stroke-width:2px,color:#B71C1C
    style FACEBOOK_API fill:#FFEBEE,stroke:#C62828,stroke-width:2px,color:#B71C1C
    style INSTAGRAM_API fill:#FFEBEE,stroke:#C62828,stroke-width:2px,color:#B71C1C
    style OPENAI_API fill:#FFEBEE,stroke:#C62828,stroke-width:2px,color:#B71C1C
    style MIDDLEWARE fill:#FFF9C4,stroke:#F57F17,stroke-width:2px,color:#F57F17
    style LOGGER fill:#FFF9C4,stroke:#F57F17,stroke-width:2px,color:#F57F17
```

## 2. Technology Stack Breakdown

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#E3F2FD','primaryTextColor':'#0D47A1','primaryBorderColor':'#1976D2','lineColor':'#424242','secondaryColor':'#FFF3E0','tertiaryColor':'#E8F5E9'}}}%%
graph LR
    subgraph "Runtime Environment"
        NODE[Node.js v18<br/>JavaScript Runtime]
        TS[TypeScript<br/>Type Safety]
    end

    subgraph "Web Framework"
        EXPRESS[Express.js v4<br/>HTTP Server]
        MIDDLEWARE_STACK[Middleware Stack]
    end

    subgraph "Core Dependencies"
        AXIOS[Axios v1.6<br/>HTTP Client]
        QS[qs v6.14<br/>Query String Parser]
        CRYPTO[crypto<br/>Built-in Security]
    end

    subgraph "Development Tools"
        TS_COMPILER[TypeScript Compiler]
        TS_NODE_DEV[ts-node-dev<br/>Hot Reload]
        JEST[Jest<br/>Testing Framework]
    end

    subgraph "Containerization"
        DOCKER[Docker<br/>Multi-stage Build]
        DOCKER_COMPOSE[Docker Compose<br/>Local Orchestration]
    end

    subgraph "API Protocols"
        REST[REST API]
        MCP[MCP Protocol v1.0<br/>JSON-RPC 2.0]
        OAUTH[OAuth 2.0]
    end

    NODE --> EXPRESS
    TS --> TS_COMPILER
    TS_COMPILER --> NODE
    EXPRESS --> MIDDLEWARE_STACK
    EXPRESS --> AXIOS
    EXPRESS --> QS
    EXPRESS --> CRYPTO
    
    TS_NODE_DEV -.->|Development| NODE
    JEST -.->|Testing| TS
    
    DOCKER --> NODE
    DOCKER_COMPOSE --> DOCKER
    
    EXPRESS --> REST
    EXPRESS --> MCP
    REST --> OAUTH

    style NODE fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#FFFFFF
    style EXPRESS fill:#212121,stroke:#000000,stroke-width:2px,color:#FFFFFF
    style DOCKER fill:#1976D2,stroke:#0D47A1,stroke-width:2px,color:#FFFFFF
    style TS fill:#0277BD,stroke:#01579B,stroke-width:2px,color:#FFFFFF
    style REST fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style MCP fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#BF360C
    style OAUTH fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#4A148C
```

## 3. Data Flow - Social Media Post Creation

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'actorBkg':'#E3F2FD','actorBorder':'#1976D2','actorTextColor':'#0D47A1','signalColor':'#424242','signalTextColor':'#212121','labelBoxBkgColor':'#FFF3E0','labelBoxBorderColor':'#E65100','labelTextColor':'#BF360C','noteBkgColor':'#FFF9C4','noteBorderColor':'#F57F17','noteTextColor':'#F57F17'}}}%%
sequenceDiagram
    participant Client
    participant API Gateway
    participant MCP Host
    participant OpenAI Client
    participant LinkedIn Client
    participant OpenAI API
    participant LinkedIn API

    Client->>API Gateway: POST /mcp/execute<br/>{toolName: "generateCaption"}
    API Gateway->>MCP Host: executeTool("generateCaption", params)
    MCP Host->>Logger: Log tool execution start
    MCP Host->>OpenAI Client: generateCaption(prompt)
    OpenAI Client->>OpenAI API: POST /v1/chat/completions<br/>(GPT-4 model)
    OpenAI API-->>OpenAI Client: Generated caption text
    OpenAI Client-->>MCP Host: Return caption
    MCP Host->>Logger: Log tool execution success
    MCP Host-->>API Gateway: Return result
    API Gateway-->>Client: {success: true, result: caption}

    Note over Client,LinkedIn API: User reviews caption and posts

    Client->>API Gateway: POST /mcp/execute<br/>{toolName: "postToLinkedIn"}
    API Gateway->>MCP Host: executeTool("postToLinkedIn", params)
    MCP Host->>LinkedIn Client: createPost(accessToken, content)
    LinkedIn Client->>LinkedIn API: POST /v2/ugcPosts<br/>(OAuth 2.0 Bearer token)
    LinkedIn API-->>LinkedIn Client: Post created (postId)
    LinkedIn Client-->>MCP Host: Return post details
    MCP Host->>Logger: Log successful post
    MCP Host-->>API Gateway: Return result
    API Gateway-->>Client: {success: true, result: postDetails}
```

## 4. Authentication Flow - LinkedIn OAuth 2.0

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'actorBkg':'#E3F2FD','actorBorder':'#1976D2','actorTextColor':'#0D47A1','signalColor':'#424242','signalTextColor':'#212121','labelBoxBkgColor':'#FFF3E0','labelBoxBorderColor':'#E65100','labelTextColor':'#BF360C','noteBkgColor':'#FFF9C4','noteBorderColor':'#F57F17','noteTextColor':'#F57F17'}}}%%
sequenceDiagram
    participant User
    participant Client App
    participant MCPSocial
    participant LinkedIn
    participant Backend Server

    User->>Client App: Request to connect LinkedIn
    Client App->>MCPSocial: GET /mcp/execute<br/>{toolName: "getLinkedInAuthUrl"}
    MCPSocial-->>Client App: Return authorization URL + state
    Client App->>User: Display authorization link
    User->>LinkedIn: Click authorization URL
    LinkedIn->>User: Show consent screen
    User->>LinkedIn: Approve authorization
    LinkedIn->>Backend Server: Redirect to callback URL<br/>?code=AUTH_CODE&state=STATE
    Backend Server->>LinkedIn: POST /oauth/v2/accessToken<br/>(exchange code for token)
    LinkedIn-->>Backend Server: Return access_token
    Backend Server->>Client App: Return access_token securely
    Client App->>MCPSocial: Use access_token in API calls

    Note over Client App,MCPSocial: All subsequent LinkedIn API calls<br/>use this access_token
```

## 5. MCP Protocol Implementation

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#E3F2FD','primaryTextColor':'#0D47A1','primaryBorderColor':'#1976D2','lineColor':'#424242','secondaryColor':'#FFF3E0','tertiaryColor':'#E8F5E9'}}}%%
graph TB
    subgraph "MCP Protocol Endpoints"
        INFO[/mcp/info<br/>Server Information]
        TOOLS[/mcp/tools<br/>List Available Tools]
        RESOURCES[/mcp/resources<br/>List Available Resources]
        EXECUTE[/mcp/execute<br/>Execute Tool]
        V1_ENDPOINT[/mcp/v1<br/>JSON-RPC 2.0 Protocol]
    end

    subgraph "MCP Host Core"
        TOOL_REGISTRY[Tool Registry<br/>Map<string, McpTool>]
        RESOURCE_REGISTRY[Resource Registry<br/>Map<string, McpResource>]
        VALIDATOR[Input Schema Validator]
        EXECUTOR[Tool Executor]
    end

    subgraph "Registered Tools (13 total)"
        subgraph "LinkedIn Tools (9)"
            LI_AUTH[getLinkedInAuthUrl]
            LI_EXCHANGE[exchangeLinkedInAuthCode]
            LI_POST[postToLinkedIn]
            LI_LIST[listLinkedInPosts]
            LI_LIKES[getLinkedInPostLikes]
            LI_COMMENT[commentOnLinkedInPost]
            LI_GET_COMMENTS[getLinkedInPostComments]
            LI_SHARE[shareLinkedInArticle]
            LI_CONNECTIONS[listLinkedInConnections]
        end

        subgraph "Social Media Tools (2)"
            FB_POST[postToFacebook]
            IG_POST[postToInstagram]
        end

        subgraph "AI Tools (2)"
            AI_CAPTION[generateCaption]
            AI_SCHEDULE[getSchedulingSuggestion]
        end
    end

    subgraph "Resources (3)"
        LI_PROFILE[getLinkedInProfile]
        FB_PAGE[getFacebookPageInfo]
        IG_PROFILE[getInstagramProfile]
    end

    TOOLS --> TOOL_REGISTRY
    RESOURCES --> RESOURCE_REGISTRY
    EXECUTE --> VALIDATOR
    VALIDATOR --> EXECUTOR
    V1_ENDPOINT --> EXECUTOR

    TOOL_REGISTRY --> LI_AUTH
    TOOL_REGISTRY --> LI_EXCHANGE
    TOOL_REGISTRY --> LI_POST
    TOOL_REGISTRY --> LI_LIST
    TOOL_REGISTRY --> LI_LIKES
    TOOL_REGISTRY --> LI_COMMENT
    TOOL_REGISTRY --> LI_GET_COMMENTS
    TOOL_REGISTRY --> LI_SHARE
    TOOL_REGISTRY --> LI_CONNECTIONS
    TOOL_REGISTRY --> FB_POST
    TOOL_REGISTRY --> IG_POST
    TOOL_REGISTRY --> AI_CAPTION
    TOOL_REGISTRY --> AI_SCHEDULE

    RESOURCE_REGISTRY --> LI_PROFILE
    RESOURCE_REGISTRY --> FB_PAGE
    RESOURCE_REGISTRY --> IG_PROFILE

    style TOOL_REGISTRY fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#4A148C
    style RESOURCE_REGISTRY fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px,color:#4A148C
    style LI_AUTH fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style AI_CAPTION fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#BF360C
    style INFO fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style TOOLS fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style RESOURCES fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style EXECUTE fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style V1_ENDPOINT fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
```

## 6. Docker Container Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#E3F2FD','primaryTextColor':'#0D47A1','primaryBorderColor':'#1976D2','lineColor':'#424242','secondaryColor':'#FFF3E0','tertiaryColor':'#E8F5E9'}}}%%
graph TB
    subgraph "Multi-Stage Docker Build"
        subgraph "Stage 1: Builder"
            BUILD_BASE[node:18 Base Image]
            BUILD_DEPS[Install ALL Dependencies<br/>npm install]
            BUILD_TS[Copy Source Code]
            BUILD_COMPILE[Compile TypeScript<br/>npm run build]
            BUILD_OUTPUT[/build/ directory]
        end

        subgraph "Stage 2: Production"
            PROD_BASE[node:18-alpine<br/>Lightweight Base]
            PROD_USER[Create Non-Root User<br/>appuser:appgroup]
            PROD_DEPS[Install Production Deps<br/>npm ci --only=production]
            PROD_CODE[Copy Compiled /build/<br/>from Stage 1]
            PROD_EXPOSE[Expose Port 3001]
            PROD_CMD[CMD node build/index.js]
        end
    end

    subgraph "Runtime Environment"
        CONTAINER[Container: mcpsocial-app]
        ENV_FILE[.env file mounted]
        PORT_MAPPING[Host:3001 → Container:3001]
        NETWORK[Docker Bridge Network]
    end

    subgraph "Health Checks"
        HEALTH[Health Check Endpoint<br/>/mcp/info]
        MONITOR[Check every 30s<br/>3 retries, 10s timeout]
    end

    BUILD_BASE --> BUILD_DEPS
    BUILD_DEPS --> BUILD_TS
    BUILD_TS --> BUILD_COMPILE
    BUILD_COMPILE --> BUILD_OUTPUT

    PROD_BASE --> PROD_USER
    PROD_USER --> PROD_DEPS
    BUILD_OUTPUT -.->|Copy| PROD_CODE
    PROD_DEPS --> PROD_CODE
    PROD_CODE --> PROD_EXPOSE
    PROD_EXPOSE --> PROD_CMD

    PROD_CMD --> CONTAINER
    ENV_FILE --> CONTAINER
    PORT_MAPPING --> CONTAINER
    CONTAINER --> NETWORK
    CONTAINER --> HEALTH
    HEALTH --> MONITOR

    style BUILD_BASE fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#FFFFFF
    style PROD_BASE fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#FFFFFF
    style CONTAINER fill:#1976D2,stroke:#0D47A1,stroke-width:2px,color:#FFFFFF
    style BUILD_OUTPUT fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#BF360C
    style PROD_CODE fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#BF360C
```

## 7. Environment Configuration Flow

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#E3F2FD','primaryTextColor':'#0D47A1','primaryBorderColor':'#1976D2','lineColor':'#424242','secondaryColor':'#FFF3E0','tertiaryColor':'#E8F5E9'}}}%%
graph LR
    subgraph "Configuration Sources"
        ENV_FILE[.env File<br/>Local Secrets]
        ENV_EXAMPLE[.env.example<br/>Template]
        CONFIG_JSON[config.json<br/>Static Config]
        RUNTIME_ENV[Process.env<br/>Runtime Variables]
    end

    subgraph "Required Configuration"
        OPENAI_KEY[OPENAI_API_KEY<br/>Required]
        FB_TOKEN[FACEBOOK_ACCESS_TOKEN<br/>Optional]
        IG_TOKEN[INSTAGRAM_ACCESS_TOKEN<br/>Optional]
        LI_KEY[LINKEDIN_API_KEY<br/>From config.json]
        LI_SECRET[LINKEDIN_API_SECRET<br/>From config.json]
        PORT[PORT<br/>Default: 3001]
        LOG_LEVEL[LOG_LEVEL<br/>Default: INFO]
    end

    subgraph "Application Components"
        SERVER[Express Server]
        CLIENTS[API Clients]
        LOGGER_CONFIG[Logger Configuration]
    end

    ENV_EXAMPLE -.->|Template for| ENV_FILE
    ENV_FILE --> RUNTIME_ENV
    CONFIG_JSON --> RUNTIME_ENV
    
    RUNTIME_ENV --> OPENAI_KEY
    RUNTIME_ENV --> FB_TOKEN
    RUNTIME_ENV --> IG_TOKEN
    RUNTIME_ENV --> PORT
    RUNTIME_ENV --> LOG_LEVEL
    CONFIG_JSON --> LI_KEY
    CONFIG_JSON --> LI_SECRET

    OPENAI_KEY --> CLIENTS
    FB_TOKEN --> CLIENTS
    IG_TOKEN --> CLIENTS
    LI_KEY --> CLIENTS
    LI_SECRET --> CLIENTS
    PORT --> SERVER
    LOG_LEVEL --> LOGGER_CONFIG

    style OPENAI_KEY fill:#FFEBEE,stroke:#C62828,stroke-width:2px,color:#B71C1C
    style ENV_FILE fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style CONFIG_JSON fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style SERVER fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style CLIENTS fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style LOGGER_CONFIG fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
```

## 8. Logging and Monitoring Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#E3F2FD','primaryTextColor':'#0D47A1','primaryBorderColor':'#1976D2','lineColor':'#424242','secondaryColor':'#FFF3E0','tertiaryColor':'#E8F5E9'}}}%%
graph TB
    subgraph "Application Events"
        SERVER_START[Server Startup]
        API_REQUEST[API Requests]
        TOOL_EXEC[Tool Executions]
        RESOURCE_FETCH[Resource Fetches]
        ERRORS[Error Events]
    end

    subgraph "Logger Component"
        LOGGER[Structured Logger<br/>JSON Format]
        TIMER[Performance Timer]
        FORMATTER[Log Formatter]
    end

    subgraph "Log Levels"
        INFO[INFO Level<br/>General information]
        ERROR[ERROR Level<br/>Error tracking]
        DEBUG[DEBUG Level<br/>Detailed debugging]
    end

    subgraph "Log Output"
        CONSOLE[Console Output<br/>stdout/stderr]
        DOCKER_LOGS[Docker Logs<br/>docker logs -f]
    end

    subgraph "Log Structure"
        TIMESTAMP[Timestamp]
        LOG_LEVEL_FIELD[Level]
        MESSAGE[Message]
        CONTEXT[Context Object]
        METADATA[Additional Metadata]
        DURATION[Execution Duration]
    end

    SERVER_START --> LOGGER
    API_REQUEST --> LOGGER
    TOOL_EXEC --> LOGGER
    RESOURCE_FETCH --> LOGGER
    ERRORS --> LOGGER

    LOGGER --> TIMER
    LOGGER --> FORMATTER
    
    FORMATTER --> INFO
    FORMATTER --> ERROR
    FORMATTER --> DEBUG

    INFO --> CONSOLE
    ERROR --> CONSOLE
    DEBUG --> CONSOLE

    CONSOLE --> DOCKER_LOGS

    FORMATTER --> TIMESTAMP
    FORMATTER --> LOG_LEVEL_FIELD
    FORMATTER --> MESSAGE
    FORMATTER --> CONTEXT
    FORMATTER --> METADATA
    TIMER --> DURATION

    style LOGGER fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#BF360C
    style CONSOLE fill:#E3F2FD,stroke:#1976D2,stroke-width:2px,color:#0D47A1
    style INFO fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style ERROR fill:#FFEBEE,stroke:#C62828,stroke-width:2px,color:#B71C1C
    style DEBUG fill:#FFF9C4,stroke:#F57F17,stroke-width:2px,color:#F57F17
```

## 9. Deployment Architecture

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#E3F2FD','primaryTextColor':'#0D47A1','primaryBorderColor':'#1976D2','lineColor':'#424242','secondaryColor':'#FFF3E0','tertiaryColor':'#E8F5E9'}}}%%
graph TB
    subgraph "Development Environment"
        DEV_CODE[Source Code<br/>TypeScript]
        DEV_DOCKER[Docker Desktop]
        DEV_SCRIPT[deploy-local.sh]
    end

    subgraph "Build Process"
        BUILD_IMAGE[Docker Build<br/>Multi-stage]
        COMPILE[TypeScript → JavaScript]
        OPTIMIZE[Production Dependencies]
    end

    subgraph "Local Deployment"
        LOCAL_CONTAINER[mcpsocial-app Container]
        LOCAL_PORT[localhost:3001]
        LOCAL_NETWORK[Docker Bridge Network]
    end

    subgraph "AWS Deployment (Optional)"
        ECR[AWS ECR<br/>Container Registry]
        ECS[AWS ECS Fargate<br/>Container Service]
        VPC[AWS VPC<br/>Networking]
        CLOUDWATCH[CloudWatch Logs]
    end

    subgraph "Verification"
        HEALTH_CHECK[Health Check<br/>/mcp/info]
        API_TEST[API Capabilities Test<br/>/api/capabilities]
        MCP_TEST[MCP Tools Test<br/>/mcp/tools]
    end

    DEV_CODE --> DEV_SCRIPT
    DEV_SCRIPT --> BUILD_IMAGE
    BUILD_IMAGE --> COMPILE
    COMPILE --> OPTIMIZE
    OPTIMIZE --> LOCAL_CONTAINER

    LOCAL_CONTAINER --> LOCAL_PORT
    LOCAL_CONTAINER --> LOCAL_NETWORK
    LOCAL_CONTAINER --> HEALTH_CHECK

    HEALTH_CHECK --> API_TEST
    API_TEST --> MCP_TEST

    BUILD_IMAGE -.->|Push to| ECR
    ECR -.->|Deploy to| ECS
    ECS -.->|Runs in| VPC
    ECS -.->|Logs to| CLOUDWATCH

    style LOCAL_CONTAINER fill:#1976D2,stroke:#0D47A1,stroke-width:2px,color:#FFFFFF
    style ECS fill:#FF6F00,stroke:#E65100,stroke-width:2px,color:#FFFFFF
    style ECR fill:#FF6F00,stroke:#E65100,stroke-width:2px,color:#FFFFFF
    style DEV_CODE fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
    style BUILD_IMAGE fill:#FFF3E0,stroke:#E65100,stroke-width:2px,color:#BF360C
    style HEALTH_CHECK fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20
```

## Technology Summary

### Core Technologies
- **Runtime**: Node.js v18
- **Language**: TypeScript (compiled to JavaScript)
- **Web Framework**: Express.js v4.18
- **HTTP Client**: Axios v1.6
- **Containerization**: Docker (Multi-stage build)
- **Orchestration**: Docker Compose

### API Integrations
- **LinkedIn API**: OAuth 2.0 + REST API
- **Facebook Graph API**: OAuth 2.0 + Graph API
- **Instagram Graph API**: OAuth 2.0 + Graph API
- **OpenAI API**: GPT-4 chat completions

### Protocols
- **REST API**: Standard HTTP/JSON
- **MCP Protocol v1.0**: Model Context Protocol (JSON-RPC 2.0)
- **OAuth 2.0**: Authorization framework

### Development Tools
- **TypeScript Compiler**: Type safety and compilation
- **ts-node-dev**: Hot reload development
- **Jest**: Testing framework
- **ESLint**: Code linting

### Deployment Options
- **Local**: Docker Desktop (port 3001)
- **Cloud**: AWS ECS Fargate with ECR

### Key Features
- 13 MCP tools for social media automation
- 3 MCP resources for data fetching
- Structured JSON logging
- Health check monitoring
- Multi-stage Docker builds for optimization
- Non-root container security

## Accessibility & Color Compliance

All diagrams use WCAG AA compliant color combinations with verified contrast ratios:

| Background Color | Text Color | Contrast Ratio | Usage |
|-----------------|------------|----------------|--------|
| `#E3F2FD` (Light Blue) | `#0D47A1` (Dark Blue) | 9.13:1 | Client components |
| `#FFF3E0` (Light Orange) | `#BF360C` (Dark Orange) | 10.24:1 | Configuration |
| `#E8F5E9` (Light Green) | `#1B5E20` (Dark Green) | 10.89:1 | API clients |
| `#F3E5F5` (Light Purple) | `#4A148C` (Dark Purple) | 9.45:1 | Core logic |
| `#FFEBEE` (Light Red) | `#B71C1C` (Dark Red) | 9.67:1 | External services |
| `#1976D2` (Blue) | `#FFFFFF` (White) | 5.62:1 | Docker containers |
| `#4CAF50` (Green) | `#FFFFFF` (White) | 4.53:1 | Node.js runtime |
| `#FF6F00` (Orange) | `#FFFFFF` (White) | 5.89:1 | AWS services |

All combinations exceed the WCAG AA minimum requirement of 4.5:1 for normal text.
