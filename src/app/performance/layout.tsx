import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Performance Tracking',
  description: 'Track the ML algorithm\'s betting performance, win rate, and historical results. View detailed analytics and performance trends over time.',
  openGraph: {
    title: 'Performance Tracking | DailyBet AI',
    description: 'Track the ML algorithm\'s betting performance, win rate, and historical results. View detailed analytics and performance trends over time.',
    url: 'https://dailybetai.com/performance',
  },
  twitter: {
    title: 'Performance Tracking | DailyBet AI',
    description: 'Track the ML algorithm\'s betting performance, win rate, and historical results. View detailed analytics and performance trends over time.',
  },
}

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}