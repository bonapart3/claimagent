// src/app/page.tsx
// ClaimAgent landing page - focused, minimal design
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/logo.jpg" alt="ClaimAgent" className="h-10 w-auto" />
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950" />

        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center pt-24">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white tracking-tight leading-[1.1]">
            AI-Powered
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Claims Processing
            </span>
          </h1>

          <p className="mt-8 text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
            Autonomous auto insurance claims with 50-state compliance,
            fraud detection, and automated decision routing.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Get Started
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
            >
              Learn More
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
              How it works
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              From FNOL to settlement in hours, not days
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Intake */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-6">
                <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Submit Claim
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                FNOL intake with photo uploads, policy validation, and instant acknowledgment.
              </p>
            </div>

            {/* Processing */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-6">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                AI Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Damage assessment, fraud scoring, and coverage verification in minutes.
              </p>
            </div>

            {/* Settlement */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-800">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center mb-6">
                <span className="text-violet-600 dark:text-violet-400 font-bold text-lg">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Fast Settlement
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Automated routing, approval workflows, and compliant payouts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">70%</div>
              <div className="mt-2 text-gray-600 dark:text-gray-400">Faster Processing</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">84%</div>
              <div className="mt-2 text-gray-600 dark:text-gray-400">Cost Reduction</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">50</div>
              <div className="mt-2 text-gray-600 dark:text-gray-400">State Compliant</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">80%+</div>
              <div className="mt-2 text-gray-600 dark:text-gray-400">Auto-Approval Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
            Ready to automate your claims?
          </h2>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-400">
            See how ClaimAgent can transform your claims operation.
          </p>
          <div className="mt-10">
            <Link
              href="/sign-up"
              className="inline-flex px-8 py-4 rounded-xl bg-blue-600 text-white font-medium text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                &copy; {new Date().getFullYear()} ClaimAgent. All rights reserved.
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
