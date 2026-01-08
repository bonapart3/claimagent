// src/app/api/fraud/score/route.ts
// Fraud scoring endpoint integrating pattern detection and ML models

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { validateSession } from '@/lib/utils/validation';
import { PatternDetector } from '@/lib/agents/fraud/patternDetector';
import { MedicalFraudScreener } from '@/lib/agents/fraud/medicalFraudScreener';
import { FRAUD_THRESHOLD } from '@/lib/constants/thresholds';

export async function POST(request: NextRequest) {
    try {
        // Validate session
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { claimId } = await request.json();

        if (!claimId) {
            return NextResponse.json(
                { error: 'Claim ID required' },
                { status: 400 }
            );
        }

        // Fetch claim data
        const claim = await prisma.claim.findUnique({
            where: { id: claimId },
            include: {
                policy: true,
                vehicle: true,
                documents: true
            }
        });

        if (!claim) {
            return NextResponse.json(
                { error: 'Claim not found' },
                { status: 404 }
            );
        }

        // Initialize fraud detection agents
        const patternDetector = new PatternDetector();
        const medicalScreener = new MedicalFraudScreener();

        // Run pattern detection
        const patternScore = await patternDetector.analyze(claim);

        // Run medical fraud screening (if applicable)
        let medicalScore = 0;
        if (claim.injuryDescription) {
            medicalScore = await medicalScreener.analyze(claim);
        }

        // Calculate composite fraud score
        const compositeScore = Math.max(patternScore.score, medicalScore);

        // Determine risk level
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        if (compositeScore >= FRAUD_THRESHOLD.CRITICAL) {
            riskLevel = 'CRITICAL';
        } else if (compositeScore >= FRAUD_THRESHOLD.HIGH) {
            riskLevel = 'HIGH';
        } else if (compositeScore >= FRAUD_THRESHOLD.MEDIUM) {
            riskLevel = 'MEDIUM';
        } else {
            riskLevel = 'LOW';
        }

        // Compile indicators
        const indicators = [
            ...patternScore.indicators,
            ...(medicalScore > 0 ? ['Medical billing anomaly detected'] : [])
        ];

        // Save fraud assessment
        const fraudAssessment = await prisma.fraudAssessment.create({
            data: {
                claimId,
                fraudScore: compositeScore,
                riskLevel,
                indicators: indicators.join('; '),
                patternScore: patternScore.score,
                medicalScore,
                assessedAt: new Date(),
                assessedBy: 'FRAUD_AGENT_GROUP_C'
            }
        });

        // Auto-escalate if score exceeds threshold
        if (compositeScore >= FRAUD_THRESHOLD.ESCALATION) {
            await prisma.claim.update({
                where: { id: claimId },
                data: {
                    status: 'FLAGGED_FRAUD',
                    updatedAt: new Date()
                }
            });

            // TODO: Create SIU briefing
            // await siuBriefingWriter.create(claim, fraudAssessment);
        }

        return NextResponse.json({
            success: true,
            data: {
                fraudScore: compositeScore,
                riskLevel,
                indicators,
                details: {
                    patternScore: patternScore.score,
                    medicalScore,
                    escalated: compositeScore >= FRAUD_THRESHOLD.ESCALATION
                },
                assessment: fraudAssessment
            }
        });

    } catch (error) {
        console.error('Error calculating fraud score:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

