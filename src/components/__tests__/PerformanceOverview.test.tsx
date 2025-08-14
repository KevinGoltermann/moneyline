import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PerformanceOverview from '../PerformanceOverview'
import { TodayResponse } from '@/lib/types'

const mockPerformance: TodayResponse['performance'] = {
  winRate: 65.5,
  record: '24-10',
  totalPicks: 34
}

describe('PerformanceOverview', () => {
  it('renders loading state correctly', () => {
    render(<PerformanceOverview performance={null} isLoading={true} />)
    
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders no performance data state correctly', () => {
    render(<PerformanceOverview performance={null} isLoading={false} />)
    
    expect(screen.getByText('No Performance Data')).toBeInTheDocument()
    expect(screen.getByText(/Performance statistics are not yet available/)).toBeInTheDocument()
  })

  it('renders performance data correctly', () => {
    render(<PerformanceOverview performance={mockPerformance} isLoading={false} />)
    
    expect(screen.getByText('Algorithm Performance')).toBeInTheDocument()
    expect(screen.getByText('65.5%')).toBeInTheDocument()
    expect(screen.getByText('Win Rate')).toBeInTheDocument()
    expect(screen.getByText('24-10')).toBeInTheDocument()
    expect(screen.getByText('Record')).toBeInTheDocument()
    expect(screen.getByText('34')).toBeInTheDocument()
    expect(screen.getByText('Total Picks')).toBeInTheDocument()
  })

  it('applies correct color classes for high win rate', () => {
    const highWinRatePerformance = { ...mockPerformance, winRate: 70 }
    render(<PerformanceOverview performance={highWinRatePerformance} isLoading={false} />)
    
    const winRateElement = screen.getByText('70.0%')
    expect(winRateElement).toHaveClass('text-green-600')
  })

  it('applies correct color classes for medium win rate', () => {
    const mediumWinRatePerformance = { ...mockPerformance, winRate: 55 }
    render(<PerformanceOverview performance={mediumWinRatePerformance} isLoading={false} />)
    
    const winRateElement = screen.getByText('55.0%')
    expect(winRateElement).toHaveClass('text-yellow-600')
  })

  it('applies correct color classes for low win rate', () => {
    const lowWinRatePerformance = { ...mockPerformance, winRate: 45 }
    render(<PerformanceOverview performance={lowWinRatePerformance} isLoading={false} />)
    
    const winRateElement = screen.getByText('45.0%')
    expect(winRateElement).toHaveClass('text-red-600')
  })

  it('displays correct performance status', () => {
    render(<PerformanceOverview performance={mockPerformance} isLoading={false} />)
    
    expect(screen.getByText('Excellent')).toBeInTheDocument()
  })
})