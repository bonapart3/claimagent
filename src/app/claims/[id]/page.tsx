// src/app/claims/[id]/page.tsx
// Claim Details Page

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getStatusBadgeClasses } from '@/lib/utils/statusColors';

interface ClaimDetails {
    id: string;
    claimNumber: string;
    status: string;
    claimType: string;
    lossDate: string;
    lossLocation: string;
    lossDescription: string;
    createdAt: string;
    updatedAt: string;
    estimatedAmount?: number;
    approvedAmount?: number;
    vehicle: {
        vin: string;
        year: number;
        make: string;
        model: string;
    };
    policy: {
        policyNumber: string;
        holder: {
            firstName: string;
            lastName: string;
        };
    };
    damages: Array<{
        id: string;
        component: string;
        severity: string;
        estimatedCost: number;
    }>;
    documents: Array<{
        id: string;
        type: string;
        fileName: string;
        uploadedAt: string;
    }>;
    timeline: Array<{
        id: string;
        action: string;
        description: string;
        timestamp: string;
        agent?: string;
    }>;
}

export default function ClaimDetailsPage() {
    const params = useParams();
    const claimId = params.id as string;
    const [claim, setClaim] = useState<ClaimDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'timeline'>('overview');
    const [automationResult, setAutomationResult] = useState<any>(null);
    const [isRunningAutomation, setIsRunningAutomation] = useState(false);

    useEffect(() => {
        fetchClaimDetails();
    }, [claimId]);

    const fetchClaimDetails = async () => {
        try {
            const response = await fetch(`/api/claims/${claimId}`);
            const data = await response.json();
            if (data.success) {
                setClaim(data.data);
            }
        } catch (error) {
            console.error('Error fetching claim details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const runAutomation = async () => {
        setIsRunningAutomation(true);
        try {
            const response = await fetch(`/api/claims/${claimId}/automate`, {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                setAutomationResult(data.automation);
                // Refresh claim data
                await fetchClaimDetails();
            } else {
                alert('Automation failed: ' + data.error);
            }
        } catch (error) {
            console.error('Error running automation:', error);
            alert('Failed to run automation');
        } finally {
            setIsRunningAutomation(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Loading claim details...</div>
            </div>
        );
    }

    if (!claim) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Claim Not Found</h2>
                    <p className="text-gray-500 mb-4">The claim you&apos;re looking for doesn&apos;t exist.</p>
                    <Link href="/claims/dashboard">
                        <Button>Back to Dashboard</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/claims/dashboard"
                        className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block"
                    >
                        ← Back to Dashboard
                    </Link>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Claim {claim.claimNumber}
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Filed on {new Date(claim.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button
                                onClick={runAutomation}
                                disabled={isRunningAutomation}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {isRunningAutomation ? 'Running...' : '🤖 Auto-Assist'}
                            </Button>
                            <span
                                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusBadgeClasses(
                                    claim.status
                                )}`}
                            >
                                {claim.status.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Automation Results */}
                {automationResult && (
                    <Card className="mb-6 border-purple-200 bg-purple-50">
                        <CardHeader>
                            <CardTitle className="text-purple-800">🤖 Adjuster Automation Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {automationResult.summary.totalRecommendations}
                                        </div>
                                        <div className="text-sm text-purple-600">Total Recommendations</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-red-600">
                                            {automationResult.summary.highPriority}
                                        </div>
                                        <div className="text-sm text-red-600">High Priority</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-purple-600">
                                            Automated at {new Date(automationResult.summary.automatedAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {automationResult.recommendations.length > 0 && (
                                    <div>
                                        <h4 className="font-medium text-purple-800 mb-2">Recommendations:</h4>
                                        <div className="space-y-2">
                                            {automationResult.recommendations.map((rec: any, index: number) => (
                                                <div key={index} className={`p-3 rounded border ${rec.priority === 'HIGH' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                                                    }`}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className={`text-xs font-medium px-2 py-1 rounded ${rec.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {rec.priority}
                                                            </span>
                                                            <p className="text-sm mt-1">{rec.message}</p>
                                                        </div>
                                                        <span className="text-xs text-gray-500">{rec.action}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {automationResult.insights.length > 0 && (
                                    <div>
                                        <h4 className="font-medium text-purple-800 mb-2">Insights:</h4>
                                        <ul className="text-sm text-purple-700 space-y-1">
                                            {automationResult.insights.map((insight: string, index: number) => (
                                                <li key={index}>• {insight}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="flex space-x-8">
                        {(['overview', 'documents', 'timeline'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Claim Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Claim Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="space-y-4">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Claim Type</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{claim.claimType}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Date of Loss</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {new Date(claim.lossDate).toLocaleDateString()}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Location</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{claim.lossLocation}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{claim.lossDescription}</dd>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>

                        {/* Vehicle Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Vehicle Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="space-y-4">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">VIN</dt>
                                        <dd className="mt-1 text-sm text-gray-900 font-mono">
                                            {claim.vehicle.vin}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Vehicle</dt>
                                        <dd className="mt-1 text-sm text-gray-900">
                                            {claim.vehicle.year} {claim.vehicle.make} {claim.vehicle.model}
                                        </dd>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>

                        {/* Financial Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Financial Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="space-y-4">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Estimated Amount</dt>
                                        <dd className="mt-1 text-2xl font-semibold text-gray-900">
                                            {claim.estimatedAmount
                                                ? `$${claim.estimatedAmount.toLocaleString()}`
                                                : 'Pending'}
                                        </dd>
                                    </div>
                                    {claim.approvedAmount && (
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Approved Amount</dt>
                                            <dd className="mt-1 text-2xl font-semibold text-green-600">
                                                ${claim.approvedAmount.toLocaleString()}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </CardContent>
                        </Card>

                        {/* Damages */}
                        {claim.damages && claim.damages.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Damage Assessment</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {claim.damages.map(damage => (
                                            <div
                                                key={damage.id}
                                                className="flex justify-between items-center py-2 border-b last:border-0"
                                            >
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {damage.component}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Severity: {damage.severity}
                                                    </div>
                                                </div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    ${damage.estimatedCost.toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Documents</CardTitle>
                                <Button variant="outline" size="sm">
                                    + Upload Document
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {claim.documents && claim.documents.length > 0 ? (
                                <div className="space-y-4">
                                    {claim.documents.map(doc => (
                                        <div
                                            key={doc.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <svg
                                                        className="w-5 h-5 text-blue-600"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                        />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {doc.fileName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {doc.type} • Uploaded{' '}
                                                        {new Date(doc.uploadedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm">
                                                Download
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No documents uploaded yet</p>
                                    <Button variant="outline" className="mt-4">
                                        Upload Your First Document
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Claim Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {claim.timeline && claim.timeline.length > 0 ? (
                                <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                                    <div className="space-y-6">
                                        {claim.timeline.map((event, index) => (
                                            <div key={event.id} className="relative flex items-start ml-8">
                                                <div
                                                    className={`absolute -left-6 w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-400'
                                                        }`}
                                                />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {event.action}
                                                    </div>
                                                    <div className="text-sm text-gray-600">{event.description}</div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        {new Date(event.timestamp).toLocaleString()}
                                                        {event.agent && ` • ${event.agent}`}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No timeline events yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
