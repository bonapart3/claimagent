import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { states, getStateBySlug, getAllStateSlugs } from '@/lib/data/states';
import { LocalBusinessJsonLd, FAQJsonLd } from '@/components/seo/JsonLd';
import Logo from '@/components/ui/Logo';

// Generate static pages for all 50 states at build time
export function generateStaticParams() {
  return getAllStateSlugs().map((state) => ({
    state,
  }));
}

// Generate unique metadata for each state page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  const stateData = getStateBySlug(state);

  if (!stateData) {
    return {
      title: 'State Not Found | ClaimAgent',
    };
  }

  const title = `Auto Insurance Claims Processing ${stateData.name} | ClaimAgent`;
  const description = `AI-powered auto insurance claims automation for ${stateData.name}. ${stateData.abbreviation} compliant with ${stateData.acknowledgmentDays}-day acknowledgment, ${stateData.investigationDays}-day investigation timeline. Automated FNOL, damage assessment, and settlement.`;

  return {
    title,
    description,
    keywords: `auto insurance claims ${stateData.name}, ${stateData.abbreviation} claims processing, insurance automation ${stateData.name}, FNOL ${stateData.abbreviation}, claims adjuster ${stateData.name}`,
    openGraph: {
      title,
      description,
      url: `https://www.claimagent.io/states/${state}`,
      siteName: 'ClaimAgent',
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://www.claimagent.io/states/${state}`,
    },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const stateData = getStateBySlug(state);

  if (!stateData) {
    notFound();
  }

  // State-specific FAQs for JSON-LD
  const faqs = [
    {
      question: `What is the total loss threshold in ${stateData.name}?`,
      answer: `In ${stateData.name}, a vehicle is typically considered a total loss when repair costs exceed ${Math.round(stateData.totalLossThreshold * 100)}% of the vehicle's actual cash value. ClaimAgent automatically calculates this using ${stateData.abbreviation}-specific regulations.`,
    },
    {
      question: `How quickly must insurance companies acknowledge claims in ${stateData.name}?`,
      answer: `${stateData.name} requires insurance companies to acknowledge receipt of a claim within ${stateData.acknowledgmentDays} days. ClaimAgent's automated FNOL processing ensures immediate acknowledgment and compliance with ${stateData.abbreviation} timelines.`,
    },
    {
      question: `What is the claims investigation timeline in ${stateData.name}?`,
      answer: `Insurance companies in ${stateData.name} generally have ${stateData.investigationDays} days to complete their investigation. ClaimAgent accelerates this process with AI-powered damage assessment and automated documentation.`,
    },
    {
      question: `How fast must insurers pay claims in ${stateData.name}?`,
      answer: `After a claim is approved in ${stateData.name}, insurers typically must issue payment within ${stateData.paymentDays} days. ClaimAgent's automated settlement processing helps ensure timely payments.`,
    },
  ];

  return (
    <>
      <LocalBusinessJsonLd state={state} stateName={stateData.name} />
      <FAQJsonLd faqs={faqs} />

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center gap-2">
                <Logo size="sm" />
                <span className="font-semibold text-slate-900">ClaimAgent</span>
              </Link>
              <div className="hidden md:flex items-center gap-8">
                <Link href="/about" className="text-slate-600 hover:text-slate-900 transition-colors">
                  About
                </Link>
                <Link href="/pricing" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Pricing
                </Link>
                <Link href="/contact" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Contact
                </Link>
                <Link
                  href="/sign-in"
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                {stateData.abbreviation} Compliant
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Auto Insurance Claims Processing in {stateData.name}
              </h1>
              <p className="text-xl text-slate-300 mb-8">
                AI-powered claims automation built for {stateData.name}&apos;s regulatory requirements.
                From FNOL to settlement, fully compliant with {stateData.abbreviation} insurance laws.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center bg-amber-500 text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-amber-400 transition-colors"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center bg-white/10 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors"
                >
                  Request Demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* State Regulations Section */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              {stateData.name} Insurance Claim Regulations
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="text-3xl font-bold text-amber-500 mb-2">
                  {Math.round(stateData.totalLossThreshold * 100)}%
                </div>
                <div className="text-slate-600 font-medium">Total Loss Threshold</div>
                <p className="text-sm text-slate-500 mt-2">
                  Vehicle declared total loss when repairs exceed this percentage of ACV
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="text-3xl font-bold text-amber-500 mb-2">
                  {stateData.acknowledgmentDays} Days
                </div>
                <div className="text-slate-600 font-medium">Acknowledgment Window</div>
                <p className="text-sm text-slate-500 mt-2">
                  Required timeframe to acknowledge receipt of claim
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="text-3xl font-bold text-amber-500 mb-2">
                  {stateData.investigationDays} Days
                </div>
                <div className="text-slate-600 font-medium">Investigation Period</div>
                <p className="text-sm text-slate-500 mt-2">
                  Standard timeframe to complete claim investigation
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="text-3xl font-bold text-amber-500 mb-2">
                  {stateData.paymentDays} Days
                </div>
                <div className="text-slate-600 font-medium">Payment Timeline</div>
                <p className="text-sm text-slate-500 mt-2">
                  Required timeframe to issue payment after approval
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Highlights Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Why ClaimAgent for {stateData.name}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {stateData.highlights.map((highlight, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{highlight}</h3>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{stateData.abbreviation} Regulatory Compliance</h3>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">AI-Powered Damage Assessment</h3>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Automated Fraud Detection</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              {stateData.name} Auto Claims FAQ
            </h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-3">{faq.question}</h3>
                  <p className="text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-slate-900 text-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Claims Processing in {stateData.name}?
            </h2>
            <p className="text-slate-300 mb-8">
              Join insurance companies across {stateData.name} using ClaimAgent to automate claims,
              reduce cycle times, and ensure {stateData.abbreviation} compliance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center bg-amber-500 text-slate-900 px-8 py-3 rounded-lg font-semibold hover:bg-amber-400 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center bg-white/10 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Other States Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
              ClaimAgent Serves All 50 States
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {states.map((s) => (
                <Link
                  key={s.slug}
                  href={`/states/${s.slug}`}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    s.slug === state
                      ? 'bg-amber-500 text-slate-900 font-medium'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.abbreviation}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Logo size="sm" variant="light" />
                  <span className="font-semibold text-white">ClaimAgent</span>
                </div>
                <p className="text-sm">
                  AI-powered auto insurance claims processing with 50-state compliance.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                  <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                  <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Coverage</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/states/california" className="hover:text-white transition-colors">California</Link></li>
                  <li><Link href="/states/texas" className="hover:text-white transition-colors">Texas</Link></li>
                  <li><Link href="/states/florida" className="hover:text-white transition-colors">Florida</Link></li>
                  <li><Link href="/states/new-york" className="hover:text-white transition-colors">New York</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm">&copy; {new Date().getFullYear()} ClaimAgent. All rights reserved.</p>
              <p className="text-sm">
                Built with{' '}
                <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Claude by Anthropic
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
