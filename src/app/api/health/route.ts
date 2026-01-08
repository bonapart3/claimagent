// src/app/api/health/route.ts
// Health Check API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    timestamp: string;
    uptime: number;
    checks: HealthCheck[];
}

interface HealthCheck {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    latency?: number;
    message?: string;
}

const startTime = Date.now();

export async function GET(request: NextRequest) {
    const checks: HealthCheck[] = [];

    // Database check
    const dbCheck = await checkDatabase();
    checks.push(dbCheck);

    // Memory check
    const memCheck = checkMemory();
    checks.push(memCheck);

    // Determine overall status
    const hasFailure = checks.some(c => c.status === 'fail');
    const hasWarning = checks.some(c => c.status === 'warn');

    const status: HealthStatus = {
        status: hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - startTime,
        checks,
    };

    const httpStatus = hasFailure ? 503 : 200;

    return NextResponse.json(status, { status: httpStatus });
}

async function checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
        // Simple query to check database connectivity
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - startTime;

        return {
            name: 'database',
            status: latency > 1000 ? 'warn' : 'pass',
            latency,
            message: latency > 1000 ? 'High latency' : 'Connected',
        };
    } catch (error) {
        return {
            name: 'database',
            status: 'fail',
            latency: Date.now() - startTime,
            message: error instanceof Error ? error.message : 'Connection failed',
        };
    }
}

function checkMemory(): HealthCheck {
    // Get memory usage (Node.js specific)
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    const usagePercent = (used.heapUsed / used.heapTotal) * 100;

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    if (usagePercent > 90) {
        status = 'fail';
    } else if (usagePercent > 75) {
        status = 'warn';
    }

    return {
        name: 'memory',
        status,
        message: `${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
    };
}

