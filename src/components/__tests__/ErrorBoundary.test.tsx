import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary, { DefaultErrorFallback } from '../ErrorBoundary'

// Mock the logging module
vi.mock('@/lib/logging', () => ({
  logErrorBoundary: vi.fn()
}))

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders default error fallback when error occurs', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })

  it('renders custom fallback component when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const CustomFallback = ({ error }: { error?: Error }) => (
      <div>Custom error: {error?.message}</div>
    )
    
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })

  it('calls retry function when Try Again button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    
    const retryButton = screen.getByText('Try Again')
    retryButton.click()
    
    // After retry, re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })
})

describe('DefaultErrorFallback', () => {
  it('renders error message correctly', () => {
    const error = new Error('Test error message')
    render(<DefaultErrorFallback error={error} />)
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('renders default message when no error provided', () => {
    render(<DefaultErrorFallback />)
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred while loading this component.')).toBeInTheDocument()
  })

  it('renders retry button when retry function provided', () => {
    const retryFn = vi.fn()
    render(<DefaultErrorFallback retry={retryFn} />)
    
    const retryButton = screen.getByText('Try Again')
    expect(retryButton).toBeInTheDocument()
    
    retryButton.click()
    expect(retryFn).toHaveBeenCalledOnce()
  })

  it('does not render retry button when no retry function provided', () => {
    render(<DefaultErrorFallback />)
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
  })
})