/**
 * Enhanced Logger Utility for MCP Server
 * Provides structured logging with request/response tracking for better observability
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  requestId?: string;
  method?: string;
  endpoint?: string;
  toolName?: string;
  resourceName?: string;
  userId?: string;
  timestamp?: string;
  duration?: number;
}

export interface ApiCallLog {
  type: 'API_CALL';
  api: string;
  endpoint: string;
  method: string;
  payload?: unknown;
  headers?: Record<string, string>;
  timestamp: string;
}

export interface ApiResponseLog {
  type: 'API_RESPONSE';
  api: string;
  endpoint: string;
  statusCode?: number;
  response?: unknown;
  error?: string;
  duration: number;
  timestamp: string;
}

export interface ToolExecutionLog {
  type: 'TOOL_EXECUTION';
  toolName: string;
  params: unknown;
  timestamp: string;
}

export interface ToolResultLog {
  type: 'TOOL_RESULT';
  toolName: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
  timestamp: string;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.logLevel = LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const logEntry: Record<string, unknown> = {
      timestamp,
      level,
      message,
      service: 'mcpsocial',
    };
    
    if (context) {
      logEntry.context = context;
    }
    
    if (data) {
      logEntry.data = data;
    }
    
    return JSON.stringify(logEntry);
  }

  debug(message: string, context?: LogContext, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatLog(LogLevel.DEBUG, message, context, data));
    }
  }

  info(message: string, context?: LogContext, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatLog(LogLevel.INFO, message, context, data));
    }
  }

  warn(message: string, context?: LogContext, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(LogLevel.WARN, message, context, data));
    }
  }

  error(message: string, context?: LogContext, data?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatLog(LogLevel.ERROR, message, context, data));
    }
  }

  /**
   * Log API call details
   */
  logApiCall(api: string, endpoint: string, method: string, payload?: unknown, headers?: Record<string, string>): void {
    const logData: ApiCallLog = {
      type: 'API_CALL',
      api,
      endpoint,
      method,
      payload: this.sanitizePayload(payload),
      headers: this.sanitizeHeaders(headers),
      timestamp: new Date().toISOString(),
    };
    this.info(`API Call: ${api} ${method} ${endpoint}`, undefined, logData);
  }

  /**
   * Log API response details
   */
  logApiResponse(
    api: string,
    endpoint: string,
    statusCode: number | undefined,
    response: unknown,
    error: string | undefined,
    duration: number
  ): void {
    const logData: ApiResponseLog = {
      type: 'API_RESPONSE',
      api,
      endpoint,
      statusCode,
      response: this.sanitizePayload(response),
      error,
      duration,
      timestamp: new Date().toISOString(),
    };

    if (error || (statusCode && statusCode >= 400)) {
      this.error(`API Response Error: ${api} ${endpoint}`, undefined, logData);
    } else {
      this.info(`API Response: ${api} ${endpoint}`, undefined, logData);
    }
  }

  /**
   * Log tool execution
   */
  logToolExecution(toolName: string, params: unknown): void {
    const logData: ToolExecutionLog = {
      type: 'TOOL_EXECUTION',
      toolName,
      params: this.sanitizePayload(params),
      timestamp: new Date().toISOString(),
    };
    this.info(`Tool Execution Started: ${toolName}`, { toolName }, logData);
  }

  /**
   * Log tool result
   */
  logToolResult(toolName: string, success: boolean, result: unknown, error: string | undefined, duration: number): void {
    const logData: ToolResultLog = {
      type: 'TOOL_RESULT',
      toolName,
      success,
      result: this.sanitizePayload(result),
      error,
      duration,
      timestamp: new Date().toISOString(),
    };

    if (success) {
      this.info(`Tool Execution Completed: ${toolName}`, { toolName, duration }, logData);
    } else {
      this.error(`Tool Execution Failed: ${toolName}`, { toolName, duration }, logData);
    }
  }

  /**
   * Sanitize sensitive data from payloads
   */
  private sanitizePayload(payload: unknown): unknown {
    if (!payload) return payload;
    
    const sensitiveKeys = ['accessToken', 'token', 'password', 'secret', 'apiKey', 'client_secret', 'authorization'];
    
    if (typeof payload === 'object' && payload !== null) {
      const sanitized = { ...payload } as Record<string, unknown>;
      
      for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
          sanitized[key] = '***REDACTED***';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizePayload(sanitized[key]);
        }
      }
      
      return sanitized;
    }
    
    return payload;
  }

  /**
   * Sanitize sensitive headers
   */
  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return headers;
    
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }

  /**
   * Create a timer for measuring duration
   */
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
}

// Export a singleton instance
export const logger = new Logger();
