/**
 * Centralized logging utility
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    };

    // In development, log to console
    if (this.isDevelopment) {
      const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
      const logMessage = `[${entry.timestamp.toISOString()}] ${level.toUpperCase()}: ${message}${contextStr}`;
      
      switch (level) {
        case 'debug':
          console.debug(logMessage);
          break;
        case 'info':
          console.info(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        case 'error':
          console.error(logMessage);
          break;
      }
    }

    // In production, you could send to external logging service
    // this.sendToExternalService(entry);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }

  // Helper for API errors
  apiError(endpoint: string, error: unknown, statusCode?: number) {
    this.error('API Error', {
      endpoint,
      error: error instanceof Error ? error.message : String(error),
      statusCode,
    });
  }

  // Helper for socket events
  socketEvent(event: string, data?: unknown) {
    this.debug('Socket Event', {
      event,
      data: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const logger = new Logger();