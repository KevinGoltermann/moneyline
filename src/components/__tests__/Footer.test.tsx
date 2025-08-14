import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Footer from '../Footer'

// Mock Next.js Link component
vi.mock('next/link', () => {
  return {
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
  }
})

describe('Footer', () => {
  it('renders brand logo and name correctly', () => {
    render(<Footer />)
    
    expect(screen.getByText('DailyBet AI')).toBeInTheDocument()
  })

  it('renders brand description', () => {
    render(<Footer />)
    
    expect(screen.getByText(/ML-powered betting recommendations/)).toBeInTheDocument()
    expect(screen.getByText(/using advanced data analysis/)).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Footer />)
    
    expect(screen.getByText("Today's Pick")).toBeInTheDocument()
    expect(screen.getByText('Performance')).toBeInTheDocument()
  })

  it('renders resource links with proper attributes', () => {
    render(<Footer />)
    
    const responsibleGamblingLink = screen.getByText('Responsible Gambling')
    expect(responsibleGamblingLink).toHaveAttribute('href', 'https://www.ncpgambling.org/')
    expect(responsibleGamblingLink).toHaveAttribute('target', '_blank')
    expect(responsibleGamblingLink).toHaveAttribute('rel', 'noopener noreferrer')
    
    const gamblersAnonymousLink = screen.getByText('Gamblers Anonymous')
    expect(gamblersAnonymousLink).toHaveAttribute('href', 'https://www.gamblersanonymous.org/')
    expect(gamblersAnonymousLink).toHaveAttribute('target', '_blank')
    expect(gamblersAnonymousLink).toHaveAttribute('rel', 'noopener noreferrer')
    
    const supportLink = screen.getByText('Contact Support')
    expect(supportLink).toHaveAttribute('href', 'mailto:support@dailybetai.com')
  })

  it('renders social media links with proper attributes', () => {
    render(<Footer />)
    
    const githubLink = screen.getByLabelText('GitHub')
    expect(githubLink).toHaveAttribute('href', 'https://github.com')
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
    
    const twitterLink = screen.getByLabelText('Twitter')
    expect(twitterLink).toHaveAttribute('href', 'https://twitter.com')
    expect(twitterLink).toHaveAttribute('target', '_blank')
    expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('displays current year in copyright', () => {
    render(<Footer />)
    
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(`© ${currentYear} DailyBet AI. All rights reserved.`)).toBeInTheDocument()
  })

  it('displays responsible gambling disclaimers', () => {
    render(<Footer />)
    
    expect(screen.getByText('Recommendations are for informational purposes only.')).toBeInTheDocument()
    expect(screen.getByText('Always gamble responsibly and within your means.')).toBeInTheDocument()
  })

  it('has proper section headings', () => {
    render(<Footer />)
    
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Resources')).toBeInTheDocument()
  })

  it('uses proper semantic HTML structure', () => {
    render(<Footer />)
    
    const footer = screen.getByRole('contentinfo')
    expect(footer).toBeInTheDocument()
    expect(footer.tagName).toBe('FOOTER')
  })

  it('has responsive grid layout classes', () => {
    render(<Footer />)
    
    const footer = screen.getByRole('contentinfo')
    const gridContainer = footer.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-4')
  })

  it('renders SVG icons correctly', () => {
    render(<Footer />)
    
    // Check for brand icon
    const brandIcon = screen.getByText('DailyBet AI').previousElementSibling
    expect(brandIcon).toContainHTML('svg')
    
    // Check for social media icons
    const githubLink = screen.getByLabelText('GitHub')
    expect(githubLink).toContainHTML('svg')
    
    const twitterLink = screen.getByLabelText('Twitter')
    expect(twitterLink).toContainHTML('svg')
  })
})