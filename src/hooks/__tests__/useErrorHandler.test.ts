/**
 * Tests for useErrorHandler hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useErrorHandler, useApiCall, isRetryableError, getUserFriendlyErrorMessage } from '../useErrorHandler'
import { ErrorResponse } from '@/lib/types'

// Mock fetch globally
global.fetch = vi.fn()

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useErrorHandler', () => {
    it('should initialize with no error', () => {
      const { result } = renderHook(() => useErrorHandler())

      expect(result.current.error.error).toBeNull()
      expect(result.current.error.code).toBeNull()
      expect(result.current.isError).toBe(false)
    })

    it('should set error from string', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        result.current.setError('Test error')
      })

      expect(result.current.error.error).toBe('Test error')
      expect(result.current.error.code).toBe('CLIENT_ERROR')
      expect(result.current.isError).toBe(true)
    })

    it('should set error from Error object', () => {
      const { result } = renderHook(() => useErrorHandler())
      const error = new Error('Test error')

      act(() => {
        result.current.setError(error)
      })

      expect(result.current.error.error).toBe('Test error')
      expect(result.current.error.code).toBe('CLIENT_ERROR')
      expect(result.current.error.details).toEqual({ stack: error.stack })
      expect(result.current.isError).toBe(true)
    })

    it('should set error from ErrorResponse', () => {
      const { result } = renderHook(() => useErrorHandler())
      const errorResponse: ErrorResponse = {
        error: 'API error',
        code: 'VALIDATION_ERROR',
        details: { field: 'test' }
      }

      act(() => {
        result.current.setError(errorResponse)
      })

      expect(result.current.error.error).toBe('API error')
      expect(result.current.error.code).toBe('VALIDATION_ERROR')
      expect(result.current.error.details).toEqual({ field: 'test' })
      expect(result.current.isError).toBe(true)
    })

    it('should clear error', () => {
      const { result } = renderHook(() => useErrorHandler())

      act(() => {
        result.current.setError('Test error')
      })

      expect(result.current.isError).toBe(true)

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error.error).toBeNull()
      expect(result.current.isError).toBe(false)
    })

    it('should handle retry success', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const retryFn = vi.fn().mockResolvedValue(undefined)

      act(() => {
        result.current.setError('Initial error')
      })

      expect(result.current.isError).toBe(true)

      await act(async () => {
        await result.current.retry(retryFn)
      })

      expect(retryFn).toHaveBeenCalledTimes(1)
      expect(result.current.isError).toBe(false)
    })

    it('should handle retry failure', async () => {
      const { result } = renderHook(() => useErrorHandler())
      const retryError = new Error('Retry failed')
      const retryFn = vi.fn().mockRejectedValue(retryError)

      await act(async () => {
        await result.current.retry(retryFn)
      })

      expect(retryFn).toHaveBeenCalledTimes(1)
      expect(result.current.error.error).toBe('Retry failed')
      expect(result.current.isError).toBe(true)
    })
  })

  describe('useApiCall', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useApiCall())

      expect(result.current.data).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.isError).toBe(false)
    })

    it('should handle successful API call', async () => {
      const { result } = renderHook(() => useApiCall<{ message: string }>())
      const mockResponse = { message: 'success' }
      
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))

      const apiCall = () => fetch('/api/test')

      await act(async () => {
        await result.current.execute(apiCall)
      })

      expect(result.current.data).toEqual(mockResponse)
      expect(result.current.loading).toBe(false)
      expect(result.current.isError).toBe(false)
    })

    it('should handle API error', async () => {
      const { result } = renderHook(() => useApiCall())
      const errorResponse: ErrorResponse = {
        error: 'API error',
        code: 'VALIDATION_ERROR'
      }
      
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }))

      const apiCall = () => fetch('/api/test')

      await act(async () => {
        try {
          await result.current.execute(apiCall)
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.isError).toBe(true)
      expect(result.current.error.error).toBe('API error')
    })

    it('should retry on retryable errors', async () => {
      const { result } = renderHook(() => useApiCall<{ message: string }>())
      const mockResponse = { message: 'success' }
      
      // First call fails, second succeeds
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }))

      const apiCall = () => fetch('/api/test')

      await act(async () => {
        await result.current.execute(apiCall, { retries: 1, retryDelay: 10 })
      })

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(result.current.data).toEqual(mockResponse)
      expect(result.current.isError).toBe(false)
    })

    it('should call onSuccess callback', async () => {
      const { result } = renderHook(() => useApiCall<{ message: string }>())
      const mockResponse = { message: 'success' }
      const onSuccess = vi.fn()
      
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))

      const apiCall = () => fetch('/api/test')

      await act(async () => {
        await result.current.execute(apiCall, { onSuccess })
      })

      expect(onSuccess).toHaveBeenCalledWith(mockResponse)
    })

    it('should call onError callback', async () => {
      const { result } = renderHook(() => useApiCall())
      const errorResponse: ErrorResponse = {
        error: 'API error',
        code: 'VALIDATION_ERROR'
      }
      const onError = vi.fn()
      
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }))

      const apiCall = () => fetch('/api/test')

      await act(async () => {
        try {
          await result.current.execute(apiCall, { onError })
        } catch (error) {
          // Expected to throw
        }
      })

      expect(onError).toHaveBeenCalledWith(errorResponse)
    })
  })

  describe('isRetryableError', () => {
    it('should identify retryable error codes', () => {
      const retryableError: ErrorResponse = {
        error: 'Timeout',
        code: 'TIMEOUT_ERROR'
      }

      expect(isRetryableError(retryableError)).toBe(true)
    })

    it('should identify non-retryable error codes', () => {
      const nonRetryableError: ErrorResponse = {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR'
      }

      expect(isRetryableError(nonRetryableError)).toBe(false)
    })

    it('should identify retryable Error objects', () => {
      const networkError = new TypeError('fetch failed')

      expect(isRetryableError(networkError)).toBe(true)
    })

    it('should identify non-retryable Error objects', () => {
      const genericError = new Error('Generic error')

      expect(isRetryableError(genericError)).toBe(false)
    })
  })

  describe('getUserFriendlyErrorMessage', () => {
    it('should return string as-is', () => {
      expect(getUserFriendlyErrorMessage('Custom error')).toBe('Custom error')
    })

    it('should return Error message', () => {
      const error = new Error('Error message')
      expect(getUserFriendlyErrorMessage(error)).toBe('Error message')
    })

    it('should return user-friendly message for known error codes', () => {
      const errorResponse: ErrorResponse = {
        error: 'Technical validation error',
        code: 'VALIDATION_ERROR'
      }

      expect(getUserFriendlyErrorMessage(errorResponse)).toBe('Please check your input and try again.')
    })

    it('should return original error message for unknown codes', () => {
      const errorResponse: ErrorResponse = {
        error: 'Unknown technical error',
        code: 'UNKNOWN_ERROR'
      }

      expect(getUserFriendlyErrorMessage(errorResponse)).toBe('Unknown technical error')
    })

    it('should return default message for empty error', () => {
      const errorResponse: ErrorResponse = {
        error: '',
        code: 'UNKNOWN_ERROR'
      }

      expect(getUserFriendlyErrorMessage(errorResponse)).toBe('An unexpected error occurred.')
    })
  })
})