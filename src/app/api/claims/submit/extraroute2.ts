import { NextResponse } from 'next/server';

// This experimental route is disabled; use /api/claims/submit/route.ts instead.
export async function POST() {
    return NextResponse.json(
        { error: 'This endpoint is disabled. Use /api/claims/submit instead.' },
        { status: 410 }
    );
}

export async function GET() {
    return NextResponse.json(
        {
            endpoint: '/api/claims/submit/extraroute2',
            status: 'disabled',
            use: '/api/claims/submit',
        },
        { status: 410 }
    );
}
