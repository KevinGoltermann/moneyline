/**
 * Tests for error handling utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  AppError,
  ERROR_CODES,
  ErrorSeverity,
  createErrorResponse,
  withErrorHandling,
  validateMethod,
  validateEnvVars,
  withTimeout,
  sanitizeErrorDetails
} from '../error-handling'

describe('error-handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('AppError', () => {
    it('should create AppError with all properties', () => {
      const error = new AppError(
        'Test error',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        ErrorSeverity.LOW,
        { field: 'test' }
      )

      expect(error.message).toBe('Test error')
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
      expect(error.statusCode).toBe(400)
      expect(error.severity).toBe(ErrorSeverity.LOW)
      expect(error.context).toEqual({ field: 'test' })
      expect(error.timestamp).toBeDefined()
      expect(error instanceof Error).toBe(true)
      expect(error instanceof AppError).toBe(true)
    })

    it('should use default values', () => {
      const error = new AppError('Test error', ERROR_CODES.INTERNAL_ERROR)

      expect(error.statusCode).toBe(500)
      expect(error.severity).toBe(ErrorSeverity.MEDIUM)
      expect(error.context).toBeUndefined()
    })
  })

  describe('createErrorResponse', () => {
    it('should create error response from string', () => {
      const response = createErrorResponse('Test error', ERROR_CODES.VALIDATION_ERROR, 400)

      expect(response).toBeInstanceOf(NextResponse)
      // Note: In test environment, we can't easily check the response body
      // but we can verify the function doesn't throw
    })

    it('should create error response from Error', () => {
      const error = new Error('Test error')
      const response = createErrorResponse(error, ERROR_CODES.INTERNAL_ERROR, 500)

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should create error response from AppError', () => {
      const error = new AppError('Test error', ERROR_CODES.VALIDATION_ERROR, 400)
      const response = createErrorResponse(error)

      expect(response).toBeInstanceOf(NextResponse)
    })
  })

  describe('withErrorHandling', () => {
    it('should handle successful execution', async () => {
      const mockHandler = vi.fn().mockResolvedValue('success')
      const wrappedHandler = withErrorHandling(mockHandler)

      const result = await wrappedHandler('arg1', 'arg2')

      expect(result).toBe('success')
      expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should handle AppError', async () => {
      const error = new AppError('Test error', ERROR_CODES.VALIDATION_ERROR, 400)
      const mockHandler = vi.fn().mockRejectedValue(error)
      const wrappedHandler = withErrorHandling(mockHandler)

      const result = await wrappedHandler()

      expect(result).toBeInstanceOf(NextResponse)
    })

    it('should handle generic Error', async () => {
      const error = new Error('Test error')
      const mockHandler = vi.fn().mockRejectedValue(error)
      const wrappedHandler = withErrorHandling(mockHandler)

      const result = await wrappedHandler()

      expect(result).toBeInstanceOf(NextResponse)
    })

    it('should handle TypeError (fetch errors)', async () => {
      const error = new TypeError('fetch failed')
      const mockHandler = vi.fn().mockRejectedValue(error)
      const wrappedHandler = withErrorHandling(mockHandler)

      const result = await wrappedHandler()

      expect(result).toBeInstanceOf(NextResponse)
    })

    it('should handle SyntaxError (JSON errors)', async () => {
      const error = new SyntaxError('Unexpected token in JSON')
      const mockHandler = vi.fn().mockRejectedValue(error)
      const wrappedHandler = withErrorHandling(mockHandler)

      const result = await wrappedHandler()

      expect(result).toBeInstanceOf(NextResponse)
    })
  })

  describe('validateMethod', () => {
    it('should pass for allowed method', () => {
      const request = new Request('http://localhost', { method: 'POST' })
      
      expect(() => validateMethod(request, ['POST', 'GET'])).not.toThrow()
    })

    it('should throw AppError for disallowed method', () => {
      const request = new Request('http://localhost', { method: 'DELETE' })
      
      expect(() => validateMethod(request, ['POST', 'GET'])).toThrow(AppError)
    })
  })

  describe('validateEnvVars', () => {
    it('should pass when all vars are present', () => {
      process.env.TEST_VAR = 'value'
      
      expect(() => validateEnvVars(['TEST_VAR'])).not.toThrow()
      
      delete process.env.TEST_VAR
    })

    it('should throw AppError when vars are missing', () => {
      expect(() => validateEnvVars(['MISSING_VAR'])).toThrow(AppError)
    })
  })

  describe('withTimeout', () => {
    it('should resolve when promise completes within timeout', async () => {
      const promise = Promise.resolve('success')
      
      const result = await withTimeout(promise, 1000)
      
      expect(result).toBe('success')
    })

    it('should reject when promise times out', async () => {
      const promise = new Promise(resolve => setTimeout(resolve, 2000))
      
      await expect(withTimeout(promise, 100)).rejects.toThrow(AppError)
    })

    it('should use custom error message', async () => {
      const promise = new Promise(resolve => setTimeout(resolve, 2000))
      
      await expect(withTimeout(promise, 100, 'Custom timeout')).rejects.toThrow('Custom timeout')
    })
  })

  describe('sanitizeErrorDetails', () => {
    it('should remove sensitive keys', () => {
      const details = {
        username: 'user',
        password: 'secret',
        apiKey: 'key123',
        token: 'token123',
        data: 'safe'
      }

      const sanitized = sanitizeErrorDetails(details)

      expect(sanitized.username).toBe('user')
      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.apiKey).toBe('[REDACTED]')
      expect(sanitized.token).toBe('[REDACTED]')
      expect(sanitized.data).toBe('safe')
    })

    it('should handle nested objects', () => {
      const details = {
        user: {
          name: 'John',
          password: 'secret'
        },
        config: {
          apiKey: 'key123'
        }
      }

      const sanitized = sanitizeErrorDetails(details)

      expect(sanitized.user.name).toBe('John')
      expect(sanitized.user.password).toBe('[REDACTED]')
      expect(sanitized.config.apiKey).toBe('[REDACTED]')
    })

    it('should handle arrays', () => {
      const details = {
        items: [
          { name: 'item1', secret: 'hidden' },
          { name: 'item2', token: 'hidden2' }
        ]
      }

      const sanitized = sanitizeErrorDetails(details)

      expect(sanitized.items[0].name).toBe('item1')
      expect(sanitized.items[0].secret).toBe('[REDACTED]')
      expect(sanitized.items[1].name).toBe('item2')
      expect(sanitized.items[1].token).toBe('[REDACTED]')
    })

    it('should handle non-object inputs', () => {
      expect(sanitizeErrorDetails('string')).toBe('string')
      expect(sanitizeErrorDetails(123)).toBe(123)
      expect(sanitizeErrorDetails(null)).toBe(null)
      expect(sanitizeErrorDetails(undefined)).toBe(undefined)
    })
  })
})