// src/app/dashboard/page.tsx
// Authenticated user dashboard with live stats
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { prisma } from '@/lib/utils/database';

async function getDashboardStats() {
  try {
    const [
      totalClaims,
      activeClaims,
      approvedClaims,
      closedClaims,
      flaggedClaims,
    ] = await Promise.all([
      prisma.claim.count(),
      prisma.claim.count({
        where: { status: { in: ['INTAKE', 'INVESTIGATION', 'EVALUATION', 'PENDING_APPROVAL'] } },
      }),
      prisma.claim.count({ where: { status: 'APPROVED' } }),
      prisma.claim.count({ where: { status: 'CLOSED' } }),
      prisma.claim.count({ where: { fraudScore: { gte: 50 } } }),
    ]);

    // Avg cycle time from resolved claims
    const resolved = await prisma.claim.findMany({
      where: { status: { in: ['APPROVED', 'CLOSED', 'DENIED'] } },
      select: { createdAt: true, updatedAt: true },
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });

    let avgCycleTime = 'N/A';
    if (resolved.length > 0) {
      const totalHours = resolved.reduce((sum, c) => {
        return sum + (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60);
      }, 0);
      const avgHours = totalHours / resolved.length;
      avgCycleTime = avgHours < 24
        ? `${Math.round(avgHours)}h`
        : `${(avgHours / 24).toFixed(1)}d`;
    }

    // Auto-approval rate
    const autoApproved = await prisma.claim.count({
      where: { status: { in: ['APPROVED', 'CLOSED'] }, autoApprovalEligible: true },
    });
    const approvalRate = totalClaims > 0
      ? `${((autoApproved / totalClaims) * 100).toFixed(0)}%`
      : '0%';

    return { activeClaims, avgCycleTime, approvalRate, flaggedClaims, totalClaims };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return { activeClaims: 0, avgCycleTime: 'N/A', approvalRate: '0%', flaggedClaims: 0, totalClaims: 0 };
  }
}

async function getRecentClaims() {
  try {
    return await prisma.claim.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        claimNumber: true,
        claimType: true,
        status: true,
        severity: true,
        createdAt: true,
        estimatedLoss: true,
      },
    });
  } catch {
    return [];
  }
}

const STATUS_COLORS: Record<string, string> = {
  INTAKE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INVESTIGATION: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  EVALUATION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  DENIED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PAYMENT_PROCESSING: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  SUSPENDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const firstName = user?.firstName || 'there';

  const [stats, recentClaims] = await Promise.all([
    getDashboardStats(),
    getRecentClaims(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Minimal header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-6">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">C</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">ClaimAgent</span>
              </Link>
              <nav className="hidden md:flex items-center space-x-4">
                <Link href="/claims/dashboard" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Claims
                </Link>
                <Link href="/claims/new" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  New Claim
                </Link>
                <Link href="/admin" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Admin
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                  },
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Here&apos;s an overview of your activity
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/claims/new"
            className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Submit New Claim
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Start a new FNOL submission
            </p>
          </Link>

          <Link
            href="/claims/dashboard"
            className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              View All Claims
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review and manage claims
            </p>
          </Link>

          <Link
            href="/admin"
            className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              Admin Console
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              System settings and controls
            </p>
          </Link>
        </div>

        {/* Stats overview - live data */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
            Performance Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.activeClaims}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Active Claims</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.avgCycleTime}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Avg. Cycle Time</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.approvalRate}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Auto-Approval Rate</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.flaggedClaims}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fraud Flags</p>
            </div>
          </div>
          {stats.totalClaims === 0 && (
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              Submit your first claim to see real-time metrics
            </p>
          )}
        </div>

        {/* Recent activity */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          {recentClaims.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No recent activity</p>
              <p className="text-sm mt-1">Start by submitting your first claim</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentClaims.map((claim) => (
                <Link
                  key={claim.id}
                  href={`/claims/${claim.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-gray-900 dark:text-white">
                      {claim.claimNumber}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {claim.claimType?.replace('AUTO_', '').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {claim.estimatedLoss && (
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        ${Number(claim.estimatedLoss).toLocaleString()}
                      </span>
                    )}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[claim.status] || STATUS_COLORS.INTAKE}`}>
                      {claim.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
