// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    ClockIcon,
    CurrencyDollarIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    BoltIcon,
    DocumentCheckIcon
} from '@heroicons/react/24/outline';

interface DashboardMetrics {
    totalClaims: number;
    activeClaims: number;
    avgCycleTimeHours: number;
    autoApprovalRate: number;
    costPerClaim: number;
    fraudDetectionRate: number;
}

export default function HomePage() {
    const router = useRouter();
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardMetrics();
    }, []);

    const fetchDashboardMetrics = async () => {
        try {
            const response = await fetch('/api/analytics/dashboard');
            if (response.ok) {
                const data = await response.json();
                setMetrics(data);
            }
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewClaim = () => {
        router.push('/claims/new');
    };

    const handleViewDashboard = () => {
        router.push('/claims/dashboard');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Hero Section */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    Welcome to ClaimAgent™
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                    Autonomous AI-powered auto insurance claims processing with 80%+ straight-through processing,
                    sub-2% error rates, and full 50-state regulatory compliance.
                </p>

                {/* CTA Buttons */}
                <div className="mt-8 flex justify-center space-x-4">
                    <Button onClick={handleNewClaim} size="lg" variant="default">
                        <BoltIcon className="h-5 w-5 mr-2" />
                        Submit New Claim
                    </Button>
                    <Button onClick={handleViewDashboard} size="lg" variant="secondary">
                        <ChartBarIcon className="h-5 w-5 mr-2" />
                        View Dashboard
                    </Button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Claims</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                                {metrics?.activeClaims.toLocaleString() || '0'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {metrics?.totalClaims.toLocaleString() || '0'} total processed
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <DocumentCheckIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Cycle Time</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                                {metrics?.avgCycleTimeHours.toFixed(1) || '0'}h
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                ↓ 70% vs industry avg
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <ClockIcon className="h-6 w-6 text-green-600 dark:text-green-300" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Cost Per Claim</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                                ${metrics?.costPerClaim.toFixed(0) || '0'}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                ↓ 84% reduction
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                            <CurrencyDollarIcon className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Auto-Approval Rate</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                                {(metrics?.autoApprovalRate * 100).toFixed(1) || '0'}%
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Straight-through processing
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                            <BoltIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fraud Detection</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                                {(metrics?.fraudDetectionRate * 100).toFixed(1) || '0'}%
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                40% loss reduction
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                            <ShieldCheckIcon className="h-6 w-6 text-red-600 dark:text-red-300" />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Compliance Rate</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                                99.9%
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                50-state certified
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                            <ShieldCheckIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Value Propositions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                    <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClockIcon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Lightning Fast
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        Reduce claim settlement from 5-7 days to 2-4 hours with AI-powered automation
                    </p>
                </div>

                <div className="text-center">
                    <div className="h-16 w-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CurrencyDollarIcon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Cost Effective
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        Cut processing costs from $900 to $140 per claim while maintaining quality
                    </p>
                </div>

                <div className="text-center">
                    <div className="h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheckIcon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Fully Compliant
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        Built-in 50-state regulatory compliance with automatic statute updates
                    </p>
                </div>
            </div>

            {/* Recent Activity / Quick Actions */}
            <Card>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button
                        onClick={() => router.push('/claims/new')}
                        variant="outline"
                        className="w-full"
                    >
                        Submit FNOL
                    </Button>
                    <Button
                        onClick={() => router.push('/claims/dashboard')}
                        variant="outline"
                        className="w-full"
                    >
                        View All Claims
                    </Button>
                    <Button
                        onClick={() => router.push('/admin')}
                        variant="outline"
                        className="w-full"
                    >
                        Admin Console
                    </Button>
                    <Button
                        onClick={() => router.push('/analytics')}
                        variant="outline"
                        className="w-full"
                    >
                        Analytics
                    </Button>
                </div>
            </Card>
        </div>
    );
}