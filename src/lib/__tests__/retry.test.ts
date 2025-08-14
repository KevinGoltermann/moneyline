/**
 * Tests for retry utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withRetry, fetchWithRetry, CircuitBreaker, batchWithRetry } from '../retry'
import { AppError, ERROR_CODES, ErrorSeverity } from '../error-handling'

// Mock fetch globally
global.fetch = vi.fn()

describe('retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await withRetry(operation)

      expect(result.data).toBe('success')
      expect(result.attempts).toBe(1)
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new AppError('Server error', ERROR_CODES.EXTERNAL_API_ERROR, 500))
        .mockResolvedValue('success')

      const result = await withRetry(operation, { maxAttempts: 3, baseDelayMs: 10 })

      expect(result.data).toBe('success')
      expect(result.attempts).toBe(2)
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new AppError('Validation error', ERROR_CODES.VALIDATION_ERROR, 400))

      await expect(withRetry(operation)).rejects.toThrow(AppError)
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should fail after max attempts', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new AppError('Server error', ERROR_CODES.EXTERNAL_API_ERROR, 500))

      await expect(withRetry(operation, { maxAttempts: 2, baseDelayMs: 10 })).rejects.toThrow(AppError)
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn()
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success')

      await withRetry(operation, { 
        maxAttempts: 3, 
        baseDelayMs: 10,
        onRetry,
        retryCondition: () => true
      })

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
    })

    it('should use custom retry condition', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new Error('Custom error'))

      const customRetryCondition = vi.fn().mockReturnValue(false)

      await expect(withRetry(operation, { 
        retryCondition: customRetryCondition 
      })).rejects.toThrow()

      expect(customRetryCondition).toHaveBeenCalledWith(expect.any(Error))
      expect(operation).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockResponse = new Response('success', { status: 200 })
      vi.mocked(fetch).mockResolvedValue(mockResponse)

      const result = await fetchWithRetry('http://example.com')

      expect(result).toBe(mockResponse)
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('should retry on server errors', async () => {
      const errorResponse = new Response('Server Error', { status: 500 })
      const successResponse = new Response('success', { status: 200 })
      
      vi.mocked(fetch)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValue(successResponse)

      const result = await fetchWithRetry('http://example.com', {}, { baseDelayMs: 10 })

      expect(result).toBe(successResponse)
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should not retry on client errors', async () => {
      const errorResponse = new Response('Bad Request', { status: 400 })
      vi.mocked(fetch).mockResolvedValue(errorResponse)

      await expect(fetchWithRetry('http://example.com')).rejects.toThrow(AppError)
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new TypeError('Network error'))

      await expect(fetchWithRetry('http://example.com', {}, { maxAttempts: 2, baseDelayMs: 10 }))
        .rejects.toThrow(AppError)
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('CircuitBreaker', () => {
    it('should allow requests when closed', async () => {
      const circuitBreaker = new CircuitBreaker(3, 1000)
      const operation = vi.fn().mockResolvedValue('success')

      const result = await circuitBreaker.execute(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should open after failure threshold', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000)
      const operation = vi.fn().mockRejectedValue(new Error('Service error'))

      // First two failures
      await expect(circuitBreaker.execute(operation)).rejects.toThrow()
      await expect(circuitBreaker.execute(operation)).rejects.toThrow()

      // Circuit should be open now
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(AppError)
      
      // Operation should not be called for the third attempt
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should transition to half-open after recovery time', async () => {
      const circuitBreaker = new CircuitBreaker(1, 50) // 50ms recovery time
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValue('success')

      // Trigger circuit open
      await expect(circuitBreaker.execute(operation)).rejects.toThrow()

      // Should be open immediately
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(AppError)

      // Wait for recovery time
      await new Promise(resolve => setTimeout(resolve, 60))

      // Should be half-open and allow one request
      const result = await circuitBreaker.execute(operation)
      expect(result).toBe('success')
    })

    it('should reset on successful half-open request', async () => {
      const circuitBreaker = new CircuitBreaker(1, 50)
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValue('success')

      // Open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow()

      // Wait and succeed
      await new Promise(resolve => setTimeout(resolve, 60))
      await circuitBreaker.execute(operation)

      // Should be closed now
      const state = circuitBreaker.getState()
      expect(state.state).toBe('closed')
      expect(state.failures).toBe(0)
    })

    it('should provide state information', () => {
      const circuitBreaker = new CircuitBreaker(3, 1000)
      const state = circuitBreaker.getState()

      expect(state.state).toBe('closed')
      expect(state.failures).toBe(0)
      expect(state.lastFailureTime).toBe(0)
    })

    it('should reset state', () => {
      const circuitBreaker = new CircuitBreaker(1, 1000)
      
      // Trigger failure
      circuitBreaker.execute(() => Promise.reject(new Error('test'))).catch(() => {})
      
      circuitBreaker.reset()
      const state = circuitBreaker.getState()

      expect(state.state).toBe('closed')
      expect(state.failures).toBe(0)
      expect(state.lastFailureTime).toBe(0)
    })
  })

  describe('batchWithRetry', () => {
    it('should process all items successfully', async () => {
      const items = [1, 2, 3]
      const operation = vi.fn().mockImplementation((item: number) => Promise.resolve(item * 2))

      const results = await batchWithRetry(items, operation, { concurrency: 2 })

      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ item: 1, result: 2 })
      expect(results[1]).toEqual({ item: 2, result: 4 })
      expect(results[2]).toEqual({ item: 3, result: 6 })
    })

    it('should handle errors when continueOnError is true', async () => {
      const items = [1, 2, 3]
      const operation = vi.fn()
        .mockResolvedValueOnce(2)
        .mockRejectedValueOnce(new Error('Error for item 2'))
        .mockResolvedValueOnce(6)

      const results = await batchWithRetry(items, operation, { 
        concurrency: 1, 
        continueOnError: true 
      })

      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ item: 1, result: 2 })
      expect(results[1]).toEqual({ item: 2, error: expect.any(Error) })
      expect(results[2]).toEqual({ item: 3, result: 6 })
    })

    it('should stop on first error when continueOnError is false', async () => {
      const items = [1, 2, 3]
      const operation = vi.fn()
        .mockResolvedValueOnce(2)
        .mockRejectedValueOnce(new Error('Error for item 2'))

      await expect(batchWithRetry(items, operation, { 
        concurrency: 1, 
        continueOnError: false 
      })).rejects.toThrow()
    })

    it('should respect concurrency limit', async () => {
      const items = [1, 2, 3, 4, 5]
      let concurrentCalls = 0
      let maxConcurrentCalls = 0

      const operation = vi.fn().mockImplementation(async (item: number) => {
        concurrentCalls++
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls)
        await new Promise(resolve => setTimeout(resolve, 10))
        concurrentCalls--
        return item * 2
      })

      await batchWithRetry(items, operation, { concurrency: 2 })

      expect(maxConcurrentCalls).toBeLessThanOrEqual(2)
    })
  })
})