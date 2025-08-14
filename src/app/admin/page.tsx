'use client'

import { useState, useEffect } from 'react'
import { PickWithResult } from '@/lib/database.types'

interface AdminPageState {
  unsettledPicks: PickWithResult[]
  loading: boolean
  error: string | null
  adminSecret: string
  settlingPick: string | null
  recomputeLoading: boolean
}

export default function AdminPage() {
  const [state, setState] = useState<AdminPageState>({
    unsettledPicks: [],
    loading: true,
    error: null,
    adminSecret: '',
    settlingPick: null,
    recomputeLoading: false
  })

  // Load admin secret from localStorage on mount
  useEffect(() => {
    const savedSecret = localStorage.getItem('admin_secret')
    if (savedSecret) {
      setState(prev => ({ ...prev, adminSecret: savedSecret }))
    }
  }, [])

  // Fetch unsettled picks
  const fetchUnsettledPicks = async () => {
    if (!state.adminSecret) {
      setState(prev => ({ ...prev, error: 'Admin secret required', loading: false }))
      return
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await fetch('/api/admin/unsettled', {
        headers: {
          'Authorization': `Bearer ${state.adminSecret}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch unsettled picks')
      }

      const data = await response.json()
      setState(prev => ({ 
        ...prev, 
        unsettledPicks: data.picks || [], 
        loading: false 
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      }))
    }
  }

  // Settle a pick
  const settlePick = async (pickId: string, result: 'win' | 'loss' | 'push', notes?: string) => {
    if (!state.adminSecret) {
      setState(prev => ({ ...prev, error: 'Admin secret required' }))
      return
    }

    try {
      setState(prev => ({ ...prev, settlingPick: pickId, error: null }))
      
      const response = await fetch('/api/admin/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.adminSecret}`
        },
        body: JSON.stringify({ pickId, result, notes })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to settle pick')
      }

      // Refresh the list
      await fetchUnsettledPicks()
      setState(prev => ({ ...prev, settlingPick: null }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        settlingPick: null 
      }))
    }
  }

  // Recompute today's pick
  const recomputePick = async (date?: string) => {
    if (!state.adminSecret) {
      setState(prev => ({ ...prev, error: 'Admin secret required' }))
      return
    }

    try {
      setState(prev => ({ ...prev, recomputeLoading: true, error: null }))
      
      const response = await fetch('/api/admin/recompute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.adminSecret}`
        },
        body: JSON.stringify({ date })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to recompute pick')
      }

      const data = await response.json()
      alert(`Success: ${data.message}`)
      setState(prev => ({ ...prev, recomputeLoading: false }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        recomputeLoading: false 
      }))
    }
  }

  // Save admin secret to localStorage
  const saveAdminSecret = () => {
    localStorage.setItem('admin_secret', state.adminSecret)
    fetchUnsettledPicks()
  }

  // Clear admin secret
  const clearAdminSecret = () => {
    localStorage.removeItem('admin_secret')
    setState(prev => ({ 
      ...prev, 
      adminSecret: '', 
      unsettledPicks: [], 
      error: null 
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            DailyBet AI - Admin Panel
          </h1>

          {/* Admin Secret Input */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Authentication
            </h2>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Enter admin secret"
                value={state.adminSecret}
                onChange={(e) => setState(prev => ({ ...prev, adminSecret: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={saveAdminSecret}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Connect
              </button>
              {state.adminSecret && (
                <button
                  onClick={clearAdminSecret}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{state.error}</p>
            </div>
          )}

          {/* Recompute Section */}
          {state.adminSecret && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Pick Management
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => recomputePick()}
                  disabled={state.recomputeLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.recomputeLoading ? 'Recomputing...' : 'Recompute Today\'s Pick'}
                </button>
                <button
                  onClick={fetchUnsettledPicks}
                  disabled={state.loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.loading ? 'Loading...' : 'Refresh Unsettled Picks'}
                </button>
              </div>
            </div>
          )}

          {/* Unsettled Picks */}
          {state.adminSecret && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Unsettled Picks ({state.unsettledPicks.length})
              </h2>
              
              {state.loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading unsettled picks...</p>
                </div>
              ) : state.unsettledPicks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No unsettled picks found
                </div>
              ) : (
                <div className="space-y-4">
                  {state.unsettledPicks.map((pick) => (
                    <div key={pick.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {pick.selection}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {pick.pick_date} • {pick.league} • {pick.odds > 0 ? '+' : ''}{pick.odds}
                          </p>
                          <p className="text-sm text-gray-600">
                            {pick.home_team} vs {pick.away_team}
                          </p>
                          <p className="text-sm text-blue-600">
                            Confidence: {pick.confidence}%
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => settlePick(pick.id, 'win')}
                            disabled={state.settlingPick === pick.id}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {state.settlingPick === pick.id ? '...' : 'Win'}
                          </button>
                          <button
                            onClick={() => settlePick(pick.id, 'loss')}
                            disabled={state.settlingPick === pick.id}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {state.settlingPick === pick.id ? '...' : 'Loss'}
                          </button>
                          <button
                            onClick={() => settlePick(pick.id, 'push')}
                            disabled={state.settlingPick === pick.id}
                            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {state.settlingPick === pick.id ? '...' : 'Push'}
                          </button>
                        </div>
                      </div>
                      
                      {pick.rationale && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Rationale:</strong> {
                            typeof pick.rationale === 'object' && pick.rationale !== null
                              ? (pick.rationale as any).reasoning || 'No reasoning provided'
                              : String(pick.rationale)
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}