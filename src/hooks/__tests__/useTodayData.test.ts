import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTodayData } from '../useTodayData'
import { TodayResponse } from '@/lib/types'

// Mock the useErrorHandler hook
vi.mock('../useErrorHandler', () => ({
  useApiCall: vi.fn(),
  getUserFriendlyErrorMessage: vi.fn((error) => error.error || 'An error occurred')
}))

// Mock fetch
global.fetch = vi.fn()

const mockTodayResponse: TodayResponse = {
  pick: {
    id: 'test-pick-1',
    date: '2024-01-15',
    league: 'NBA',
    market: 'moneyline',
    selection: 'Lakers ML',
    odds: -110,
    confidence: 75.5,
    rationale: {
      topFactors: ['Strong home record', 'Key player returning'],
      reasoning: 'Lakers have a strong home record and key player is returning from injury.'
    }
  },
  performance: {
    winRate: 72.0,
    record: '18-7',
    totalPicks: 25
  }
}

describe('useTodayData', () => {
  const mockExecute = vi.fn()
  const mockRetry = vi.fn()
  const mockClearError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    const { useApiCall } = require('../useErrorHandler')
    useApiCall.mockReturnValue({
      data: null,
      loading: false,
      error: { error: null },
      execute: mockExecute,
      retry: mockRetry,
      clearError: mockClearError
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useTodayData())

    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.isRetrying).toBe(false)
    expect(typeof result.current.refetch).toBe('function')
  })

  it('should call execute on mount', () => {
    renderHook(() => useTodayData())

    expect(mockExecute).toHaveBeenCalledOnce()
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        retries: 2,
        retryDelay: 1000,
        onError: expect.any(Function)
      })
    )
  })

  it('should return loading state correctly', () => {
    const { useApiCall } = require('./useErrorHandler')
    useApiCall.mockReturnValue({
      data: null,
      loading: true,
      error: { error: null },
      execute: mockExecute,
      retry: mockRetry,
      clearError: mockClearError
    })

    const { result } = renderHook(() => useTodayData())

    expect(result.current.isLoading).toBe(true)
  })

  it('should return data when available', () => {
    const { useApiCall } = require('./useErrorHandler')
    useApiCall.mockReturnValue({
      data: mockTodayResponse,
      loading: false,
      error: { error: null },
      execute: mockExecute,
      retry: mockRetry,
      clearError: mockClearError
    })

    const { result } = renderHook(() => useTodayData())

    expect(result.current.data).toEqual(mockTodayResponse)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should return error when error occurs', () => {
    const { useApiCall, getUserFriendlyErrorMessage } = require('../useErrorHandler')
    const mockError = { error: 'Network error', code: 'NETWORK_ERROR' }
    
    useApiCall.mockReturnValue({
      data: null,
      loading: false,
      error: mockError,
      execute: mockExecute,
      retry: mockRetry,
      clearError: mockClearError
    })
    
    getUserFriendlyErrorMessage.mockReturnValue('Network error occurred')

    const { result } = renderHook(() => useTodayData())

    expect(result.current.error).toBe('Network error occurred')
    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle refetch correctly', async () => {
    const { result } = renderHook(() => useTodayData())

    expect(result.current.isRetrying).toBe(false)

    // Call refetch
    const refetchPromise = result.current.refetch()
    
    // Should set isRetrying to true during refetch
    expect(result.current.isRetrying).toBe(true)

    await refetchPromise

    // Should reset isRetrying after refetch
    await waitFor(() => {
      expect(result.current.isRetrying).toBe(false)
    })

    expect(mockExecute).toHaveBeenCalledTimes(2) // Once on mount, once on refetch
  })

  it('should create correct fetch function', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockTodayResponse
    } as Response)

    const { result } = renderHook(() => useTodayData())

    // Get the fetch function that was passed to execute
    const fetchFunction = mockExecute.mock.calls[0][0]
    
    // Call the fetch function
    await fetchFunction()

    expect(fetch).toHaveBeenCalledWith('/api/today', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

  it('should handle refetch errors gracefully', async () => {
    mockExecute.mockRejectedValue(new Error('Refetch failed'))

    const { result } = renderHook(() => useTodayData())

    // Should not throw when refetch fails
    await expect(result.current.refetch()).resolves.toBeUndefined()
    
    // Should reset isRetrying even on error
    await waitFor(() => {
      expect(result.current.isRetrying).toBe(false)
    })
  })

  it('should log errors to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    renderHook(() => useTodayData())

    // Get the onError callback that was passed to execute
    const onErrorCallback = mockExecute.mock.calls[0][1].onError
    const mockError = { error: 'Test error', code: 'TEST_ERROR' }
    
    onErrorCallback(mockError)

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching today data:', mockError)
    
    consoleSpy.mockRestore()
  })

  it('should use correct retry configuration', () => {
    renderHook(() => useTodayData())

    const executeOptions = mockExecute.mock.calls[0][1]
    expect(executeOptions.retries).toBe(2)
    expect(executeOptions.retryDelay).toBe(1000)
    expect(typeof executeOptions.onError).toBe('function')
  })
})