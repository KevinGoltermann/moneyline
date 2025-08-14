'use client'

import React, { useState, useEffect } from 'react'
import { PerformanceResponse, ErrorResponse } from '@/lib/types'
import PerformanceStats from '@/components/PerformanceStats'
import HistoryTable from '@/components/HistoryTable'
import WinRateChart from '@/components/WinRateChart'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [limit] = useState(50)

  const fetchPerformanceData = async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      
      const offset = (page - 1) * limit
      const response = await fetch(`/api/performance?limit=${limit}&offset=${offset}&includeChartData=true`)
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json()
        throw new Error(errorData.error || 'Failed to fetch performance data')
      }
      
      const performanceData: PerformanceResponse = await response.json()
      setData(performanceData)
      setCurrentPage(page)
    } catch (err) {
      console.error('Error fetching performance data:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPerformanceData(1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (page: number) => {
    fetchPerformanceData(page)
  }

  const handleRetry = () => {
    fetchPerformanceData(currentPage)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
          </div>
          <div className="grid gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Performance Data</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Performance Data Available</h2>
            <p className="text-gray-600">Performance data will appear once picks have been made and settled.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Performance Tracking</h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Track the ML algorithm&apos;s betting performance and historical results
            </p>
          </div>

          {/* Performance Stats */}
          <div className="mb-6 sm:mb-8">
            <PerformanceStats stats={data.stats} />
          </div>

          {/* Win Rate Chart */}
          {data.chartData && data.chartData.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <WinRateChart data={data.chartData} />
            </div>
          )}

          {/* History Table */}
          <div className="mb-6 sm:mb-8">
            <HistoryTable 
              history={data.history}
              currentPage={currentPage}
              limit={limit}
              onPageChange={handlePageChange}
              totalItems={data.stats.totalPicks}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}