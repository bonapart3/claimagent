// src/app/claims/dashboard/page.tsx
// Claims Dashboard Page

'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getStatusBadgeClasses } from '@/lib/utils/statusColors';
import { useClaims, useClaimStats } from '@/lib/hooks/useClaims';

export default function ClaimsDashboard() {
    const { claims, isLoading, setStatus } = useClaims({ limit: 50 });
    const { stats } = useClaimStats();

    const handleFilterChange = (status: string) => {
        setStatus(status === 'all' ? '' : status);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Claims Dashboard</h1>
                        <p className="text-gray-600 mt-1">Manage and track your insurance claims</p>
                    </div>
                    <Link href="/claims/new">
                        <Button>+ New Claim</Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                                <div className="text-sm text-gray-500">Total Claims</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-2xl font-bold text-yellow-600">{stats.underReview}</div>
                                <div className="text-sm text-gray-500">Pending Review</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                                <div className="text-sm text-gray-500">Approved</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-2xl font-bold text-blue-600">{stats.avgProcessingTime}d</div>
                                <div className="text-sm text-gray-500">Avg. Processing Time</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="flex space-x-2 mb-6">
                    {['all', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAID'].map(filterStatus => (
                        <button
                            key={filterStatus}
                            onClick={() => handleFilterChange(filterStatus)}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-white text-gray-700 hover:bg-gray-100 data-[active=true]:bg-blue-600 data-[active=true]:text-white"
                        >
                            {filterStatus === 'all' ? 'All Claims' : filterStatus.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* Claims Table */}
                <Card>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-8 text-center text-gray-500">Loading claims...</div>
                        ) : claims.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-gray-500 mb-4">No claims found</p>
                                <Link href="/claims/new">
                                    <Button>File Your First Claim</Button>
                                </Link>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Claim #
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Loss Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {claims.map(claim => (
                                        <tr key={claim.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link
                                                    href={`/claims/${claim.claimNumber}`}
                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    {claim.claimNumber}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {claim.claimType}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(claim.lossDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(
                                                        claim.status
                                                    )}`}
                                                >
                                                    {claim.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {claim.estimatedAmount
                                                    ? `$${claim.estimatedAmount.toLocaleString()}`
                                                    : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <Link
                                                    href={`/claims/${claim.claimNumber}`}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    View Details
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

