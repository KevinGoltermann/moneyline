'use client'

import { useTodayData } from '@/hooks/useTodayData'
import BetCard from '@/components/BetCard'
import PerformanceOverview from '@/components/PerformanceOverview'
import RationaleSection from '@/components/RationaleSection'
import ErrorBoundary from '@/components/ErrorBoundary'
import { LoadingCard } from '@/components/LoadingSpinner'

function HomeContent() {
  const { data, isLoading, error, refetch } = useTodayData()

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Today&apos;s Pick</h1>
          <p className="text-gray-600">ML-Powered Betting Recommendation</p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-red-200 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={refetch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Today&apos;s Pick</h1>
        <p className="text-gray-600 text-sm sm:text-base">ML-Powered Betting Recommendation</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Main Bet Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <ErrorBoundary>
              <BetCard pick={data?.pick || null} isLoading={isLoading} />
            </ErrorBoundary>
          </div>
          <div>
            <ErrorBoundary>
              <PerformanceOverview performance={data?.performance || undefined} isLoading={isLoading} />
            </ErrorBoundary>
          </div>
        </div>

        {/* Rationale Section */}
        <div>
          <ErrorBoundary>
            <RationaleSection 
              rationale={data?.pick?.rationale || null} 
              isLoading={isLoading} 
            />
          </ErrorBoundary>
        </div>

        {/* Additional Info */}
        <div className="text-center text-sm text-gray-500 pt-4">
          <p className="max-w-2xl mx-auto">
            Recommendations are generated using machine learning analysis of odds, team performance, and market data.
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            Always gamble responsibly and within your means.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  )
}