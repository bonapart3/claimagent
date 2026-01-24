// src/components/claims/ClaimCard.tsx
// Claim Summary Card Component

'use client';

import { memo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { getStatusBadgeClasses } from '@/lib/utils/statusColors';

interface ClaimCardProps {
    claim: {
        id: string;
        claimNumber: string;
        status: string;
        claimType: string;
        lossDate: string;
        createdAt: string;
        estimatedAmount?: number;
        approvedAmount?: number;
        vehicle?: {
            year: number;
            make: string;
            model: string;
        };
    };
}

export const ClaimCard = memo(function ClaimCard({ claim }: ClaimCardProps) {
    const getStatusIcon = (status: string) => {
        const icons: Record<string, string> = {
            SUBMITTED: '📝',
            UNDER_REVIEW: '🔍',
            INVESTIGATING: '🔎',
            APPROVED: '✅',
            REJECTED: '❌',
            PAID: '💵',
            FLAGGED_FRAUD: '🚨',
            CLOSED: '📁',
        };
        return icons[status] || '📋';
    };

    return (
        <Link href={`/claims/${claim.claimNumber}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-semibold text-gray-900">{claim.claimNumber}</h3>
                            <p className="text-sm text-gray-500">{claim.claimType}</p>
                        </div>
                        <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClasses(
                                claim.status
                            )}`}
                        >
                            <span>{getStatusIcon(claim.status)}</span>
                            {claim.status.replace('_', ' ')}
                        </span>
                    </div>

                    {claim.vehicle && (
                        <p className="text-sm text-gray-700 mb-2">
                            {claim.vehicle.year} {claim.vehicle.make} {claim.vehicle.model}
                        </p>
                    )}

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">
                            Loss: {new Date(claim.lossDate).toLocaleDateString()}
                        </span>
                        {(claim.approvedAmount || claim.estimatedAmount) && (
                            <span className="font-medium text-gray-900">
                                ${((claim.approvedAmount || claim.estimatedAmount) as number).toLocaleString()}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
});

