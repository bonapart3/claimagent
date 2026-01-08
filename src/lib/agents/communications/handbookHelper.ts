/**
 * AGENT E4: Handbook Helper
 * 
 * Responsibilities:
 * - RAG-based retrieval from carrier manuals and handbooks
 * - Surface relevant policy language and procedures
 * - Provide statute snippets with source links
 * - Cross-reference training materials
 * - Context-aware documentation assistance
 */

import { auditLog } from '@/lib/utils/auditLogger';
import { STATE_REGULATIONS } from '@/lib/constants/states';

// ==================== TYPES ====================

export interface HandbookQuery {
  claimId: string;
  queryType: 'policy_language' | 'procedure' | 'statute' | 'training' | 'precedent';
  context: string;
  state?: string;
  topic?: string;
  keywords?: string[];
}

export interface HandbookResponse {
  claimId: string;
  queryType: string;
  results: HandbookResult[];
  summary: string;
  confidence: number;
  generatedAt: string;
  metadata: {
    agentVersion: string;
    sourcesChecked: number;
    resultsReturned: number;
  };
}

export interface HandbookResult {
  source: string;
  sourceType: 'carrier_manual' | 'state_statute' | 'regulation' | 'training_guide' | 'case_law';
  title: string;
  excerpt: string;
  fullText?: string;
  citation: string;
  relevanceScore: number;
  section: string;
  url?: string;
  effectiveDate?: string;
  notes?: string;
}

// ==================== HANDBOOK HELPER ====================

export class HandbookHelper {
  private readonly agentId = 'AGENT_E4';
  private readonly version = '1.0.0';

  // Simulated RAG index - In production, this would connect to vector database
  private readonly knowledgeBase: Record<string, HandbookResult[]> = {
    'total_loss': [
      {
        source: 'Auto Claims Handling Manual',
        sourceType: 'carrier_manual',
        title: 'Total Loss Determination Procedures',
        excerpt: 'A vehicle is considered a total loss when repair costs plus salvage value exceed 75% of actual cash value, or when state-specific thresholds apply.',
        citation: 'Section 4.2.1 - Total Loss Standards',
        relevanceScore: 0.95,
        section: 'Chapter 4: Valuation Procedures',
        notes: 'Must comply with state-specific total loss thresholds'
      },
      {
        source: 'State Regulations Database',
        sourceType: 'state_statute',
        title: 'Total Loss Thresholds by State',
        excerpt: 'Total loss thresholds vary by state from 60% to 100% of ACV. Some states mandate specific calculation methods.',
        citation: 'STATE_REGULATIONS.totalLossThreshold',
        relevanceScore: 0.90,
        section: 'State-Specific Requirements',
        url: 'https://regulations.example.com/total-loss'
      }
    ],
    'fraud_detection': [
      {
        source: 'SIU/Fraud Playbook',
        sourceType: 'carrier_manual',
        title: 'Red Flags for Staged Accidents',
        excerpt: 'Common indicators include: conflicting witness statements, pre-existing damage, unusual claim patterns, excessive medical treatment, and known associations with fraud rings.',
        citation: 'Section 2.3 - Staged Accident Indicators',
        relevanceScore: 0.98,
        section: 'Chapter 2: Fraud Detection',
        notes: 'Requires SIU referral when 3+ indicators present'
      }
    ],
    'reservation_of_rights': [
      {
        source: 'Claims Correspondence Style Guide',
        sourceType: 'carrier_manual',
        title: 'Reservation of Rights Letter Requirements',
        excerpt: 'ROR letters must be sent within 30 days when coverage is uncertain. Must clearly state specific policy provisions at issue and not create waiver or estoppel.',
        citation: 'Section 5.1 - Reservation of Rights Protocol',
        relevanceScore: 0.92,
        section: 'Chapter 5: Coverage Communications'
      }
    ],
    'payment_deadlines': [
      {
        source: 'State Prompt Payment Laws',
        sourceType: 'regulation',
        title: 'Payment Timing Requirements',
        excerpt: 'Most states require payment within 15-30 days of settlement agreement. Delays may trigger interest penalties and bad faith claims.',
        citation: 'STATE_REGULATIONS.paymentDeadlineDays',
        relevanceScore: 0.88,
        section: 'Payment Compliance',
        url: 'https://regulations.example.com/prompt-payment'
      }
    ]
  };

  /**
   * Query handbook and retrieve relevant content
   */
  async queryHandbook(query: HandbookQuery, userId: string): Promise<HandbookResponse> {
    try {
      await auditLog({
        action: 'handbook_query_initiated',
        agentId: this.agentId,
        claimId: query.claimId,
        userId,
        metadata: { queryType: query.queryType, topic: query.topic }
      });

      // Search knowledge base
      const results = this.searchKnowledgeBase(query);

      // Enhance with state-specific information
      if (query.state) {
        results.push(...this.getStateSpecificInfo(query.state, query.topic));
      }

      // Sort by relevance
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Take top results
      const topResults = results.slice(0, 5);

      // Generate summary
      const summary = this.generateSummary(query, topResults);

      // Calculate confidence
      const confidence = this.calculateConfidence(topResults);

      const response: HandbookResponse = {
        claimId: query.claimId,
        queryType: query.queryType,
        results: topResults,
        summary,
        confidence,
        generatedAt: new Date().toISOString(),
        metadata: {
          agentVersion: this.version,
          sourcesChecked: Object.keys(this.knowledgeBase).length,
          resultsReturned: topResults.length
        }
      };

      await auditLog({
        action: 'handbook_query_completed',
        agentId: this.agentId,
        claimId: query.claimId,
        userId,
        metadata: {
          resultsFound: topResults.length,
          confidence
        }
      });

      return response;

    } catch (error) {
      await auditLog({
        action: 'handbook_query_error',
        agentId: this.agentId,
        claimId: query.claimId,
        userId,
        metadata: { error: (error as Error).message }
      });
      throw error;
    }
  }

  /**
   * Search knowledge base
   */
  private searchKnowledgeBase(query: HandbookQuery): HandbookResult[] {
    const results: HandbookResult[] = [];

    // Extract key terms from context
    const keyTerms = this.extractKeyTerms(query.context, query.keywords);

    // Search across all entries
    Object.entries(this.knowledgeBase).forEach(([key, entries]) => {
      entries.forEach(entry => {
        // Calculate relevance score
        const score = this.calculateRelevanceScore(entry, keyTerms, query);
        
        if (score > 0.5) {
          results.push({
            ...entry,
            relevanceScore: score
          });
        }
      });
    });

    return results;
  }

  /**
   * Extract key terms from query context
   */
  private extractKeyTerms(context: string, keywords?: string[]): string[] {
    const terms = new Set<string>();

    // Add provided keywords
    if (keywords) {
      keywords.forEach(kw => terms.add(kw.toLowerCase()));
    }

    // Extract from context (simple implementation - would use NLP in production)
    const words = context.toLowerCase().split(/\s+/);
    const importantWords = words.filter(w => 
      w.length > 4 && 
      !['about', 'would', 'should', 'could', 'there', 'their', 'these'].includes(w)
    );

    importantWords.forEach(w => terms.add(w));

    return Array.from(terms);
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(entry: HandbookResult, keyTerms: string[], query: HandbookQuery): number {
    let score = 0;

    // Check if entry matches query type
    if (query.queryType === 'policy_language' && entry.sourceType === 'carrier_manual') score += 0.3;
    if (query.queryType === 'statute' && entry.sourceType === 'state_statute') score += 0.3;
    if (query.queryType === 'procedure' && entry.sourceType === 'carrier_manual') score += 0.3;
    if (query.queryType === 'training' && entry.sourceType === 'training_guide') score += 0.3;

    // Check for keyword matches in excerpt
    const excerptLower = (entry.excerpt + ' ' + entry.title).toLowerCase();
    keyTerms.forEach(term => {
      if (excerptLower.includes(term)) score += 0.1;
    });

    // Topic match
    if (query.topic && (entry.title.toLowerCase().includes(query.topic.toLowerCase()) || 
                         entry.section.toLowerCase().includes(query.topic.toLowerCase()))) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  /**
   * Get state-specific information
   */
  private getStateSpecificInfo(state: string, topic?: string): HandbookResult[] {
    const results: HandbookResult[] = [];
    const stateReg = STATE_REGULATIONS[state] || STATE_REGULATIONS.DEFAULT;

    // Total loss threshold
    if (topic?.includes('total') || topic?.includes('loss')) {
      results.push({
        source: `${state} Department of Insurance`,
        sourceType: 'state_statute',
        title: `${state} Total Loss Threshold`,
        excerpt: `In ${state}, vehicles are considered total losses when damage exceeds ${stateReg.totalLossThreshold}% of actual cash value.`,
        citation: `${state} Insurance Code ${stateReg.totalLossStatute || 'Section TBD'}`,
        relevanceScore: 0.85,
        section: 'Total Loss Standards',
        effectiveDate: stateReg.effectiveDate,
        url: stateReg.doiWebsite
      });
    }

    // Payment deadlines
    if (topic?.includes('payment') || topic?.includes('deadline')) {
      results.push({
        source: `${state} Prompt Payment Law`,
        sourceType: 'regulation',
        title: `${state} Payment Deadline Requirements`,
        excerpt: `${state} requires insurers to issue payment within ${stateReg.paymentDeadlineDays} business days of receiving all required documentation. Interest accrues on late payments at ${stateReg.interestRate || 'statutory'}% annually.`,
        citation: `${state} Regulations ${stateReg.paymentStatute || 'Section TBD'}`,
        relevanceScore: 0.88,
        section: 'Payment Compliance',
        url: stateReg.doiWebsite
      });
    }

    // Unfair claims practices
    if (topic?.includes('unfair') || topic?.includes('practice')) {
      results.push({
        source: `${state} Unfair Claims Practices Act`,
        sourceType: 'state_statute',
        title: `${state} Prohibited Claims Practices`,
        excerpt: `${state} prohibits: ${stateReg.unfairClaimsPractices?.join(', ') || 'delay tactics, lowball offers, failure to investigate'}. Violations may result in fines and market conduct examinations.`,
        citation: `${state} Insurance Code - Unfair Practices`,
        relevanceScore: 0.90,
        section: 'Regulatory Compliance',
        url: stateReg.doiWebsite
      });
    }

    return results;
  }

  /**
   * Generate summary of results
   */
  private generateSummary(query: HandbookQuery, results: HandbookResult[]): string {
    if (results.length === 0) {
      return `No handbook entries found matching "${query.context}". Consider rephrasing your query or contacting your supervisor for guidance.`;
    }

    const topResult = results[0];
    let summary = `Found ${results.length} relevant handbook entries. `;
    
    summary += `Most relevant: "${topResult.title}" from ${topResult.source}. `;
    summary += `Key guidance: ${topResult.excerpt.substring(0, 150)}... `;
    
    if (query.state) {
      const stateSpecific = results.filter(r => r.source.includes(query.state!));
      if (stateSpecific.length > 0) {
        summary += `${stateSpecific.length} state-specific ${query.state} requirement(s) included.`;
      }
    }

    return summary;
  }

  /**
   * Calculate confidence in results
   */
  private calculateConfidence(results: HandbookResult[]): number {
    if (results.length === 0) return 0;
    
    // Average of top 3 relevance scores
    const topScores = results.slice(0, 3).map(r => r.relevanceScore);
    const avgScore = topScores.reduce((sum, score) => sum + score, 0) / topScores.length;
    
    return Math.round(avgScore * 100);
  }

  /**
   * Get specific policy language
   */
  async getPolicyLanguage(policySection: string, claimId: string, userId: string): Promise<HandbookResult | null> {
    try {
      // Simulated policy document retrieval
      const policyDocs: Record<string, HandbookResult> = {
        'collision': {
          source: 'Personal Auto Policy Form',
          sourceType: 'carrier_manual',
          title: 'Collision Coverage',
          excerpt: 'We will pay for direct and accidental loss to your covered auto, minus any applicable deductible...',
          fullText: 'Full policy language would be retrieved from policy management system...',
          citation: 'Policy Form PA-2024 - Part D',
          relevanceScore: 1.0,
          section: 'Part D - Coverage for Damage to Your Auto'
        },
        'liability': {
          source: 'Personal Auto Policy Form',
          sourceType: 'carrier_manual',
          title: 'Liability Coverage',
          excerpt: 'We will pay damages for bodily injury or property damage for which any covered person becomes legally responsible...',
          fullText: 'Full policy language...',
          citation: 'Policy Form PA-2024 - Part A',
          relevanceScore: 1.0,
          section: 'Part A - Liability Coverage'
        }
      };

      await auditLog({
        action: 'policy_language_retrieved',
        agentId: this.agentId,
        claimId,
        userId,
        metadata: { section: policySection }
      });

      return policyDocs[policySection.toLowerCase()] || null;

    } catch (error) {
      await auditLog({
        action: 'policy_retrieval_error',
        agentId: this.agentId,
        claimId,
        userId,
        metadata: { error: (error as Error).message }
      });
      return null;
    }
  }

  /**
   * Get procedural guidance
   */
  async getProceduralGuidance(procedure: string, claimId: string, userId: string): Promise<HandbookResult[]> {
    const query: HandbookQuery = {
      claimId,
      queryType: 'procedure',
      context: procedure,
      topic: procedure
    };

    const response = await this.queryHandbook(query, userId);
    return response.results;
  }

  /**
   * Get training material
   */
  async getTrainingMaterial(topic: string, claimId: string, userId: string): Promise<HandbookResult[]> {
    const query: HandbookQuery = {
      claimId,
      queryType: 'training',
      context: topic,
      topic
    };

    const response = await this.queryHandbook(query, userId);
    return response.results;
  }
}

// Singleton instance
export const handbookHelper = new HandbookHelper();
