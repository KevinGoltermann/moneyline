/**
 * Retry logic utilities for external API calls and unreliable operations
 */

import { AppError, ERROR_CODES, ErrorSeverity, logError } from './error-handling'

export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  retryCondition?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

export interface RetryResult<T> {
  data: T
  attempts: number
  totalTime: number
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: any) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error instanceof AppError) {
      return [
        ERROR_CODES.EXTERNAL_API_ERROR,
        ERROR_CODES.TIMEOUT_ERROR,
        ERROR_CODES.ODDS_API_ERROR,
        ERROR_CODES.WEATHER_API_ERROR
      ].includes(error.code as any) && error.statusCode >= 500
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true // Network errors
    }
    
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return true // Timeout errors
    }
    
    // HTTP response errors
    if (error.status >= 500 && error.status < 600) {
      return true // Server errors
    }
    
    if (error.status === 429) {
      return true // Rate limiting
    }
    
    return false
  },
  onRetry: (attempt: number, error: any) => {
    logError(
      `Retry attempt ${attempt} after error: ${error.message}`,
      ERROR_CODES.EXTERNAL_API_ERROR,
      undefined,
      { attempt, originalError: error.message }
    )
  }
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  const startTime = Date.now()
  
  let lastError: any
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const data = await operation()
      const totalTime = Date.now() - startTime
      
      return {
        data,
        attempts: attempt,
        totalTime
      }
    } catch (error) {
      lastError = error
      
      // Don't retry if this is the last attempt
      if (attempt === config.maxAttempts) {
        break
      }
      
      // Check if we should retry this error
      if (!config.retryCondition(error)) {
        break
      }
      
      // Call retry callback
      config.onRetry(attempt, error)
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      )
      
      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000
      
      await sleep(jitteredDelay)
    }
  }
  
  // All attempts failed, throw the last error
  const totalTime = Date.now() - startTime
  
  if (lastError instanceof AppError) {
    throw new AppError(
      lastError.message,
      lastError.code,
      lastError.statusCode,
      lastError.severity,
      {
        ...lastError.context,
        retryAttempts: config.maxAttempts,
        totalTime
      }
    )
  }
  
  throw new AppError(
    `Operation failed after ${config.maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`,
    ERROR_CODES.EXTERNAL_API_ERROR,
    503,
    ErrorSeverity.HIGH,
    {
      retryAttempts: config.maxAttempts,
      totalTime,
      originalError: lastError?.message || String(lastError)
    }
  )
}

/**
 * Retry wrapper specifically for fetch requests
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const operation = async (): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Check if response is ok
      if (!response.ok) {
        throw new AppError(
          `HTTP ${response.status}: ${response.statusText}`,
          ERROR_CODES.EXTERNAL_API_ERROR,
          response.status,
          response.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
          {
            url,
            status: response.status,
            statusText: response.statusText
          }
        )
      }
      
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        throw new AppError(
          'Request timeout',
          ERROR_CODES.TIMEOUT_ERROR,
          408,
          ErrorSeverity.MEDIUM,
          { url, timeout: 10000 }
        )
      }
      
      if (error instanceof AppError) {
        throw error
      }
      
      throw new AppError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        ERROR_CODES.EXTERNAL_API_ERROR,
        503,
        ErrorSeverity.HIGH,
        { url, originalError: error instanceof Error ? error.message : String(error) }
      )
    }
  }
  
  const result = await withRetry(operation, {
    maxAttempts: 3,
    baseDelayMs: 1000,
    ...retryOptions
  })
  
  return result.data
}

/**
 * Circuit breaker pattern for external services
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeMs: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeMs) {
        this.state = 'half-open'
      } else {
        throw new AppError(
          'Circuit breaker is open - service temporarily unavailable',
          ERROR_CODES.EXTERNAL_API_ERROR,
          503,
          ErrorSeverity.HIGH,
          {
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime
          }
        )
      }
    }
    
    try {
      const result = await operation()
      
      // Success - reset circuit breaker
      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failures = 0
      }
      
      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'open'
      }
      
      throw error
    }
  }
  
  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
  
  reset(): void {
    this.state = 'closed'
    this.failures = 0
    this.lastFailureTime = 0
  }
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Batch retry operations with concurrency control
 */
export async function batchWithRetry<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: {
    concurrency?: number
    retryOptions?: RetryOptions
    continueOnError?: boolean
  } = {}
): Promise<Array<{ item: T; result?: R; error?: any }>> {
  const { concurrency = 3, retryOptions = {}, continueOnError = true } = options
  const results: Array<{ item: T; result?: R; error?: any }> = []
  
  // Process items in batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await withRetry(() => operation(item), retryOptions)
        return { item, result: result.data }
      } catch (error) {
        if (continueOnError) {
          return { item, error }
        }
        throw error
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }
  
  return results
}