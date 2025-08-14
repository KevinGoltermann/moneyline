'use client'

import React, { useState } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { PerformanceResponse } from '@/lib/types'
import { format, parseISO } from 'date-fns'

interface WinRateChartProps {
  data: PerformanceResponse['chartData']
  isLoading?: boolean
}

type ChartView = 'winRate' | 'cumulative'

export default function WinRateChart({ data, isLoading }: WinRateChartProps) {
  const [chartView, setChartView] = useState<ChartView>('winRate')

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Chart</h3>
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Chart Data Available</h4>
          <p className="text-gray-500">Chart will appear once picks have been settled.</p>
        </div>
      </div>
    )
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = format(parseISO(label), 'MMM d, yyyy')
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{date}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Win Rate' ? `${entry.value.toFixed(1)}%` : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Format date for X-axis
  const formatXAxisDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      return format(date, 'MMM d')
    } catch {
      return dateString
    }
  }

  // Format Y-axis for win rate
  const formatYAxisWinRate = (value: number) => `${value}%`

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      {/* Header with view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Performance Chart</h3>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartView('winRate')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                chartView === 'winRate'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Win Rate
            </button>
            <button
              onClick={() => setChartView('cumulative')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                chartView === 'cumulative'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cumulative
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartView === 'winRate' ? (
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxisDate}
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                domain={[0, 100]}
                tickFormatter={formatYAxisWinRate}
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference line at 50% */}
              <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="5 5" />
              
              {/* Win rate line */}
              <Line
                type="monotone"
                dataKey="winRate"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                name="Win Rate"
              />
            </LineChart>
          ) : (
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxisDate}
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Cumulative wins line */}
              <Line
                type="monotone"
                dataKey="cumulativeWins"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2 }}
                name="Cumulative Wins"
              />
              
              {/* Cumulative losses line */}
              <Line
                type="monotone"
                dataKey="cumulativeLosses"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#ef4444', strokeWidth: 2 }}
                name="Cumulative Losses"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart legend/info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        {chartView === 'winRate' ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-blue-600"></div>
                <span>Win Rate Trend</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500 border-dashed border-t"></div>
                <span>50% Breakeven</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Shows win percentage over time
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-green-500"></div>
                <span>Cumulative Wins</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500"></div>
                <span>Cumulative Losses</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Shows total wins and losses over time
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">
              {data[data.length - 1]?.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Current Win Rate</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {data[data.length - 1]?.cumulativeWins || 0}
            </div>
            <div className="text-xs text-gray-500">Total Wins</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">
              {data[data.length - 1]?.cumulativeLosses || 0}
            </div>
            <div className="text-xs text-gray-500">Total Losses</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-600">
              {data.length}
            </div>
            <div className="text-xs text-gray-500">Data Points</div>
          </div>
        </div>
      </div>
    </div>
  )
}