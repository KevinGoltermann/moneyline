import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PerformanceStats from '../PerformanceStats'
import { PerformanceResponse } from '@/lib/types'

const mockStats: PerformanceResponse['stats'] = {
  winRate: 65.5,
  totalPicks: 20,
  wins: 13,
  losses: 6,
  pushes: 1,
  currentStreak: { type: 'win', count: 3 }
}

describe('PerformanceStats', () => {
  it('renders loading state correctly', () => {
    render(<PerformanceStats stats={mockStats} isLoading={true} />)
    
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders performance stats correctly', () => {
    render(<PerformanceStats stats={mockStats} />)
    
    expect(screen.getByText('65.5%')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('13-6-1')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('W3')).toBeInTheDocument()
  })

  it('applies correct win rate colors for excellent performance', () => {
    render(<PerformanceStats stats={mockStats} />)
    
    const winRateElement = screen.getByText('65.5%')
    expect(winRateElement).toHaveClass('text-green-600')
    expect(screen.getByText('Excellent')).toBeInTheDocument()
  })

  it('applies correct win rate colors for good performance', () => {
    const goodStats = { ...mockStats, winRate: 55.0 }
    render(<PerformanceStats stats={goodStats} />)
    
    const winRateElement = screen.getByText('55.0%')
    expect(winRateElement).toHaveClass('text-yellow-600')
    expect(screen.getByText('Very Good')).toBeInTheDocument()
  })

  it('applies correct win rate colors for poor performance', () => {
    const poorStats = { ...mockStats, winRate: 40.0 }
    render(<PerformanceStats stats={poorStats} />)
    
    const winRateElement = screen.getByText('40.0%')
    expect(winRateElement).toHaveClass('text-red-600')
    expect(screen.getByText('Needs Improvement')).toBeInTheDocument()
  })

  it('handles losing streak correctly', () => {
    const losingStats = { 
      ...mockStats, 
      currentStreak: { type: 'loss' as const, count: 2 }
    }
    render(<PerformanceStats stats={losingStats} />)
    
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('L2')).toBeInTheDocument()
  })

  it('handles no streak correctly', () => {
    const noStreakStats = { 
      ...mockStats, 
      currentStreak: { type: 'none' as const, count: 0 }
    }
    render(<PerformanceStats stats={noStreakStats} />)
    
    expect(screen.getByText('No active streak')).toBeInTheDocument()
    // Check that the streak count shows 0 in the streak section
    const streakSection = screen.getByText('Current Streak').closest('div')
    expect(streakSection).toContainHTML('0')
  })

  it('calculates pending picks correctly', () => {
    render(<PerformanceStats stats={mockStats} />)
    
    // Total picks (20) - wins (13) - losses (6) - pushes (1) = 0 pending
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('displays record without pushes when pushes is 0', () => {
    const noPushStats = { ...mockStats, pushes: 0 }
    render(<PerformanceStats stats={noPushStats} />)
    
    expect(screen.getByText('13-6')).toBeInTheDocument()
    expect(screen.getByText('W-L Record')).toBeInTheDocument()
  })
})