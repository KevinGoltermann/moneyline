'use client'

import React from 'react'
import { TodayResponse } from '@/lib/types'

interface PerformanceOverviewProps {
  performance: TodayResponse['performance'] | null | undefined
  isLoading?: boolean
}

export default function PerformanceOverview({ performance, isLoading }: PerformanceOverviewProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="text-center">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="text-center">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!performance) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 text-center">
        <div className="text-gray-500 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Performance Data</h3>
        <p className="text-gray-500">Performance statistics are not yet available.</p>
      </div>
    )
  }

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 60) return 'text-green-600'
    if (winRate >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getWinRateBgColor = (winRate: number) => {
    if (winRate >= 60) return 'bg-green-50 border-green-200'
    if (winRate >= 50) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Algorithm Performance</h2>
        <div className="text-sm text-gray-500">
          Current Track Record
        </div>
      </div>

      <div className={`rounded-lg p-4 mb-4 border ${getWinRateBgColor(performance.winRate)}`}>
        <div className="text-center">
          <div className={`text-3xl font-bold mb-1 ${getWinRateColor(performance.winRate)}`}>
            {performance.winRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Win Rate</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {performance.record}
          </div>
          <div className="text-sm text-gray-500">Record</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {performance.totalPicks}
          </div>
          <div className="text-sm text-gray-500">Total Picks</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Performance Status:</span>
          <span className={`font-medium ${getWinRateColor(performance.winRate)}`}>
            {performance.winRate >= 60 ? 'Excellent' : 
             performance.winRate >= 50 ? 'Good' : 'Needs Improvement'}
          </span>
        </div>
      </div>
    </div>
  )
}