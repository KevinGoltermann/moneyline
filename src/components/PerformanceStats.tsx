'use client'

import React from 'react'
import { PerformanceResponse } from '@/lib/types'

interface PerformanceStatsProps {
  stats: PerformanceResponse['stats']
  isLoading?: boolean
}

export default function PerformanceStats({ stats, isLoading }: PerformanceStatsProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-12 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
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

  const getStreakColor = (type: string) => {
    switch (type) {
      case 'win':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'loss':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStreakIcon = (type: string) => {
    switch (type) {
      case 'win':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )
      case 'loss':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )
    }
  }

  const formatStreak = (streak: { type: string; count: number }) => {
    if (streak.count === 0) return 'No active streak'
    const typeLabel = streak.type === 'win' ? 'W' : 'L'
    return `${typeLabel}${streak.count}`
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Performance Overview</h2>
        <div className="text-sm text-gray-500">
          Algorithm Statistics
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Win Rate */}
        <div className={`rounded-lg p-4 border ${getWinRateBgColor(stats.winRate)}`}>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-1 ${getWinRateColor(stats.winRate)}`}>
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Win Rate</div>
          </div>
        </div>

        {/* Total Picks */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {stats.totalPicks}
            </div>
            <div className="text-sm text-gray-600">Total Picks</div>
          </div>
        </div>

        {/* Record */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 mb-1">
              {stats.wins}-{stats.losses}
              {stats.pushes > 0 && `-${stats.pushes}`}
            </div>
            <div className="text-sm text-gray-600">
              W-L{stats.pushes > 0 ? '-P' : ''} Record
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.pushes > 0 && `${stats.pushes} pushes`}
            </div>
          </div>
        </div>

        {/* Current Streak */}
        <div className={`rounded-lg p-4 border ${getStreakColor(stats.currentStreak.type)}`}>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              {getStreakIcon(stats.currentStreak.type)}
              <span className="ml-2 text-2xl font-bold">
                {stats.currentStreak.count}
              </span>
            </div>
            <div className="text-sm text-gray-600">Current Streak</div>
            <div className="text-xs mt-1">
              {formatStreak(stats.currentStreak)}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{stats.wins}</div>
            <div className="text-sm text-gray-500">Wins</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{stats.losses}</div>
            <div className="text-sm text-gray-500">Losses</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pushes}</div>
            <div className="text-sm text-gray-500">Pushes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {stats.totalPicks - stats.wins - stats.losses - stats.pushes}
            </div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>
      </div>

      {/* Performance Status */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Performance Status:</span>
          <span className={`font-medium text-sm ${getWinRateColor(stats.winRate)}`}>
            {stats.winRate >= 60 ? 'Excellent' : 
             stats.winRate >= 55 ? 'Very Good' :
             stats.winRate >= 50 ? 'Good' : 
             stats.winRate >= 45 ? 'Fair' : 'Needs Improvement'}
          </span>
        </div>
      </div>
    </div>
  )
}