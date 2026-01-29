// src/app/admin/page.tsx
// Admin console - system overview and configuration
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { prisma } from '@/lib/utils/database';

async function getSystemStats() {
  try {
    const [
      totalClaims,
      totalPolicies,
      totalCarriers,
      totalVehicles,
      claimsByStatus,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.claim.count(),
      prisma.policy.count(),
      prisma.carrier.count(),
      prisma.vehicle.count(),
      prisma.claim.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          actorType: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalClaims,
      totalPolicies,
      totalCarriers,
      totalVehicles,
      claimsByStatus: claimsByStatus.map(s => ({
        status: s.status,
        count: s._count.id,
      })),
      recentAuditLogs,
    };
  } catch (error) {
    console.error('Admin stats error:', error);
    return {
      totalClaims: 0,
      totalPolicies: 0,
      totalCarriers: 0,
      totalVehicles: 0,
      claimsByStatus: [],
      recentAuditLogs: [],
    };
  }
}

export default async function AdminPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const stats = await getSystemStats();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
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
                <Link href="/dashboard" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/claims/dashboard" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Claims
                </Link>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Admin
                </span>
              </nav>
            </div>
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: 'w-8 h-8' } }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Admin Console
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            System overview and configuration
          </p>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Claims', value: stats.totalClaims, color: 'blue' },
            { label: 'Policies', value: stats.totalPolicies, color: 'emerald' },
            { label: 'Carriers', value: stats.totalCarriers, color: 'amber' },
            { label: 'Vehicles', value: stats.totalVehicles, color: 'violet' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
            >
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Claims by Status */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Claims by Status
            </h2>
            {stats.claimsByStatus.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No claims yet</p>
            ) : (
              <div className="space-y-3">
                {stats.claimsByStatus.map((s) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {s.status.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min((s.count / Math.max(stats.totalClaims, 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">
                        {s.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Audit Log */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Recent Audit Log
            </h2>
            {stats.recentAuditLogs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No audit logs yet</p>
            ) : (
              <div className="space-y-3">
                {stats.recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {log.action}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        {log.entityType}
                      </span>
                    </div>
                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            System Information
          </h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Platform</dt>
              <dd className="font-medium text-gray-900 dark:text-white">ClaimAgent v3.0.0</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Framework</dt>
              <dd className="font-medium text-gray-900 dark:text-white">Next.js 14 + Prisma</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Auth Provider</dt>
              <dd className="font-medium text-gray-900 dark:text-white">Clerk</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Logged in as</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {user?.emailAddresses?.[0]?.emailAddress || 'Unknown'}
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
