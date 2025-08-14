/**
 * Client-side error handling hook for React components
 */

import { useState, useCallback } from 'react'
import { ErrorResponse } from '@/lib/types'

export interface ErrorState {
  error: string | null
  code: string | null
  details?: any
  isRetrying: boolean
}

export interface UseErrorHandlerReturn {
  error: ErrorState
  setError: (error: string | Error | ErrorResponse | null) => void
  clearError: () => void
  retry: (retryFn: () => Promise<void> | void) => Promise<void>
  isError: boolean
}

/**
 * Hook for handling errors in React components with retry functionality
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setErrorState] = useState<ErrorState>({
    error: null,
    code: null,
    details: undefined,
    isRetrying: false
  })

  const setError = useCallback((errorInput: string | Error | ErrorResponse | null) => {
    if (!errorInput) {
      setErrorState({
        error: null,
        code: null,
        details: undefined,
        isRetrying: false
      })
      return
    }

    if (typeof errorInput === 'string') {
      setErrorState({
        error: errorInput,
        code: 'CLIENT_ERROR',
        details: undefined,
        isRetrying: false
      })
    } else if (errorInput instanceof Error) {
      setErrorState({
        error: errorInput.message,
        code: 'CLIENT_ERROR',
        details: { stack: errorInput.stack },
        isRetrying: false
      })
    } else {
      // ErrorResponse from API
      setErrorState({
        error: errorInput.error,
        code: errorInput.code,
        details: errorInput.details,
        isRetrying: false
      })
    }
  }, [])

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      code: null,
      details: undefined,
      isRetrying: false
    })
  }, [])

  const retry = useCallback(async (retryFn: () => Promise<void> | void) => {
    setErrorState(prev => ({ ...prev, isRetrying: true }))
    
    try {
      await retryFn()
      clearError()
    } catch (retryError) {
      setError(retryError as Error)
    }
  }, [setError, clearError])

  return {
    error,
    setError,
    clearError,
    retry,
    isError: error.error !== null
  }
}

/**
 * Hook for handling API fetch operations with automatic error handling
 */
export function useApiCall<T = any>() {
  const { error, setError, clearError, retry, isError } = useErrorHandler()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<T | null>(null)

  const execute = useCallback(async (
    apiCall: () => Promise<Response>,
    options: {
      onSuccess?: (data: T) => void
      onError?: (error: ErrorResponse) => void
      retries?: number
      retryDelay?: number
    } = {}
  ) => {
    const { onSuccess, onError, retries = 0, retryDelay = 1000 } = options
    
    setLoading(true)
    clearError()

    let lastError: any
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await apiCall()
        
        if (!response.ok) {
          const errorData: ErrorResponse = await response.json()
          throw errorData
        }
        
        const responseData: T = await response.json()
        setData(responseData)
        setLoading(false)
        
        if (onSuccess) {
          onSuccess(responseData)
        }
        
        return responseData
        
      } catch (err) {
        lastError = err
        
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string' && err.code.includes('VALIDATION')) {
          break
        }
        
        // If this isn't the last attempt, wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
        }
      }
    }
    
    // All attempts failed
    setLoading(false)
    setError(lastError)
    
    if (onError && lastError) {
      onError(lastError)
    }
    
    throw lastError
    
  }, [clearError, setError])

  const retryLastCall = useCallback(async (lastApiCall: () => Promise<Response>) => {
    await retry(async () => {
      await execute(lastApiCall)
    })
  }, [retry, execute])

  return {
    data,
    loading,
    error,
    isError,
    execute,
    retry: retryLastCall,
    clearError,
    setError
  }
}

/**
 * Utility function to check if an error is retryable
 */
export function isRetryableError(error: ErrorResponse | Error): boolean {
  if (error instanceof Error) {
    // Network errors are usually retryable
    return error.name === 'TypeError' && error.message.includes('fetch')
  }
  
  // API errors
  const retryableCodes = [
    'TIMEOUT_ERROR',
    'EXTERNAL_API_ERROR',
    'ODDS_API_ERROR',
    'WEATHER_API_ERROR',
    'INTERNAL_ERROR'
  ]
  
  return retryableCodes.includes(error.code)
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: ErrorResponse | Error | string): string {
  if (typeof error === 'string') {
    return error
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'VALIDATION_ERROR': 'Please check your input and try again.',
    'UNAUTHORIZED': 'You are not authorized to perform this action.',
    'FORBIDDEN': 'Access denied. Please check your permissions.',
    'NOT_FOUND': 'The requested information could not be found.',
    'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
    'TIMEOUT_ERROR': 'The request took too long. Please try again.',
    'EXTERNAL_API_ERROR': 'External service is temporarily unavailable. Please try again later.',
    'ODDS_API_ERROR': 'Unable to fetch current odds. Please try again later.',
    'WEATHER_API_ERROR': 'Weather information is temporarily unavailable.',
    'ML_SERVICE_ERROR': 'Prediction service is temporarily unavailable. Please try again later.',
    'DATABASE_ERROR': 'Database connection issue. Please try again later.',
    'PICK_FETCH_ERROR': 'Unable to load today\'s pick. Please refresh the page.',
    'PERFORMANCE_FETCH_ERROR': 'Unable to load performance data. Please refresh the page.',
    'INTERNAL_ERROR': 'Something went wrong. Please try again later.'
  }
  
  return errorMessages[error.code] || error.error || 'An unexpected error occurred.'
}