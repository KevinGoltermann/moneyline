import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingSpinner, { LoadingCard } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default medium size', () => {
    render(<LoadingSpinner />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('w-8', 'h-8')
  })

  it('renders with small size when specified', () => {
    render(<LoadingSpinner size="sm" />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toHaveClass('w-4', 'h-4')
  })

  it('renders with large size when specified', () => {
    render(<LoadingSpinner size="lg" />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toHaveClass('w-12', 'h-12')
  })

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toHaveClass('custom-class')
  })

  it('renders SVG with proper structure', () => {
    render(<LoadingSpinner />)
    
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('text-blue-600')
    
    // Check for circle and path elements
    const circle = svg?.querySelector('circle')
    const path = svg?.querySelector('path')
    expect(circle).toBeInTheDocument()
    expect(path).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />)
    
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('fill', 'none')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
  })
})

describe('LoadingCard', () => {
  it('renders with default title', () => {
    render(<LoadingCard />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders with custom title', () => {
    render(<LoadingCard title="Custom Loading Message" />)
    
    expect(screen.getByText('Custom Loading Message')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<LoadingCard className="custom-card-class" />)
    
    const card = document.querySelector('.bg-white')
    expect(card).toHaveClass('custom-card-class')
  })

  it('contains a loading spinner', () => {
    render(<LoadingCard />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('w-12', 'h-12') // Large size
  })

  it('has proper card styling', () => {
    render(<LoadingCard />)
    
    const card = document.querySelector('.bg-white')
    expect(card).toHaveClass(
      'bg-white',
      'rounded-lg',
      'shadow-lg',
      'p-6',
      'border',
      'border-gray-200',
      'text-center'
    )
  })

  it('centers spinner and text', () => {
    render(<LoadingCard />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toHaveClass('mx-auto', 'mb-4')
    
    const card = document.querySelector('.bg-white')
    expect(card).toHaveClass('text-center')
  })

  it('renders text with proper styling', () => {
    render(<LoadingCard />)
    
    const text = screen.getByText('Loading...')
    expect(text).toHaveClass('text-gray-600')
  })
})