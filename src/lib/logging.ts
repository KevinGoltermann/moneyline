/**
 * Comprehensive logging service for debugging and monitoring
 */

import { ErrorSeverity } from './error-handling'

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: {
    name: string
    message: string
    stack?: string
  }
  metadata: {
    environment: string
    userAgent?: string
    url?: string
    userId?: string
    sessionId?: string
    requestId?: string
  }
}

export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteEndpoint?: string
  bufferSize: number
  flushInterval: number
}

class Logger {
  private config: LoggerConfig
  private buffer: LogEntry[] = []
  private flushTimer?: NodeJS.Timeout

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      bufferSize: 100,
      flushInterval: 30000, // 30 seconds
      ...config
    }

    // Start flush timer for remote logging
    if (this.config.enableRemote) {
      this.startFlushTimer()
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL]
    const currentLevelIndex = levels.indexOf(this.config.level)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        requestId: context?.requestId || this.generateRequestId()
      }
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }

    return entry
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return

    const { timestamp, level, message, context, error } = entry
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, context, error)
        break
      case LogLevel.INFO:
        console.info(prefix, message, context, error)
        break
      case LogLevel.WARN:
        console.warn(prefix, message, context, error)
        break
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(prefix, message, context, error)
        break
    }
  }

  private addToBuffer(entry: LogEntry): void {
    if (!this.config.enableRemote) return

    this.buffer.push(entry)

    // Flush buffer if it's full
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush()
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.config.enableRemote || !this.config.remoteEndpoint) {
      return
    }

    const entries = [...this.buffer]
    this.buffer = []

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entries })
      })
    } catch (error) {
      // If remote logging fails, log to console as fallback
      console.error('Failed to send logs to remote endpoint:', error)
      
      // Put entries back in buffer for retry (up to buffer size)
      this.buffer.unshift(...entries.slice(0, this.config.bufferSize - this.buffer.length))
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) return

    const entry = this.createLogEntry(level, message, context, error)
    
    this.logToConsole(entry)
    this.addToBuffer(entry)
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  critical(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.CRITICAL, message, context, error)
  }

  // Performance logging
  time(label: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${label}-start`)
    }
  }

  timeEnd(label: string, context?: Record<string, any>): void {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${label}-end`)
      window.performance.measure(label, `${label}-start`, `${label}-end`)
      
      const measure = window.performance.getEntriesByName(label, 'measure')[0]
      if (measure) {
        this.info(`Performance: ${label}`, {
          ...context,
          duration: measure.duration,
          startTime: measure.startTime
        })
      }
    }
  }

  // API request logging
  logApiRequest(
    method: string,
    url: string,
    status: number,
    duration: number,
    context?: Record<string, any>
  ): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO
    this.log(level, `API ${method} ${url}`, {
      ...context,
      method,
      url,
      status,
      duration,
      type: 'api_request'
    })
  }

  // User action logging
  logUserAction(action: string, context?: Record<string, any>): void {
    this.info(`User action: ${action}`, {
      ...context,
      type: 'user_action'
    })
  }

  // Business event logging
  logBusinessEvent(event: string, context?: Record<string, any>): void {
    this.info(`Business event: ${event}`, {
      ...context,
      type: 'business_event'
    })
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush() // Final flush
  }
}

// Create default logger instance
const defaultConfig: Partial<LoggerConfig> = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NEXT_PUBLIC_LOGGING_ENDPOINT
}

export const logger = new Logger(defaultConfig)

// Convenience functions
export const log = {
  debug: (message: string, context?: Record<string, any>) => logger.debug(message, context),
  info: (message: string, context?: Record<string, any>) => logger.info(message, context),
  warn: (message: string, context?: Record<string, any>) => logger.warn(message, context),
  error: (message: string, context?: Record<string, any>, error?: Error) => logger.error(message, context, error),
  critical: (message: string, context?: Record<string, any>, error?: Error) => logger.critical(message, context, error),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string, context?: Record<string, any>) => logger.timeEnd(label, context),
  apiRequest: (method: string, url: string, status: number, duration: number, context?: Record<string, any>) => 
    logger.logApiRequest(method, url, status, duration, context),
  userAction: (action: string, context?: Record<string, any>) => logger.logUserAction(action, context),
  businessEvent: (event: string, context?: Record<string, any>) => logger.logBusinessEvent(event, context)
}

// Error boundary logging
export function logErrorBoundary(error: Error, errorInfo: any, componentStack?: string): void {
  logger.critical('React Error Boundary caught error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    errorInfo,
    componentStack,
    type: 'error_boundary'
  }, error)
}

// Unhandled error logging
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.critical('Unhandled JavaScript error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: 'unhandled_error'
    }, event.error)
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.critical('Unhandled Promise rejection', {
      reason: event.reason,
      type: 'unhandled_rejection'
    })
  })
}

// Export Logger class
export { Logger }