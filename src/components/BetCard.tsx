'use client'

import React from 'react'
import { TodayResponse } from '@/lib/types'

interface BetCardProps {
  pick: TodayResponse['pick']
  isLoading?: boolean
}

export default function BetCard({ pick, isLoading }: BetCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!pick) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 text-center">
        <div className="text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Pick Available</h3>
        <p className="text-gray-500">
          Today&apos;s betting recommendation is not yet available. Check back later or contact support if this persists.
        </p>
      </div>
    )
  }

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Today&apos;s Pick</h2>
          <p className="text-sm text-gray-500">{new Date(pick.date).toLocaleDateString()}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(pick.confidence)}`}>
          {pick.confidence}% Confidence
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{pick.selection}</h3>
          <div className="flex justify-center items-center space-x-4 text-sm text-gray-600">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{pick.league}</span>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">{pick.market}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Odds</p>
          <p className="text-lg font-semibold text-gray-900">{formatOdds(pick.odds)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Confidence</p>
          <p className="text-lg font-semibold text-gray-900">{pick.confidence}%</p>
        </div>
      </div>

      {pick.rationale?.reasoning && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">AI Reasoning</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{pick.rationale.reasoning}</p>
        </div>
      )}
    </div>
  )
}