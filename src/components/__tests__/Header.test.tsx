import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Header from '../Header'

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
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

describe('Header', () => {
  it('renders brand logo and name correctly', () => {
    render(<Header />)
    
    expect(screen.getByText('DailyBet AI')).toBeInTheDocument()
    expect(screen.getByText('DailyBet')).toBeInTheDocument() // Mobile version
  })

  it('renders navigation links correctly', () => {
    render(<Header />)
    
    expect(screen.getByText("Today's Pick")).toBeInTheDocument()
    expect(screen.getByText('Performance')).toBeInTheDocument()
  })

  it('highlights active navigation link', () => {
    const { usePathname } = require('next/navigation')
    vi.mocked(usePathname).mockReturnValue('/')
    
    render(<Header />)
    
    const todayLink = screen.getByText("Today's Pick")
    expect(todayLink).toHaveClass('bg-blue-100', 'text-blue-700')
  })

  it('highlights performance link when on performance page', () => {
    const { usePathname } = require('next/navigation')
    vi.mocked(usePathname).mockReturnValue('/performance')
    
    render(<Header />)
    
    const performanceLink = screen.getByText('Performance')
    expect(performanceLink).toHaveClass('bg-blue-100', 'text-blue-700')
  })

  it('shows mobile menu button on mobile', () => {
    render(<Header />)
    
    const menuButton = screen.getByLabelText('Toggle mobile menu')
    expect(menuButton).toBeInTheDocument()
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggles mobile menu when button is clicked', () => {
    render(<Header />)
    
    const menuButton = screen.getByLabelText('Toggle mobile menu')
    
    // Initially closed
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText("Today's Pick")).toBeInTheDocument() // Desktop nav always visible
    
    // Click to open
    fireEvent.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    
    // Should show mobile navigation
    const mobileNavLinks = screen.getAllByText("Today's Pick")
    expect(mobileNavLinks.length).toBeGreaterThan(1) // Desktop + mobile
  })

  it('closes mobile menu when navigation link is clicked', () => {
    render(<Header />)
    
    const menuButton = screen.getByLabelText('Toggle mobile menu')
    
    // Open mobile menu
    fireEvent.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    
    // Click on mobile navigation link
    const mobileNavLinks = screen.getAllByText("Today's Pick")
    const mobileLink = mobileNavLinks[mobileNavLinks.length - 1] // Get the mobile one
    fireEvent.click(mobileLink)
    
    // Menu should be closed
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes mobile menu when logo is clicked', () => {
    render(<Header />)
    
    const menuButton = screen.getByLabelText('Toggle mobile menu')
    
    // Open mobile menu
    fireEvent.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    
    // Click on logo
    const logo = screen.getByText('DailyBet AI').closest('a')
    fireEvent.click(logo!)
    
    // Menu should be closed
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows correct menu icon based on state', () => {
    render(<Header />)
    
    const menuButton = screen.getByLabelText('Toggle mobile menu')
    
    // Initially shows hamburger menu (three lines)
    expect(menuButton.querySelector('path[d*="M4 6h16M4 12h16M4 18h16"]')).toBeInTheDocument()
    
    // Click to open
    fireEvent.click(menuButton)
    
    // Should show close icon (X)
    expect(menuButton.querySelector('path[d*="M6 18L18 6M6 6l12 12"]')).toBeInTheDocument()
  })

  it('applies sticky positioning and proper z-index', () => {
    render(<Header />)
    
    const header = screen.getByRole('banner')
    expect(header).toHaveClass('sticky', 'top-0', 'z-50')
  })

  it('has proper accessibility attributes', () => {
    render(<Header />)
    
    const menuButton = screen.getByLabelText('Toggle mobile menu')
    expect(menuButton).toHaveAttribute('aria-label', 'Toggle mobile menu')
    expect(menuButton).toHaveAttribute('aria-expanded')
  })
})