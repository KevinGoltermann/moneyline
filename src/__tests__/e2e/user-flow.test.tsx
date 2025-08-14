import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { TodayResponse, PerformanceResponse } from '@/lib/types'

// Mock Next.js components and hooks
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
}))

vi.mock('next/link', () => {
  return {
    default: ({ children, href, onClick }: any) => (
      <a href={href} onClick={onClick}>
        {children}
      </a>
    ),
  }
})

// Mock Recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: ({ name }: any) => <div data-testid={`line-${name?.toLowerCase().replace(' ', '-')}`}>{name}</div>,
  XAxis: () => <div data-testid="x-axis">XAxis</div>,
  YAxis: () => <div data-testid="y-axis">YAxis</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid">Grid</div>,
  Tooltip: () => <div data-testid="tooltip">Tooltip</div>,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: ({ y }: any) => <div data-testid={`reference-line-${y}`}>Reference Line {y}</div>
}))

// Mock fetch globally
global.fetch = vi.fn()

// Import components after mocking
import HomePage from '@/app/page'
import PerformancePage from '@/app/performance/page'

const mockTodayResponse: TodayResponse = {
  pick: {
    id: 'e2e-test-pick',
    date: '2024-01-15',
    league: 'NBA',
    market: 'moneyline',
    selection: 'Lakers ML',
    odds: -110,
    confidence: 78.5,
    rationale: {
      topFactors: ['Strong home record', 'Key player healthy', 'Favorable matchup'],
      reasoning: 'Lakers have been dominant at home this season with a 15-3 record. LeBron James is healthy and the matchup against the Warriors favors their style of play.'
    }
  },
  performance: {
    winRate: 72.5,
    record: '29-11',
    totalPicks: 40
  }
}

const mockPerformanceResponse: PerformanceResponse = {
  stats: {
    winRate: 72.5,
    totalPicks: 40,
    wins: 29,
    losses: 11,
    pushes: 0,
    currentStreak: { type: 'win', count: 3 }
  },
  history: [
    {
      id: '1',
      date: '2024-01-15',
      selection: 'Lakers ML',
      odds: -110,
      confidence: 78.5,
      result: 'win',
      settledAt: '2024-01-16T10:00:00Z'
    },
    {
      id: '2',
      date: '2024-01-14',
      selection: 'Warriors ML',
      odds: 120,
      confidence: 65.0,
      result: 'loss',
      settledAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '3',
      date: '2024-01-13',
      selection: 'Celtics ML',
      odds: -150,
      confidence: 82.0,
      result: 'win',
      settledAt: '2024-01-14T10:00:00Z'
    }
  ],
  chartData: [
    {
      date: '2024-01-13',
      winRate: 50.0,
      cumulativeWins: 1,
      cumulativeLosses: 1
    },
    {
      date: '2024-01-14',
      winRate: 33.3,
      cumulativeWins: 1,
      cumulativeLosses: 2
    },
    {
      date: '2024-01-15',
      winRate: 66.7,
      cumulativeWins: 2,
      cumulativeLosses: 1
    }
  ]
}

describe('End-to-End User Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Home Page User Flow', () => {
    it('should display today\'s pick and allow user to view details', async () => {
      // Mock successful API response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTodayResponse
      } as Response)

      render(<HomePage />)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Today's Pick")).toBeInTheDocument()
      })

      // Verify pick details are displayed
      expect(screen.getByText('Lakers ML')).toBeInTheDocument()
      expect(screen.getByText('NBA')).toBeInTheDocument()
      expect(screen.getByText('-110')).toBeInTheDocument()
      expect(screen.getByText('78.5% Confidence')).toBeInTheDocument()

      // Verify performance summary is displayed
      expect(screen.getByText('72.5%')).toBeInTheDocument()
      expect(screen.getByText('29-11')).toBeInTheDocument()

      // Verify rationale is displayed
      expect(screen.getByText('AI Reasoning')).toBeInTheDocument()
      expect(screen.getByText(/Lakers have been dominant at home/)).toBeInTheDocument()
      expect(screen.getByText('Strong home record')).toBeInTheDocument()
      expect(screen.getByText('Key player healthy')).toBeInTheDocument()
      expect(screen.getByText('Favorable matchup')).toBeInTheDocument()
    })

    it('should handle no pick available state', async () => {
      // Mock API response with no pick
      const noPick: TodayResponse = {
        pick: null,
        performance: mockTodayResponse.performance
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => noPick
      } as Response)

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('No Pick Available')).toBeInTheDocument()
      })

      expect(screen.getByText(/Today's betting recommendation is not yet available/)).toBeInTheDocument()
      
      // Performance should still be displayed
      expect(screen.getByText('72.5%')).toBeInTheDocument()
    })

    it('should handle loading state correctly', () => {
      // Mock pending fetch
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))

      render(<HomePage />)

      // Should show loading state
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('should handle API error gracefully', async () => {
      // Mock API error
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Page User Flow', () => {
    it('should display performance stats and history', async () => {
      // Mock successful API response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPerformanceResponse
      } as Response)

      render(<PerformancePage />)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Performance Overview')).toBeInTheDocument()
      })

      // Verify performance stats
      expect(screen.getByText('72.5%')).toBeInTheDocument()
      expect(screen.getByText('29-11')).toBeInTheDocument()
      expect(screen.getByText('W3')).toBeInTheDocument() // Current streak

      // Verify history table
      expect(screen.getByText('Pick History')).toBeInTheDocument()
      expect(screen.getByText('Lakers ML')).toBeInTheDocument()
      expect(screen.getByText('Warriors ML')).toBeInTheDocument()
      expect(screen.getByText('Celtics ML')).toBeInTheDocument()

      // Verify chart is displayed
      expect(screen.getByText('Performance Chart')).toBeInTheDocument()
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('should allow filtering of history table', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPerformanceResponse
      } as Response)

      render(<PerformancePage />)

      await waitFor(() => {
        expect(screen.getByText('Pick History')).toBeInTheDocument()
      })

      // Find and interact with filter dropdown
      const filterSelect = screen.getByLabelText('Filter by result:')
      fireEvent.change(filterSelect, { target: { value: 'win' } })

      expect(filterSelect).toHaveValue('win')
    })

    it('should allow sorting of history table', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPerformanceResponse
      } as Response)

      render(<PerformancePage />)

      await waitFor(() => {
        expect(screen.getByText('Pick History')).toBeInTheDocument()
      })

      // Click on date header to sort
      const dateHeader = screen.getByText('Date')
      fireEvent.click(dateHeader)

      // Should show sort indicator
      expect(dateHeader.closest('th')).toContainHTML('svg')
    })

    it('should switch between chart views', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPerformanceResponse
      } as Response)

      render(<PerformancePage />)

      await waitFor(() => {
        expect(screen.getByText('Performance Chart')).toBeInTheDocument()
      })

      // Should start with win rate view
      const winRateButton = screen.getAllByText('Win Rate')[0]
      expect(winRateButton).toHaveClass('bg-white')

      // Switch to cumulative view
      const cumulativeButton = screen.getByText('Cumulative')
      fireEvent.click(cumulativeButton)

      expect(cumulativeButton).toHaveClass('bg-white')
      expect(screen.getByTestId('line-cumulative-wins')).toBeInTheDocument()
      expect(screen.getByTestId('line-cumulative-losses')).toBeInTheDocument()
    })
  })

  describe('Navigation Flow', () => {
    it('should navigate between pages correctly', async () => {
      const { usePathname } = require('next/navigation')
      
      // Start on home page
      usePathname.mockReturnValue('/')
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTodayResponse
      } as Response)

      const { rerender } = render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText("Today's Pick")).toBeInTheDocument()
      })

      // Simulate navigation to performance page
      usePathname.mockReturnValue('/performance')
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPerformanceResponse
      } as Response)

      rerender(<PerformancePage />)

      await waitFor(() => {
        expect(screen.getByText('Performance Overview')).toBeInTheDocument()
      })
    })
  })

  describe('Error Recovery Flow', () => {
    it('should allow retry after error', async () => {
      // First call fails
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      // Second call succeeds
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTodayResponse
      } as Response)

      render(<HomePage />)

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText('Try Again')
      fireEvent.click(retryButton)

      // Should show success state after retry
      await waitFor(() => {
        expect(screen.getByText("Today's Pick")).toBeInTheDocument()
        expect(screen.getByText('Lakers ML')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('should handle mobile viewport correctly', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTodayResponse
      } as Response)

      render(<HomePage />)

      await waitFor(() => {
        expect(screen.getByText("Today's Pick")).toBeInTheDocument()
      })

      // Verify responsive classes are applied
      const pickCard = screen.getByText("Today's Pick").closest('div')
      expect(pickCard).toHaveClass('rounded-lg')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPerformanceResponse
      } as Response)

      render(<PerformancePage />)

      await waitFor(() => {
        expect(screen.getByText('Performance Overview')).toBeInTheDocument()
      })

      // Check for proper table structure
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      // Check for proper headings
      const headings = screen.getAllByRole('columnheader')
      expect(headings.length).toBeGreaterThan(0)
    })
  })
})