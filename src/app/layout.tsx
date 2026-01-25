// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
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
  title: 'Veridicus - Ship AI Products That Matter',
  description: 'From ClaimAgent to Conduct.me - build, deploy, scale. AI-powered solutions for modern enterprises.',
  keywords: 'AI, claims processing, fact-checking, multi-agent orchestration, enterprise AI',
  authors: [{ name: 'Veridicus Team' }],
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
          <link rel="icon" href="/logo.svg" type="image/svg+xml" />
          <meta name="theme-color" content="#2563eb" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
        </head>
        <body
          className="antialiased bg-white dark:bg-gray-950"
          style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
        >
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
