// src/app/api/documents/[id]/route.ts
// Single document API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { auditLog } from '@/lib/utils/auditLogger';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Retrieve document metadata or content
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const download = searchParams.get('download') === 'true';

        const document = await prisma.document.findUnique({
            where: { id },
            include: {
                claim: {
                    select: {
                        id: true,
                        claimNumber: true,
                        status: true,
                    },
                },
            },
        });

        if (!document) {
            return NextResponse.json(
                { success: false, error: 'Document not found' },
                { status: 404 }
            );
        }

        if (download) {
            // In production, fetch from cloud storage
            // For now, return placeholder
            return NextResponse.json({
                success: false,
                error: 'Document download not implemented in demo',
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: document.id,
                claimId: document.claimId,
                claimNumber: document.claim?.claimNumber,
                type: document.type,
                fileName: document.fileName,
                filePath: document.filePath,
                mimeType: document.mimeType,
                fileSize: document.fileSize,
                uploadedBy: document.uploadedBy,
                createdAt: document.createdAt,
                extractedData: document.extractedData,
                aiAnalysis: document.aiAnalysis,
                damageAreas: document.damageAreas,
            },
        });
    } catch (error) {
        console.error('Get document error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get document' },
            { status: 500 }
        );
    }
}

// PATCH - Update document metadata
export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const document = await prisma.document.findUnique({
            where: { id },
        });

        if (!document) {
            return NextResponse.json(
                { success: false, error: 'Document not found' },
                { status: 404 }
            );
        }

        // Only allow updating certain fields present in the schema
        const allowedUpdates = ['type'] as const;
        const updates: Record<string, unknown> = {};

        for (const key of allowedUpdates) {
            if (body[key] !== undefined) {
                updates[key] = body[key];
            }
        }

        const updatedDocument = await prisma.document.update({
            where: { id },
            data: updates,
        });

        await auditLog({
            claimId: document.claimId,
            action: 'DOCUMENT_UPDATED',
            entityType: 'Document',
            entityId: id,
            changes: updates,
        });

        return NextResponse.json({
            success: true,
            data: updatedDocument,
        });
    } catch (error) {
        console.error('Update document error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update document' },
            { status: 500 }
        );
    }
}

// DELETE - Remove document
export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;

        const document = await prisma.document.findUnique({
            where: { id },
        });

        if (!document) {
            return NextResponse.json(
                { success: false, error: 'Document not found' },
                { status: 404 }
            );
        }

        // Hard delete (no soft-delete fields in schema)
        await prisma.document.delete({
            where: { id },
        });

        await auditLog({
            claimId: document.claimId,
            action: 'DOCUMENT_DELETED',
            entityType: 'Document',
            entityId: id,
            changes: { fileName: document.fileName },
        });

        return NextResponse.json({
            success: true,
            message: 'Document deleted successfully',
        });
    } catch (error) {
        console.error('Delete document error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete document' },
            { status: 500 }
        );
    }
}
