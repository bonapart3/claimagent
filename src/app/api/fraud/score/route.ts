// src/app/api/fraud/score/route.ts
// Fraud scoring endpoint integrating pattern detection and ML models

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { validateSession } from '@/lib/utils/validation';
import { PatternDetector } from '@/lib/agents/fraud/patternDetector';
import { MedicalFraudScreener } from '@/lib/agents/fraud/medicalFraudScreener';
import { FRAUD_THRESHOLD } from '@/lib/constants/thresholds';
import { FraudScoreRequestSchema } from '@/lib/schemas/api';
import {
    validateRequestBody,
    validationErrorResponse,
} from '@/lib/utils/requestValidator';

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

        // Validate request body against schema
        const validation = await validateRequestBody(request, FraudScoreRequestSchema, {
            blockOnThreat: true,
            logThreats: true,
        });

        if (!validation.success || !validation.data) {
            return validationErrorResponse(validation);
        }

        const { claimId } = validation.data;

        // Fetch claim data
        const claim = await prisma.claim.findUnique({
            where: { id: claimId },
            include: {
                policy: true,
                vehicle: true,
                documents: true,
                participants: true,
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

        // Run medical fraud screening if there are injury-related participants
        let medicalScore = 0;
        const hasInjury = claim.participants?.some(p => p.injuryDescription);
        if (hasInjury) {
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

        // Save fraud analysis
        const fraudAnalysis = await prisma.fraudAnalysis.create({
            data: {
                claimId,
                overallScore: compositeScore,
                riskLevel,
                flaggedReasons: indicators,
                siuRecommendation: compositeScore >= FRAUD_THRESHOLD.ESCALATION ? 'Recommend SIU review' : null,
            }
        });

        // Auto-escalate if score exceeds threshold
        if (compositeScore >= FRAUD_THRESHOLD.ESCALATION) {
            await prisma.claim.update({
                where: { id: claimId },
                data: {
                    status: 'SUSPENDED',
                    routingDecision: 'SIU_ESCALATION',
                    fraudScore: compositeScore,
                    updatedAt: new Date()
                }
            });
        } else {
            // Update fraud score on claim
            await prisma.claim.update({
                where: { id: claimId },
                data: {
                    fraudScore: compositeScore,
                    updatedAt: new Date()
                }
            });
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
                analysis: fraudAnalysis
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
