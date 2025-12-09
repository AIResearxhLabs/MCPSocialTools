import { Router, Request, Response } from 'express';
import { McpSocialHost } from '../mcp-host';
import { logger } from '../utils/logger';

/**
 * JSON-RPC 2.0 Request structure
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: unknown;
}

/**
 * JSON-RPC 2.0 Response structure
 */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * MCP v1 Router implementing JSON-RPC 2.0 protocol
 */
export function createMcpV1Router(mcpHost: McpSocialHost): Router {
  const router = Router();

  /**
   * Main MCP endpoint - handles all JSON-RPC 2.0 requests
   */
  router.post('/', async (req: Request, res: Response) => {
    const getTimer = logger.startTimer();
    const request = req.body as JsonRpcRequest;
    
    // Log incoming request
    logger.info('MCP JSON-RPC Request', { 
      method: request?.method,
      endpoint: '/mcp/v1'
    }, { 
      requestId: request?.id,
      method: request?.method,
      params: request?.params
    });

    // Validate JSON-RPC structure
    if (!request || request.jsonrpc !== '2.0' || !request.method) {
      const duration = getTimer();
      const errorResponse = {
        jsonrpc: '2.0',
        id: request?.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'Request must be a valid JSON-RPC 2.0 message',
        },
      } as JsonRpcResponse;
      
      logger.error('MCP JSON-RPC Invalid Request', {
        method: request?.method,
        endpoint: '/mcp/v1',
        duration
      }, { error: errorResponse.error });
      
      return res.status(400).json(errorResponse);
    }

    try {
      let result: unknown;

      switch (request.method) {
        case 'initialize':
          result = await handleInitialize(mcpHost);
          break;

        case 'tools/list':
          result = await handleToolsList(mcpHost);
          break;

        case 'tools/call':
          result = await handleToolsCall(mcpHost, request.params);
          break;

        case 'resources/list':
          result = await handleResourcesList(mcpHost);
          break;

        case 'resources/read':
          result = await handleResourcesRead(mcpHost, request.params);
          break;

        default:
          const duration = getTimer();
          const notFoundResponse = {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: 'Method not found',
              data: `Method "${request.method}" is not supported`,
            },
          } as JsonRpcResponse;
          
          logger.warn('MCP JSON-RPC Method Not Found', {
            method: request.method,
            endpoint: '/mcp/v1',
            duration
          }, { error: notFoundResponse.error });
          
          return res.status(404).json(notFoundResponse);
      }

      const duration = getTimer();
      const successResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result,
      } as JsonRpcResponse;
      
      logger.info('MCP JSON-RPC Response', {
        method: request.method,
        endpoint: '/mcp/v1',
        duration
      }, { 
        requestId: request.id,
        resultType: typeof result
      });
      
      res.json(successResponse);
    } catch (error) {
      const duration = getTimer();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: errorMessage,
        },
      } as JsonRpcResponse;
      
      logger.error('MCP JSON-RPC Internal Error', {
        method: request.method,
        endpoint: '/mcp/v1',
        duration
      }, { 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      res.status(500).json(errorResponse);
    }
  });

  /**
   * Legacy compatibility endpoint - lists tools
   */
  router.get('/tools/list', (req: Request, res: Response) => {
    try {
      const tools = mcpHost.getTools();
      res.json({
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * Legacy compatibility endpoint - lists resources
   */
  router.get('/resources/list', (req: Request, res: Response) => {
    try {
      const resources = mcpHost.getResources();
      res.json({
        resources: resources.map((resource) => ({
          name: resource.name,
          description: resource.description,
        })),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * Server info endpoint
   */
  router.get('/info', (req: Request, res: Response) => {
    res.json(mcpHost.getServerInfo());
  });

  return router;
}

/**
 * Handle initialize method
 */
async function handleInitialize(mcpHost: McpSocialHost) {
  const serverInfo = mcpHost.getServerInfo();
  return {
    protocolVersion: serverInfo.protocolVersion,
    serverInfo: {
      name: serverInfo.name,
      version: serverInfo.version,
    },
    capabilities: serverInfo.capabilities,
  };
}

/**
 * Handle tools/list method
 */
async function handleToolsList(mcpHost: McpSocialHost) {
  const tools = mcpHost.getTools();
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
}

/**
 * Handle tools/call method
 */
async function handleToolsCall(mcpHost: McpSocialHost, params: unknown) {
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid params: must be an object');
  }

  const { name, arguments: args } = params as { name: string; arguments: unknown };

  if (!name) {
    throw new Error('Invalid params: "name" is required');
  }

  const result = await mcpHost.executeTool(name, args);
  return {
    content: [
      {
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      },
    ],
  };
}

/**
 * Handle resources/list method
 */
async function handleResourcesList(mcpHost: McpSocialHost) {
  const resources = mcpHost.getResources();
  return {
    resources: resources.map((resource) => ({
      uri: `mcpsocial:///${resource.name}`,
      name: resource.name,
      description: resource.description,
      mimeType: 'application/json',
    })),
  };
}

/**
 * Handle resources/read method
 */
async function handleResourcesRead(mcpHost: McpSocialHost, params: unknown) {
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid params: must be an object');
  }

  const { uri, arguments: args } = params as { uri: string; arguments?: unknown };

  if (!uri) {
    throw new Error('Invalid params: "uri" is required');
  }

  // Extract resource name from URI (mcpsocial:///resourceName)
  const resourceName = uri.replace(/^mcpsocial:\/\/\//, '');

  const result = await mcpHost.fetchResource(resourceName, args || {});
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      },
    ],
  };
}
