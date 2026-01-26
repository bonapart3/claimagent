import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

// Static page for performance
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

export const metadata = {
  title: 'Pricing - ClaimAgent',
  description: 'Simple, transparent pricing for insurance carriers of all sizes.',
};

const tiers = [
  {
    name: 'Starter',
    description: 'For small carriers getting started with automation',
    price: '2,500',
    period: '/month',
    features: [
      'Up to 500 claims/month',
      'Auto-approval workflows',
      'Basic fraud scoring',
      'Email support',
      '5 user seats',
      'Standard integrations',
    ],
    cta: 'Start Free Trial',
    href: '/sign-up',
    highlighted: false,
  },
  {
    name: 'Professional',
    description: 'For growing carriers scaling their operations',
    price: '7,500',
    period: '/month',
    features: [
      'Up to 2,500 claims/month',
      'Advanced AI damage analysis',
      'Full fraud detection suite',
      'Priority support',
      '25 user seats',
      'Custom integrations',
      'API access',
      'Dedicated success manager',
    ],
    cta: 'Start Free Trial',
    href: '/sign-up',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'For large carriers with complex requirements',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited claims',
      'White-label options',
      'Custom AI model training',
      '24/7 dedicated support',
      'Unlimited users',
      'Full API access',
      'On-premise deployment option',
      'SLA guarantees',
      'Compliance audit support',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    highlighted: false,
  },
];

export default function PricingPage() {
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
                href="/about"
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                About
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
            Simple, Transparent Pricing
          </h1>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the plan that fits your claims volume. All plans include a 14-day free trial.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-8 ${
                  tier.highlighted
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-4 ring-blue-600/20'
                    : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
                }`}
              >
                <h3 className={`text-xl font-semibold ${tier.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {tier.name}
                </h3>
                <p className={`mt-2 text-sm ${tier.highlighted ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                  {tier.description}
                </p>
                <div className="mt-6 flex items-baseline">
                  <span className={`text-4xl font-bold ${tier.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {tier.price === 'Custom' ? '' : '$'}{tier.price}
                  </span>
                  <span className={`ml-1 ${tier.highlighted ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
                    {tier.period}
                  </span>
                </div>
                <ul className="mt-8 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <svg
                        className={`w-5 h-5 mr-3 flex-shrink-0 ${tier.highlighted ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-sm ${tier.highlighted ? 'text-blue-50' : 'text-gray-600 dark:text-gray-400'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`mt-8 block w-full py-3 px-4 rounded-lg text-center font-medium transition-all ${
                    tier.highlighted
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What counts as a claim?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                A claim is counted when it enters our system, regardless of whether it&apos;s auto-approved
                or requires manual review. Reopened claims don&apos;t count as new claims.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, you can upgrade or downgrade at any time. Changes take effect at the start
                of your next billing cycle. We&apos;ll prorate any differences.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                What integrations are included?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Standard integrations include major policy admin systems, payment processors,
                and document management platforms. Custom integrations are available on Professional
                and Enterprise plans.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Is there a setup fee?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No setup fees for Starter and Professional plans. Enterprise deployments may include
                implementation services depending on your requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Not sure which plan is right?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Talk to our team about your specific needs.
          </p>
          <Link
            href="/contact"
            className="inline-flex px-8 py-4 rounded-xl bg-blue-600 text-white font-medium text-lg hover:bg-blue-700 transition-all"
          >
            Book a Demo
          </Link>
        </div>
      </section>

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
