import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export const metadata = {
  title: 'Terms of Service - ClaimAgent',
  description: 'ClaimAgent Terms of Service - Terms and conditions for using our platform.',
};

export default function TermsPage() {
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

      {/* Content */}
      <div className="pt-32 pb-20 px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Terms of Service</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Last updated: January 2026</p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 dark:text-gray-400">
                By accessing or using ClaimAgent&apos;s services, you agree to be bound by these Terms of Service.
                If you do not agree to these terms, you may not use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Description of Service</h2>
              <p className="text-gray-600 dark:text-gray-400">
                ClaimAgent provides AI-powered insurance claims processing software. Our platform helps
                insurance carriers automate claims intake, analysis, and settlement processes while
                maintaining regulatory compliance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. User Responsibilities</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                As a user of ClaimAgent, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the service in compliance with applicable laws and regulations</li>
                <li>Not attempt to circumvent security measures</li>
                <li>Not use the service for fraudulent purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Subscription and Billing</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Subscription fees are billed monthly or annually based on your selected plan. You may
                cancel your subscription at any time. Refunds are provided according to our refund policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Intellectual Property</h2>
              <p className="text-gray-600 dark:text-gray-400">
                ClaimAgent and its licensors retain all intellectual property rights in the service.
                You retain ownership of your data. We do not claim ownership of claims data processed
                through our platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Limitation of Liability</h2>
              <p className="text-gray-600 dark:text-gray-400">
                ClaimAgent provides tools to assist with claims processing but does not make final
                claims decisions. Ultimate responsibility for claims decisions rests with the insurance
                carrier. We are not liable for claims outcomes or regulatory penalties resulting from
                your use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Service Level Agreement</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Enterprise customers receive SLA guarantees as specified in their service agreement.
                Standard plans include commercially reasonable uptime commitments.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Termination</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Either party may terminate the service relationship with 30 days notice. We may
                immediately terminate access for violation of these terms. Upon termination, you
                may export your data within 30 days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Governing Law</h2>
              <p className="text-gray-600 dark:text-gray-400">
                These terms are governed by the laws of the State of Delaware, without regard to
                conflict of law principles.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Contact</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Questions about these Terms of Service may be directed to{' '}
                <a href="mailto:legal@claimagent.io" className="text-blue-600 hover:text-blue-700">
                  legal@claimagent.io
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
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
