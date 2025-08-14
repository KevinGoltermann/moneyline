import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BetCard from '../BetCard'
import { TodayResponse } from '@/lib/types'

const mockPick: TodayResponse['pick'] = {
  id: 'test-pick-1',
  date: '2024-01-15',
  league: 'NBA',
  market: 'moneyline',
  selection: 'Lakers ML',
  odds: -110,
  confidence: 75.5,
  rationale: {
    topFactors: ['Strong home record', 'Key player returning'],
    reasoning: 'Lakers have a strong home record and key player is returning from injury.'
  }
}

describe('BetCard', () => {
  it('renders loading state correctly', () => {
    render(<BetCard pick={null} isLoading={true} />)
    
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders no pick state correctly', () => {
    render(<BetCard pick={null} isLoading={false} />)
    
    expect(screen.getByText('No Pick Available')).toBeInTheDocument()
    expect(screen.getByText(/Today's betting recommendation is not yet available/)).toBeInTheDocument()
  })

  it('renders pick data correctly', () => {
    render(<BetCard pick={mockPick} isLoading={false} />)
    
    expect(screen.getByText("Today's Pick")).toBeInTheDocument()
    expect(screen.getByText('Lakers ML')).toBeInTheDocument()
    expect(screen.getByText('NBA')).toBeInTheDocument()
    expect(screen.getByText('moneyline')).toBeInTheDocument()
    expect(screen.getByText('-110')).toBeInTheDocument()
    expect(screen.getByText('75.5% Confidence')).toBeInTheDocument()
  })

  it('formats positive odds correctly', () => {
    const pickWithPositiveOdds = { ...mockPick, odds: 150 }
    render(<BetCard pick={pickWithPositiveOdds} isLoading={false} />)
    
    expect(screen.getByText('+150')).toBeInTheDocument()
  })

  it('applies correct confidence color classes', () => {
    const highConfidencePick = { ...mockPick, confidence: 85 }
    render(<BetCard pick={highConfidencePick} isLoading={false} />)
    
    const confidenceElement = screen.getByText('85% Confidence')
    expect(confidenceElement).toHaveClass('text-green-600')
  })

  it('displays rationale when available', () => {
    render(<BetCard pick={mockPick} isLoading={false} />)
    
    expect(screen.getByText('AI Reasoning')).toBeInTheDocument()
    expect(screen.getByText(mockPick.rationale.reasoning)).toBeInTheDocument()
  })
})