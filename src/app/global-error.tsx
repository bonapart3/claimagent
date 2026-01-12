'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-red-100 rounded-full">
                                <AlertTriangle className="w-16 h-16 text-red-600" />
                            </div>
                        </div>

                        <h1 className="text-6xl font-bold text-gray-900 mb-2">Error</h1>
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                            Critical Application Error
                        </h2>
                        <p className="text-gray-500 mb-8 max-w-md">
                            A critical error occurred. Please refresh the page or contact support.
                        </p>

                        {error.digest && (
                            <p className="text-xs text-gray-400 mb-6">
                                Error ID: {error.digest}
                            </p>
                        )}

                        <button
                            onClick={reset}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Try Again
                        </button>
                    </div>

                    <div className="mt-12 text-sm text-gray-400">
                        ClaimAgent™ • Autonomous Claims Processing
                    </div>
                </div>
            </body>
        </html>
    );
}
