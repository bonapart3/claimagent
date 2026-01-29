import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

// Static page for performance
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

export const metadata = {
  title: 'About - ClaimAgent',
  description: 'Learn about ClaimAgent and our mission to transform insurance claims processing with AI.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <Logo size="md" />
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/pricing"
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Pricing
              </Link>
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

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
            Transforming Claims Processing
          </h1>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            We&apos;re building the future of insurance claims - where AI handles the routine
            so adjusters can focus on what matters.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Our Mission
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                Insurance claims are broken. Policyholders wait weeks for resolution.
                Adjusters drown in paperwork. Carriers lose money to inefficiency and fraud.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                ClaimAgent changes that. Our AI-powered platform automates the entire claims
                lifecycle - from first notice of loss to settlement - while maintaining
                50-state regulatory compliance.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Our goal: claims resolved in hours instead of weeks. Fraud caught before
                payment. Adjusters empowered to focus on complex cases that need human judgment.
              </p>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
              <div className="space-y-6">
                <div>
                  <div className="text-4xl font-bold">50</div>
                  <div className="text-amber-200">State regulations built in</div>
                </div>
                <div>
                  <div className="text-4xl font-bold">12+</div>
                  <div className="text-amber-200">Specialized AI agents</div>
                </div>
                <div>
                  <div className="text-4xl font-bold">&lt;1hr</div>
                  <div className="text-amber-200">Target FNOL-to-decision</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            What We Believe
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Speed Matters</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Every day a claim stays open costs money and erodes trust. We optimize for resolution time.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Compliance First</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Insurance is regulated for good reason. Our platform enforces state-specific rules automatically.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Humans in the Loop</h3>
              <p className="text-gray-600 dark:text-gray-400">
                AI handles routine decisions. Complex cases, disputes, and edge cases go to experienced adjusters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to modernize your claims operation?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            See how ClaimAgent can work for your organization.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="px-8 py-4 rounded-xl bg-amber-500 text-white font-medium text-lg hover:bg-amber-600 transition-all"
            >
              Book a Demo
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <Logo size="sm" variant="icon" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                &copy; {new Date().getFullYear()} ClaimAgent. All rights reserved.
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/about" className="hover:text-gray-900 dark:hover:text-white transition-colors">About</Link>
              <Link href="/pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</Link>
              <Link href="/contact" className="hover:text-gray-900 dark:hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
