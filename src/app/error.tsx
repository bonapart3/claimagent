'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to console in development
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
            <div className="text-center">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-100 rounded-full">
                        <AlertTriangle className="w-16 h-16 text-red-600" />
                    </div>
                </div>

                <h1 className="text-6xl font-bold text-gray-900 mb-2">500</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                    Something Went Wrong
                </h2>
                <p className="text-gray-500 mb-8 max-w-md">
                    An unexpected error occurred. Our team has been notified.
                    Please try again or return to the dashboard.
                </p>

                {error.digest && (
                    <p className="text-xs text-gray-400 mb-6">
                        Error ID: {error.digest}
                    </p>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                    </button>
                    <Link
                        href="/claims/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        Go to Dashboard
                    </Link>
                </div>
            </div>

            <div className="mt-12 text-sm text-gray-400">
                ClaimAgent™ • Autonomous Claims Processing
            </div>
        </div>
    );
}
