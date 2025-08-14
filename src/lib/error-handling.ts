/**
 * Comprehensive error handling utilities for API routes and external services
 */

import { NextResponse } from 'next/server'
import { ErrorResponse } from '@/lib/types'

// Error codes for consistent error handling
export const ERROR_CODES = {
  // Client errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  ML_SERVICE_ERROR: 'ML_SERVICE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Business logic errors
  PICK_FETCH_ERROR: 'PICK_FETCH_ERROR',
  PERFORMANCE_FETCH_ERROR: 'PERFORMANCE_FETCH_ERROR',
  PICK_GENERATION_ERROR: 'PICK_GENERATION_ERROR',
  SETTLEMENT_ERROR: 'SETTLEMENT_ERROR',
  
  // External service errors
  ODDS_API_ERROR: 'ODDS_API_ERROR',
  WEATHER_API_ERROR: 'WEATHER_API_ERROR',
  NEWS_API_ERROR: 'NEWS_API_ERROR'
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

// Error severity levels for logging
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Enhanced error class with additional context
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly severity: ErrorSeverity
  public readonly context?: Record<string, any>
  public readonly timestamp: string

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.severity = severity
    this.context = context
    this.timestamp = new Date().toISOString()

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string | Error | AppError,
  code?: ErrorCode,
  statusCode: number = 500,
  details?: any
): NextResponse<ErrorResponse> {
  let errorMessage: string
  let errorCode: ErrorCode
  let finalStatusCode: number
  let errorDetails: any

  if (error instanceof AppError) {
    errorMessage = error.message
    errorCode = error.code
    finalStatusCode = error.statusCode
    errorDetails = {
      ...details,
      context: error.context,
      timestamp: error.timestamp,
      severity: error.severity
    }
  } else if (error instanceof Error) {
    errorMessage = error.message
    errorCode = code || ERROR_CODES.INTERNAL_ERROR
    finalStatusCode = statusCode
    errorDetails = {
      ...details,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  } else {
    errorMessage = String(error)
    errorCode = code || ERROR_CODES.INTERNAL_ERROR
    finalStatusCode = statusCode
    errorDetails = details
  }

  // Log the error
  logError(error, errorCode, finalStatusCode, errorDetails)

  const response: ErrorResponse = {
    error: errorMessage,
    code: errorCode,
    details: errorDetails
  }

  return NextResponse.json(response, { 
    status: finalStatusCode,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

/**
 * Enhanced error logging with structured format
 */
export function logError(
  error: string | Error | AppError,
  code?: ErrorCode,
  statusCode?: number,
  context?: any
): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level: 'error',
    message: error instanceof Error ? error.message : String(error),
    code: error instanceof AppError ? error.code : code,
    statusCode: error instanceof AppError ? error.statusCode : statusCode,
    severity: error instanceof AppError ? error.severity : ErrorSeverity.MEDIUM,
    context: error instanceof AppError ? error.context : context,
    stack: error instanceof Error ? error.stack : undefined,
    environment: process.env.NODE_ENV
  }

  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service (e.g., Sentry, LogRocket, etc.)
    console.error(JSON.stringify(logEntry))
  } else {
    // Development logging with better formatting
    console.error('🚨 Error occurred:', {
      message: logEntry.message,
      code: logEntry.code,
      statusCode: logEntry.statusCode,
      severity: logEntry.severity,
      context: logEntry.context,
      stack: logEntry.stack
    })
  }
}

/**
 * Wrap async API route handlers with error handling
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<ErrorResponse>> => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof AppError) {
        return createErrorResponse(error)
      }
      
      // Handle specific error types
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return createErrorResponse(
          'External service unavailable',
          ERROR_CODES.EXTERNAL_API_ERROR,
          503,
          { originalError: error.message }
        )
      }

      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return createErrorResponse(
          'Invalid JSON in request',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { originalError: error.message }
        )
      }

      // Default error handling
      return createErrorResponse(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        ERROR_CODES.INTERNAL_ERROR,
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    }
  }
}

/**
 * Validate request method
 */
export function validateMethod(request: Request, allowedMethods: string[]): void {
  if (!allowedMethods.includes(request.method)) {
    throw new AppError(
      `Method ${request.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
      ERROR_CODES.METHOD_NOT_ALLOWED,
      405,
      ErrorSeverity.LOW,
      { method: request.method, allowedMethods }
    )
  }
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing required environment variables: ${missing.join(', ')}`,
      ERROR_CODES.INTERNAL_ERROR,
      500,
      ErrorSeverity.CRITICAL,
      { missingVars: missing }
    )
  }
}

/**
 * Create timeout wrapper for async operations
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AppError(
          errorMessage,
          ERROR_CODES.TIMEOUT_ERROR,
          408,
          ErrorSeverity.MEDIUM,
          { timeoutMs }
        ))
      }, timeoutMs)
    })
  ])
}

/**
 * Sanitize error details for client response
 */
export function sanitizeErrorDetails(details: any): any {
  if (!details || typeof details !== 'object') {
    return details
  }

  const sanitized = { ...details }
  
  // Remove sensitive information
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential']
  
  function removeSensitiveData(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(removeSensitiveData)
    }
    
    if (obj && typeof obj === 'object') {
      const cleaned: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase()
        const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))
        
        if (isSensitive) {
          cleaned[key] = '[REDACTED]'
        } else {
          cleaned[key] = removeSensitiveData(value)
        }
      }
      return cleaned
    }
    
    return obj
  }

  return removeSensitiveData(sanitized)
}