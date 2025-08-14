import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WinRateChart from '../WinRateChart'
import { PerformanceResponse } from '@/lib/types'

// Mock Recharts components
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

const mockChartData: PerformanceResponse['chartData'] = [
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

describe('WinRateChart', () => {
  it('renders loading state correctly', () => {
    render(<WinRateChart data={mockChartData} isLoading={true} />)
    
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    render(<WinRateChart data={[]} />)
    
    expect(screen.getByText('No Chart Data Available')).toBeInTheDocument()
    expect(screen.getByText('Chart will appear once picks have been settled.')).toBeInTheDocument()
  })

  it('renders chart with data correctly', () => {
    render(<WinRateChart data={mockChartData} />)
    
    expect(screen.getByText('Performance Chart')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('shows win rate view by default', () => {
    render(<WinRateChart data={mockChartData} />)
    
    expect(screen.getByTestId('line-win-rate')).toBeInTheDocument()
    expect(screen.getByTestId('reference-line-50')).toBeInTheDocument()
    
    const winRateButton = screen.getAllByText('Win Rate')[0] // Get the button, not the chart element
    expect(winRateButton).toHaveClass('bg-white')
  })

  it('switches to cumulative view when button is clicked', () => {
    render(<WinRateChart data={mockChartData} />)
    
    const cumulativeButton = screen.getByText('Cumulative')
    fireEvent.click(cumulativeButton)
    
    expect(cumulativeButton).toHaveClass('bg-white')
    expect(screen.getByTestId('line-cumulative-wins')).toBeInTheDocument()
    expect(screen.getByTestId('line-cumulative-losses')).toBeInTheDocument()
  })

  it('displays summary stats correctly', () => {
    render(<WinRateChart data={mockChartData} />)
    
    // Should show stats from the last data point
    expect(screen.getByText('66.7%')).toBeInTheDocument() // Current win rate
    expect(screen.getByText('2')).toBeInTheDocument() // Total wins
    expect(screen.getByText('1')).toBeInTheDocument() // Total losses
    expect(screen.getByText('3')).toBeInTheDocument() // Data points
  })

  it('shows correct legend for win rate view', () => {
    render(<WinRateChart data={mockChartData} />)
    
    expect(screen.getByText('Win Rate Trend')).toBeInTheDocument()
    expect(screen.getByText('50% Breakeven')).toBeInTheDocument()
    expect(screen.getByText('Shows win percentage over time')).toBeInTheDocument()
  })

  it('shows correct legend for cumulative view', () => {
    render(<WinRateChart data={mockChartData} />)
    
    const cumulativeButton = screen.getByText('Cumulative')
    fireEvent.click(cumulativeButton)
    
    expect(screen.getAllByText('Cumulative Wins')).toHaveLength(2) // One in chart, one in legend
    expect(screen.getAllByText('Cumulative Losses')).toHaveLength(2) // One in chart, one in legend
    expect(screen.getByText('Shows total wins and losses over time')).toBeInTheDocument()
  })

  it('handles null data gracefully', () => {
    render(<WinRateChart data={null as any} />)
    
    expect(screen.getByText('No Chart Data Available')).toBeInTheDocument()
  })

  it('handles undefined data gracefully', () => {
    render(<WinRateChart data={undefined as any} />)
    
    expect(screen.getByText('No Chart Data Available')).toBeInTheDocument()
  })
})