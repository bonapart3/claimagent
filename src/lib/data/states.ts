// State data for programmatic SEO pages
export interface StateData {
  slug: string;
  name: string;
  abbreviation: string;
  totalLossThreshold: number;
  acknowledgmentDays: number;
  investigationDays: number;
  paymentDays: number;
  highlights: string[];
}

export const states: StateData[] = [
  { slug: 'alabama', name: 'Alabama', abbreviation: 'AL', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Competitive total loss threshold', 'Standard acknowledgment timeline'] },
  { slug: 'alaska', name: 'Alaska', abbreviation: 'AK', totalLossThreshold: 0.80, acknowledgmentDays: 10, investigationDays: 30, paymentDays: 30, highlights: ['Remote claims handling expertise', 'Weather-related damage specialists'] },
  { slug: 'arizona', name: 'Arizona', abbreviation: 'AZ', totalLossThreshold: 0.75, acknowledgmentDays: 10, investigationDays: 30, paymentDays: 30, highlights: ['High-volume market', 'Heat damage assessment'] },
  { slug: 'arkansas', name: 'Arkansas', abbreviation: 'AR', totalLossThreshold: 0.70, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Lower total loss threshold', 'Storm damage processing'] },
  { slug: 'california', name: 'California', abbreviation: 'CA', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 40, paymentDays: 30, highlights: ['Largest auto insurance market', 'Strict consumer protection laws', 'Wildfire damage specialists'] },
  { slug: 'colorado', name: 'Colorado', abbreviation: 'CO', totalLossThreshold: 1.00, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['100% total loss threshold', 'Hail damage expertise'] },
  { slug: 'connecticut', name: 'Connecticut', abbreviation: 'CT', totalLossThreshold: 0.75, acknowledgmentDays: 10, investigationDays: 30, paymentDays: 30, highlights: ['Fast acknowledgment required', 'Dense urban market'] },
  { slug: 'delaware', name: 'Delaware', abbreviation: 'DE', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Corporate-friendly regulations', 'Quick processing times'] },
  { slug: 'florida', name: 'Florida', abbreviation: 'FL', totalLossThreshold: 0.80, acknowledgmentDays: 14, investigationDays: 30, paymentDays: 20, highlights: ['Second largest market', 'Hurricane damage specialists', 'Fast payment requirements'] },
  { slug: 'georgia', name: 'Georgia', abbreviation: 'GA', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Growing market', 'Storm damage processing'] },
  { slug: 'hawaii', name: 'Hawaii', abbreviation: 'HI', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Island logistics expertise', 'Import vehicle specialists'] },
  { slug: 'idaho', name: 'Idaho', abbreviation: 'ID', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Rural claims handling', 'Winter damage expertise'] },
  { slug: 'illinois', name: 'Illinois', abbreviation: 'IL', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Major urban market', 'Weather variety handling'] },
  { slug: 'indiana', name: 'Indiana', abbreviation: 'IN', totalLossThreshold: 0.70, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Lower threshold benefits', 'Midwest weather experts'] },
  { slug: 'iowa', name: 'Iowa', abbreviation: 'IA', totalLossThreshold: 0.50, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Lowest total loss threshold', 'Agricultural vehicle specialists'] },
  { slug: 'kansas', name: 'Kansas', abbreviation: 'KS', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Tornado damage expertise', 'Rural coverage'] },
  { slug: 'kentucky', name: 'Kentucky', abbreviation: 'KY', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['No-fault considerations', 'Regional expertise'] },
  { slug: 'louisiana', name: 'Louisiana', abbreviation: 'LA', totalLossThreshold: 0.75, acknowledgmentDays: 30, investigationDays: 30, paymentDays: 30, highlights: ['Hurricane specialists', 'Flood damage processing'] },
  { slug: 'maine', name: 'Maine', abbreviation: 'ME', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Winter damage expertise', 'Rural coverage'] },
  { slug: 'maryland', name: 'Maryland', abbreviation: 'MD', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['DC metro coverage', 'Dense traffic expertise'] },
  { slug: 'massachusetts', name: 'Massachusetts', abbreviation: 'MA', totalLossThreshold: 0.75, acknowledgmentDays: 10, investigationDays: 30, paymentDays: 30, highlights: ['Fast acknowledgment required', 'Historic vehicle specialists'] },
  { slug: 'michigan', name: 'Michigan', abbreviation: 'MI', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['No-fault state expertise', 'Auto industry knowledge'] },
  { slug: 'minnesota', name: 'Minnesota', abbreviation: 'MN', totalLossThreshold: 0.70, acknowledgmentDays: 10, investigationDays: 30, paymentDays: 30, highlights: ['No-fault handling', 'Severe winter expertise'] },
  { slug: 'mississippi', name: 'Mississippi', abbreviation: 'MS', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Storm damage specialists', 'Rural processing'] },
  { slug: 'missouri', name: 'Missouri', abbreviation: 'MO', totalLossThreshold: 0.80, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Central location hub', 'Weather variety'] },
  { slug: 'montana', name: 'Montana', abbreviation: 'MT', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Rural claims expertise', 'Wildlife collision specialists'] },
  { slug: 'nebraska', name: 'Nebraska', abbreviation: 'NE', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Agricultural vehicle coverage', 'Hail damage expertise'] },
  { slug: 'nevada', name: 'Nevada', abbreviation: 'NV', totalLossThreshold: 0.65, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Low threshold state', 'Desert climate expertise'] },
  { slug: 'new-hampshire', name: 'New Hampshire', abbreviation: 'NH', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['No mandatory insurance handling', 'Winter specialists'] },
  { slug: 'new-jersey', name: 'New Jersey', abbreviation: 'NJ', totalLossThreshold: 0.75, acknowledgmentDays: 10, investigationDays: 30, paymentDays: 30, highlights: ['Dense market expertise', 'Fast acknowledgment'] },
  { slug: 'new-mexico', name: 'New Mexico', abbreviation: 'NM', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Desert climate expertise', 'Rural coverage'] },
  { slug: 'new-york', name: 'New York', abbreviation: 'NY', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['No-fault state', 'Largest urban market', 'Strict regulations'] },
  { slug: 'north-carolina', name: 'North Carolina', abbreviation: 'NC', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Growing market', 'Hurricane coverage'] },
  { slug: 'north-dakota', name: 'North Dakota', abbreviation: 'ND', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['No-fault handling', 'Severe weather expertise'] },
  { slug: 'ohio', name: 'Ohio', abbreviation: 'OH', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Major market', 'Weather variety handling'] },
  { slug: 'oklahoma', name: 'Oklahoma', abbreviation: 'OK', totalLossThreshold: 0.60, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Low threshold state', 'Tornado specialists'] },
  { slug: 'oregon', name: 'Oregon', abbreviation: 'OR', totalLossThreshold: 0.80, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['PIP coverage expertise', 'Weather damage specialists'] },
  { slug: 'pennsylvania', name: 'Pennsylvania', abbreviation: 'PA', totalLossThreshold: 0.75, acknowledgmentDays: 10, investigationDays: 30, paymentDays: 30, highlights: ['Choice no-fault state', 'Fast acknowledgment'] },
  { slug: 'rhode-island', name: 'Rhode Island', abbreviation: 'RI', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Dense market', 'Coastal damage expertise'] },
  { slug: 'south-carolina', name: 'South Carolina', abbreviation: 'SC', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Hurricane specialists', 'Growing market'] },
  { slug: 'south-dakota', name: 'South Dakota', abbreviation: 'SD', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Rural expertise', 'Weather damage handling'] },
  { slug: 'tennessee', name: 'Tennessee', abbreviation: 'TN', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Growing market', 'Storm damage expertise'] },
  { slug: 'texas', name: 'Texas', abbreviation: 'TX', totalLossThreshold: 1.00, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 5, highlights: ['100% threshold state', 'Largest by geography', 'Fast payment required', 'Hail damage specialists'] },
  { slug: 'utah', name: 'Utah', abbreviation: 'UT', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['No-fault PIP handling', 'Mountain weather expertise'] },
  { slug: 'vermont', name: 'Vermont', abbreviation: 'VT', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Rural specialists', 'Winter damage expertise'] },
  { slug: 'virginia', name: 'Virginia', abbreviation: 'VA', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['DC metro coverage', 'Growing market'] },
  { slug: 'washington', name: 'Washington', abbreviation: 'WA', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Tech-forward market', 'Rain damage expertise'] },
  { slug: 'west-virginia', name: 'West Virginia', abbreviation: 'WV', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Rural coverage', 'Mountain terrain expertise'] },
  { slug: 'wisconsin', name: 'Wisconsin', abbreviation: 'WI', totalLossThreshold: 0.70, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Lower threshold', 'Severe winter expertise'] },
  { slug: 'wyoming', name: 'Wyoming', abbreviation: 'WY', totalLossThreshold: 0.75, acknowledgmentDays: 15, investigationDays: 30, paymentDays: 30, highlights: ['Rural specialists', 'Wildlife collision expertise'] },
];

export function getStateBySlug(slug: string): StateData | undefined {
  return states.find((s) => s.slug === slug);
}

export function getAllStateSlugs(): string[] {
  return states.map((s) => s.slug);
}
