'use client'

import { useState, useEffect, useCallback } from 'react'
import { TodayResponse, ErrorResponse } from '@/lib/types'
import { useApiCall, getUserFriendlyErrorMessage } from './useErrorHandler'

interface UseTodayDataReturn {
  data: TodayResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  isRetrying: boolean
}

export function useTodayData(): UseTodayDataReturn {
  const { data, loading, error, execute, retry, clearError } = useApiCall<TodayResponse>()
  const [isRetrying, setIsRetrying] = useState(false)

  const fetchData = useCallback(async () => {
    return fetch('/api/today', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }, [])

  const refetch = useCallback(async () => {
    setIsRetrying(true)
    try {
      await execute(fetchData, {
        retries: 2,
        retryDelay: 1000,
        onError: (error: ErrorResponse) => {
          console.error('Error fetching today data:', error)
        }
      })
    } catch (error) {
      // Error is already handled by useApiCall, just prevent uncaught promise
      console.error('Refetch error:', error)
    } finally {
      setIsRetrying(false)
    }
  }, [execute, fetchData])

  // Initial data fetch
  useEffect(() => {
    execute(fetchData, {
      retries: 2,
      retryDelay: 1000,
      onError: (error: ErrorResponse) => {
        console.error('Error fetching today data:', error)
      }
    }).catch(() => {
      // Error is already handled by useApiCall
    })
  }, [execute, fetchData])

  return {
    data,
    isLoading: loading,
    error: error.error ? getUserFriendlyErrorMessage(error.error) : null,
    refetch,
    isRetrying
  }
}