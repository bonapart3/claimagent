// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'ClaimAgent - AI-Powered Claims Processing',
  description: 'Autonomous auto insurance claims with 50-state compliance, fraud detection, and automated decision routing.',
  keywords: 'insurance claims, auto claims, AI claims processing, fraud detection, claims automation',
  authors: [{ name: 'ClaimAgent Team' }],
  metadataBase: new URL('https://www.claimagent.io'),
  openGraph: {
    title: 'ClaimAgent - AI-Powered Claims Processing',
    description: 'Autonomous auto insurance claims with 50-state compliance, fraud detection, and automated decision routing.',
    url: 'https://www.claimagent.io',
    siteName: 'ClaimAgent',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClaimAgent - AI-Powered Claims Processing',
    description: 'Autonomous auto insurance claims with 50-state compliance, fraud detection, and automated decision routing.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/logo.jpg" type="image/jpeg" />
          {/* theme-color is supported by Chrome, Edge, Safari; gracefully ignored by Firefox/Opera */}
          {/* eslint-disable-next-line compat-api/html */}
          <meta name="theme-color" content="#2563eb" media="(prefers-color-scheme: light)" />
          {/* eslint-disable-next-line compat-api/html */}
          <meta name="theme-color" content="#1e3a8a" media="(prefers-color-scheme: dark)" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
        </head>
        <body
          className="antialiased bg-white dark:bg-gray-950"
          style={{ fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
        >
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
          <Toaster />
          <SpeedInsights />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
