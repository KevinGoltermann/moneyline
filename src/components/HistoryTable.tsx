'use client'

import React, { useState, useMemo } from 'react'
import { PerformanceResponse } from '@/lib/types'
import { format, parseISO } from 'date-fns'

interface HistoryTableProps {
  history: PerformanceResponse['history']
  currentPage: number
  limit: number
  onPageChange: (page: number) => void
  totalItems: number
  isLoading?: boolean
}

type SortField = 'date' | 'selection' | 'odds' | 'confidence' | 'result'
type SortDirection = 'asc' | 'desc'
type FilterResult = 'all' | 'win' | 'loss' | 'push' | 'pending'

export default function HistoryTable({ 
  history, 
  currentPage, 
  limit, 
  onPageChange, 
  totalItems,
  isLoading 
}: HistoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterResult, setFilterResult] = useState<FilterResult>('all')

  // Filter and sort data
  const filteredAndSortedHistory = useMemo(() => {
    let filtered = history

    // Apply result filter
    if (filterResult !== 'all') {
      filtered = history.filter(pick => {
        if (filterResult === 'pending') return pick.result === null
        return pick.result === filterResult
      })
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle date sorting
      if (sortField === 'date') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      // Handle numeric sorting
      if (sortField === 'odds' || sortField === 'confidence') {
        aValue = Number(aValue)
        bValue = Number(bValue)
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      // Handle null values for result sorting
      if (sortField === 'result') {
        if (aValue === null && bValue === null) return 0
        if (aValue === null) return sortDirection === 'asc' ? 1 : -1
        if (bValue === null) return sortDirection === 'asc' ? -1 : 1
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [history, sortField, sortDirection, filterResult])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4l6 6 6-6" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 20l-6-6-6 6" />
      </svg>
    )
  }

  const getResultBadge = (result: string | null) => {
    if (result === null) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Pending
        </span>
      )
    }

    const styles = {
      win: 'bg-green-100 text-green-800',
      loss: 'bg-red-100 text-red-800',
      push: 'bg-yellow-100 text-yellow-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[result as keyof typeof styles]}`}>
        {result.charAt(0).toUpperCase() + result.slice(1)}
      </span>
    )
  }

  const getOddsDisplay = (odds: number) => {
    if (odds > 0) return `+${odds}`
    return odds.toString()
  }

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy')
    } catch {
      return dateString
    }
  }

  const totalPages = Math.ceil(totalItems / limit)
  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header with filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Pick History</h3>
          
          {/* Result Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="result-filter" className="text-sm font-medium text-gray-700">
              Filter by result:
            </label>
            <select
              id="result-filter"
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value as FilterResult)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Results</option>
              <option value="win">Wins</option>
              <option value="loss">Losses</option>
              <option value="push">Pushes</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Date
                  {getSortIcon('date')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('selection')}
              >
                <div className="flex items-center gap-1">
                  Selection
                  {getSortIcon('selection')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('odds')}
              >
                <div className="flex items-center gap-1">
                  Odds
                  {getSortIcon('odds')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('confidence')}
              >
                <div className="flex items-center gap-1">
                  Confidence
                  {getSortIcon('confidence')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('result')}
              >
                <div className="flex items-center gap-1">
                  Result
                  {getSortIcon('result')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedHistory.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900 mb-1">No picks found</p>
                    <p className="text-gray-500">
                      {filterResult === 'all' 
                        ? 'No betting picks have been made yet.' 
                        : `No picks with "${filterResult}" result found.`}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedHistory.map((pick) => (
                <tr key={pick.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(pick.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {pick.selection}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getOddsDisplay(pick.odds)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-16 bg-gray-200 rounded-full h-2 mr-3">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${pick.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{pick.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getResultBadge(pick.result)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages} ({totalItems} total picks)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={!hasPreviousPage}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  if (pageNum > totalPages) return null
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!hasNextPage}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}