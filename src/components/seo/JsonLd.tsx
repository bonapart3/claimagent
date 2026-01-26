// JSON-LD Structured Data for SEO
export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ClaimAgent',
    url: 'https://www.claimagent.io',
    logo: 'https://www.claimagent.io/logo.jpg',
    description: 'AI-powered auto insurance claims processing platform with 50-state compliance, fraud detection, and automated decision routing.',
    foundingDate: '2024',
    industry: 'Insurance Technology',
    sameAs: [
      'https://twitter.com/claimagent',
      'https://linkedin.com/company/claimagent',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'sales@claimagent.io',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ClaimAgent',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Autonomous auto insurance claims processing platform. AI-powered damage assessment, fraud detection, and 50-state regulatory compliance.',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '299',
      highPrice: '999',
      priceCurrency: 'USD',
      offerCount: '3',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'AI-powered damage assessment',
      'Automated fraud detection',
      '50-state regulatory compliance',
      'FNOL to settlement automation',
      'Photo and document OCR',
      'Real-time claim tracking',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function FAQJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function LocalBusinessJsonLd({ state, stateName }: { state: string; stateName: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `ClaimAgent - ${stateName} Auto Insurance Claims`,
    description: `AI-powered auto insurance claims processing for ${stateName}. Fully compliant with ${stateName} insurance regulations. Automated FNOL, damage assessment, and settlement.`,
    provider: {
      '@type': 'Organization',
      name: 'ClaimAgent',
      url: 'https://www.claimagent.io',
    },
    areaServed: {
      '@type': 'State',
      name: stateName,
      containedInPlace: {
        '@type': 'Country',
        name: 'United States',
      },
    },
    serviceType: 'Insurance Claims Processing Software',
    url: `https://www.claimagent.io/states/${state}`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
