// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import apiRoutes from './api/routes';
import { errorHandler } from './api/middleware/error-handler';
import { McpSocialHost } from './mcp-host';
import { createMcpV1Router } from './api/mcp-v1-routes';
import { logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 3001;
const mcpHost = new McpSocialHost();

app.use(express.json());

// Expose the regular API routes (including LinkedIn OAuth)
app.use('/api', apiRoutes);

// Expose MCP v1 protocol endpoints (JSON-RPC 2.0)
app.use('/mcp/v1', createMcpV1Router(mcpHost));

// Legacy MCP endpoints (backward compatibility)
app.get('/mcp/tools', (req: Request, res: Response) => {
  res.json(mcpHost.getTools());
});

app.post('/mcp/execute', async (req: Request, res: Response) => {
  try {
    const { toolName, params } = req.body;
    const result = await mcpHost.executeTool(toolName, params);
    res.json({ success: true, result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ success: false, error: errorMessage });
  }
});

// Add resources endpoint (was missing)
app.get('/mcp/resources', (req: Request, res: Response) => {
  res.json(mcpHost.getResources());
});

// Server info endpoint
app.get('/mcp/info', (req: Request, res: Response) => {
  res.json(mcpHost.getServerInfo());
});

// Root endpoint with server information
app.get('/', (req: Request, res: Response) => {
  const serverInfo = mcpHost.getServerInfo();
  res.json({
    message: 'MCPSocial Server is running!',
    version: serverInfo.version,
    protocolVersion: serverInfo.protocolVersion,
    endpoints: {
      api: '/api',
      mcpV1: '/mcp/v1',
      mcpLegacy: '/mcp',
    },
  });
});

app.use(errorHandler);

app.listen(port, () => {
  const serverInfo = mcpHost.getServerInfo();
  
  logger.info('MCPSocial Server Started', {
    endpoint: `http://localhost:${port}`
  }, {
    serverName: serverInfo.name,
    version: serverInfo.version,
    protocolVersion: serverInfo.protocolVersion,
    port,
    endpoints: {
      mcpV1: `/mcp/v1`,
      mcpLegacy: `/mcp/tools`,
      restApi: `/api`
    },
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'INFO'
  });
  
  // Keep console logs for backward compatibility
  console.log(`MCPSocial server listening at http://localhost:${port}`);
  console.log(`Server: ${serverInfo.name} v${serverInfo.version}`);
  console.log(`MCP Protocol: v${serverInfo.protocolVersion}`);
  console.log(`MCP v1 endpoints: http://localhost:${port}/mcp/v1`);
  console.log(`Legacy MCP endpoints: http://localhost:${port}/mcp/tools`);
  console.log(`REST API: http://localhost:${port}/api`);
});
