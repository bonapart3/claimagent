// src/app/api/policy/validate/route.ts
// Policy validation endpoint with coverage verification

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { validateSession } from '@/lib/utils/validation';

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

        const { policyNumber, lossDate, coverageType } = await request.json();

        if (!policyNumber || !lossDate) {
            return NextResponse.json(
                { error: 'Policy number and loss date required' },
                { status: 400 }
            );
        }

        // Find policy
        const policy = await prisma.policy.findUnique({
            where: { policyNumber }
        });

        if (!policy) {
            return NextResponse.json({
                success: false,
                valid: false,
                reason: 'Policy not found'
            });
        }

        // Validate effective dates
        const loss = new Date(lossDate);
        const effective = new Date(policy.effectiveDate);
        const expiration = new Date(policy.expirationDate);

        if (loss < effective || loss > expiration) {
            return NextResponse.json({
                success: false,
                valid: false,
                reason: 'Loss date outside policy period',
                details: {
                    lossDate: loss.toISOString(),
                    effectiveDate: effective.toISOString(),
                    expirationDate: expiration.toISOString()
                }
            });
        }

        // Check policy status
        if (policy.status !== 'ACTIVE') {
            return NextResponse.json({
                success: false,
                valid: false,
                reason: `Policy status is ${policy.status}`,
                details: { status: policy.status }
            });
        }

        // Validate coverage type
        const coverages = policy.coverages as Record<string, any>;
        let coverageValid = true;
        let coverageDetails = {};

        if (coverageType) {
            const coverage = coverages[coverageType];
            if (!coverage || !coverage.included) {
                coverageValid = false;
                coverageDetails = {
                    requestedCoverage: coverageType,
                    available: false
                };
            } else {
                coverageDetails = {
                    requestedCoverage: coverageType,
                    available: true,
                    limit: coverage.limit,
                    deductible: coverage.deductible
                };
            }
        }

        return NextResponse.json({
            success: true,
            valid: coverageValid,
            policy: {
                policyNumber: policy.policyNumber,
                policyholderName: policy.policyholderName,
                effectiveDate: policy.effectiveDate,
                expirationDate: policy.expirationDate,
                status: policy.status,
                coverages: policy.coverages
            },
            coverageDetails
        });

    } catch (error) {
        console.error('Error validating policy:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

