import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HistoryTable from '../HistoryTable'
import { PerformanceResponse } from '@/lib/types'

const mockHistory: PerformanceResponse['history'] = [
  {
    id: '1',
    date: '2024-01-15',
    selection: 'Lakers ML',
    odds: -110,
    confidence: 75,
    result: 'win',
    settledAt: '2024-01-16T10:00:00Z'
  },
  {
    id: '2',
    date: '2024-01-14',
    selection: 'Warriors ML',
    odds: 150,
    confidence: 65,
    result: 'loss',
    settledAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '3',
    date: '2024-01-13',
    selection: 'Celtics ML',
    odds: -200,
    confidence: 80,
    result: null,
    settledAt: null
  }
]

const mockProps = {
  history: mockHistory,
  currentPage: 1,
  limit: 50,
  onPageChange: vi.fn(),
  totalItems: 3
}

describe('HistoryTable', () => {
  it('renders loading state correctly', () => {
    render(<HistoryTable {...mockProps} isLoading={true} />)
    
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders history data correctly', () => {
    render(<HistoryTable {...mockProps} />)
    
    expect(screen.getByText('Lakers ML')).toBeInTheDocument()
    expect(screen.getByText('Warriors ML')).toBeInTheDocument()
    expect(screen.getByText('Celtics ML')).toBeInTheDocument()
    expect(screen.getByText('-110')).toBeInTheDocument()
    expect(screen.getByText('+150')).toBeInTheDocument()
    expect(screen.getByText('-200')).toBeInTheDocument()
  })

  it('displays result badges correctly', () => {
    render(<HistoryTable {...mockProps} />)
    
    expect(screen.getByText('Win')).toBeInTheDocument()
    expect(screen.getByText('Loss')).toBeInTheDocument()
    expect(screen.getAllByText('Pending')).toHaveLength(2) // One in filter, one in table
  })

  it('displays confidence bars correctly', () => {
    render(<HistoryTable {...mockProps} />)
    
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('handles sorting by date', () => {
    render(<HistoryTable {...mockProps} />)
    
    const dateHeader = screen.getByText('Date')
    fireEvent.click(dateHeader)
    
    // Should show sort icon
    expect(dateHeader.closest('th')).toContainHTML('svg')
  })

  it('handles sorting by selection', () => {
    render(<HistoryTable {...mockProps} />)
    
    const selectionHeader = screen.getByText('Selection')
    fireEvent.click(selectionHeader)
    
    // Should show sort icon
    expect(selectionHeader.closest('th')).toContainHTML('svg')
  })

  it('handles result filtering', () => {
    render(<HistoryTable {...mockProps} />)
    
    const filterSelect = screen.getByLabelText('Filter by result:')
    fireEvent.change(filterSelect, { target: { value: 'win' } })
    
    expect(filterSelect).toHaveValue('win')
  })

  it('shows empty state when no data', () => {
    render(<HistoryTable {...mockProps} history={[]} />)
    
    expect(screen.getByText('No picks found')).toBeInTheDocument()
    expect(screen.getByText('No betting picks have been made yet.')).toBeInTheDocument()
  })

  it('shows filtered empty state', () => {
    render(<HistoryTable {...mockProps} history={[]} />)
    
    const filterSelect = screen.getByLabelText('Filter by result:')
    fireEvent.change(filterSelect, { target: { value: 'win' } })
    
    expect(screen.getByText('No picks with "win" result found.')).toBeInTheDocument()
  })

  it('handles pagination correctly', () => {
    const paginationProps = {
      ...mockProps,
      totalItems: 100,
      currentPage: 2
    }
    
    render(<HistoryTable {...paginationProps} />)
    
    expect(screen.getByText('Showing page 2 of 2 (100 total picks)')).toBeInTheDocument()
    
    const prevButton = screen.getByText('Previous')
    const nextButton = screen.getByText('Next')
    
    expect(prevButton).not.toBeDisabled()
    expect(nextButton).toBeDisabled()
  })

  it('calls onPageChange when pagination buttons are clicked', () => {
    const onPageChange = vi.fn()
    const paginationProps = {
      ...mockProps,
      totalItems: 100,
      currentPage: 2,
      onPageChange
    }
    
    render(<HistoryTable {...paginationProps} />)
    
    const prevButton = screen.getByText('Previous')
    fireEvent.click(prevButton)
    
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('formats dates correctly', () => {
    render(<HistoryTable {...mockProps} />)
    
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
    expect(screen.getByText('Jan 14, 2024')).toBeInTheDocument()
    expect(screen.getByText('Jan 13, 2024')).toBeInTheDocument()
  })

  it('formats odds correctly', () => {
    render(<HistoryTable {...mockProps} />)
    
    // Negative odds should not have + prefix
    expect(screen.getByText('-110')).toBeInTheDocument()
    expect(screen.getByText('-200')).toBeInTheDocument()
    
    // Positive odds should have + prefix
    expect(screen.getByText('+150')).toBeInTheDocument()
  })
})