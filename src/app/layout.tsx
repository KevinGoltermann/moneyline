import type { Metadata, Viewport } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ErrorBoundary from '@/components/ErrorBoundary'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'DailyBet AI - ML-Powered Betting Recommendations',
    template: '%s | DailyBet AI'
  },
  description: 'Get daily betting recommendations powered by machine learning analysis of odds, team performance, and market data. Track algorithm performance and make informed betting decisions.',
  keywords: [
    'betting recommendations',
    'machine learning betting',
    'AI sports betting',
    'odds analysis',
    'betting algorithm',
    'ML predictions',
    'sports analytics',
    'betting strategy',
    'data-driven betting',
    'algorithmic betting'
  ],
  authors: [{ name: 'DailyBet AI', url: 'https://dailybetai.com' }],
  creator: 'DailyBet AI',
  publisher: 'DailyBet AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://dailybetai.com'),
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://dailybetai.com',
    title: 'DailyBet AI - ML-Powered Betting Recommendations',
    description: 'Get daily betting recommendations powered by machine learning analysis of odds, team performance, and market data.',
    siteName: 'DailyBet AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DailyBet AI - ML-Powered Betting Recommendations',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DailyBet AI - ML-Powered Betting Recommendations',
    description: 'Get daily betting recommendations powered by machine learning analysis of odds, team performance, and market data.',
    creator: '@dailybetai',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://dailybetai.com',
  },
  category: 'sports',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="DailyBet AI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DailyBet AI" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="min-h-full bg-gray-50 text-foreground flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "DailyBet AI",
              "description": "ML-powered betting recommendations using advanced data analysis",
              "url": "https://dailybetai.com",
              "applicationCategory": "SportsApplication",
              "operatingSystem": "Any",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "DailyBet AI"
              }
            })
          }}
        />
        <ErrorBoundary>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </ErrorBoundary>
      </body>
    </html>
  )
}