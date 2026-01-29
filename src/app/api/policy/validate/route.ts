// src/app/api/policy/validate/route.ts
// Policy validation endpoint with coverage verification

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { validateSession } from '@/lib/utils/validation';
import { PolicyValidateRequestSchema } from '@/lib/schemas/api';
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
        const validation = await validateRequestBody(request, PolicyValidateRequestSchema, {
            blockOnThreat: true,
            logThreats: true,
        });

        if (!validation.success || !validation.data) {
            return validationErrorResponse(validation);
        }

        const { policyNumber, lossDate, coverageType } = validation.data;

        // Find policy with coverages
        const policy = await prisma.policy.findUnique({
            where: { policyNumber },
            include: {
                coverages: true,
            }
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
        let coverageValid = true;
        let coverageDetails = {};

        if (coverageType && policy.coverages) {
            const coverage = policy.coverages.find(c => c.type === coverageType);
            if (!coverage) {
                coverageValid = false;
                coverageDetails = {
                    requestedCoverage: coverageType,
                    available: false
                };
            } else {
                coverageDetails = {
                    requestedCoverage: coverageType,
                    available: true,
                    limitPerPerson: coverage.limitPerPerson,
                    limitPerAccident: coverage.limitPerAccident,
                    limitProperty: coverage.limitProperty,
                    deductible: coverage.deductible
                };
            }
        }

        // Format coverages for response
        const coveragesFormatted = policy.coverages.map(c => ({
            type: c.type,
            limitPerPerson: c.limitPerPerson,
            limitPerAccident: c.limitPerAccident,
            limitProperty: c.limitProperty,
            deductible: c.deductible,
        }));

        return NextResponse.json({
            success: true,
            valid: coverageValid,
            policy: {
                policyNumber: policy.policyNumber,
                policyholderName: `${policy.holderFirstName} ${policy.holderLastName}`,
                effectiveDate: policy.effectiveDate,
                expirationDate: policy.expirationDate,
                status: policy.status,
                coverages: coveragesFormatted
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
