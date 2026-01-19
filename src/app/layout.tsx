<<<<<<< Updated upstream
<<<<<<< Updated upstream
// src/app/layout.tsx
=======
// Root layout component for the application
>>>>>>> Stashed changes
=======
// Root layout component for the application
>>>>>>> Stashed changes
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Toaster } from '@/components/ui/Toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ClaimAgent™ - Autonomous Auto Insurance Claims Platform',
  description: 'AI-powered automotive insurance claims processing with 50-state compliance, fraud detection, and automated decision routing.',
  keywords: 'insurance claims, auto claims, AI claims processing, fraud detection, claims automation',
  authors: [{ name: 'ClaimAgent™ Team' }],
  robots: 'noindex, nofollow', // Production: remove this
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </head>
      <body className={`${inter.className} antialiased bg-gray-50 dark:bg-gray-900`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            {/* Global Navigation */}
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
              <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                  <div className="flex items-center space-x-3">
                    <img src="/logo.svg" alt="ClaimAgent™" className="h-10 w-10" />
                    <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                      ClaimAgent™
                    </span>
                  </div>

                  {/* Navigation Links - Server-side rendered for SEO */}
                  <div className="hidden md:flex items-center space-x-6">
                    <a href="/claims/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                      Dashboard
                    </a>
                    <a href="/claims/new" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                      New Claim
                    </a>
                    <a href="/admin" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                      Admin
                    </a>
                    <div className="flex items-center space-x-2 pl-4 border-l border-gray-300 dark:border-gray-600">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">U</span>
                      </div>
                    </div>
                  </div>
                </div>
              </nav>
            </header>

            {/* Main Content */}
            <main className="flex-1">
              {children}
            </main>

            {/* Footer */}
            <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    © {new Date().getFullYear()} ClaimAgent™. All rights reserved. | 50-State Certified | CCPA & GLBA Compliant
                  </div>
                  <div className="flex space-x-4 text-sm">
                    <a href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                      Privacy Policy
                    </a>
                    <a href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                      Terms of Service
                    </a>
                    <a href="/compliance" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                      Compliance
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          </div>

          {/* Global Toast Notifications */}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}