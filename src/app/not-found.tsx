import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
            <div className="text-center">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-blue-100 rounded-full">
                        <FileQuestion className="w-16 h-16 text-blue-600" />
                    </div>
                </div>

                <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                    Page Not Found
                </h2>
                <p className="text-gray-500 mb-8 max-w-md">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    Check the URL or navigate back to the dashboard.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/claims/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        Go to Dashboard
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go Back
                    </button>
                </div>
            </div>

            <div className="mt-12 text-sm text-gray-400">
                ClaimAgent™ • Autonomous Claims Processing
            </div>
        </div>
    );
}
