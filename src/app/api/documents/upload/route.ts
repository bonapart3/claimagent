// src/app/api/documents/upload/route.ts
// Document upload API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/utils/auditLogger';
import { validateFormData, performSecurityChecks } from '@/lib/utils/requestValidator';
import { DocumentUploadMetadataSchema } from '@/lib/schemas/api';
import { validateSession } from '@/lib/utils/validation';
import { DocumentType } from '@prisma/client';

export async function POST(request: NextRequest) {
    try {
        // Validate session - SECURITY FIX
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Validate form data with security checks
        const formValidation = await validateFormData(request, {
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedMimeTypes: [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
            maxFiles: 10,
        });

        if (!formValidation.success || !formValidation.formData) {
            await auditLog({
                action: 'DOCUMENT_UPLOAD_REJECTED',
                details: {
                    reason: formValidation.error,
                    ip: request.headers.get('x-forwarded-for') || 'unknown',
                },
            });
            return NextResponse.json(
                { success: false, error: formValidation.error },
                { status: 400 }
            );
        }

        const formData = formValidation.formData;
        const file = formData.get('file') as File;
        const claimId = formData.get('claimId') as string;
        const documentType = formData.get('type') as string;
        const description = formData.get('description') as string | null;

        // Validate metadata fields
        const metadataValidation = DocumentUploadMetadataSchema.safeParse({
            claimId,
            type: documentType,
            description,
        });

        if (!metadataValidation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid metadata',
                    details: metadataValidation.error.errors,
                },
                { status: 400 }
            );
        }

        // Security check on description text
        if (description) {
            const securityCheck = performSecurityChecks({ description });
            if (securityCheck.blocked) {
                await auditLog({
                    action: 'DOCUMENT_UPLOAD_BLOCKED',
                    details: {
                        reason: 'Malicious content detected in description',
                        threats: securityCheck.threats,
                    },
                });
                return NextResponse.json(
                    { success: false, error: 'Request blocked due to security policy' },
                    { status: 403 }
                );
            }
        }

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Check claim exists
        const claim = await prisma.claim.findUnique({
            where: { id: claimId },
        });

        if (!claim) {
            return NextResponse.json(
                { success: false, error: 'Claim not found' },
                { status: 404 }
            );
        }

        // In production, upload to cloud storage (S3, Azure Blob, etc.)
        // For now, we'll simulate the upload and store metadata
        const fileBuffer = await file.arrayBuffer();
        const fileHash = await hashBuffer(fileBuffer);

        // Generate storage key
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storageUrl = `claims/${claimId}/${timestamp}-${sanitizedName}`;

        // Map document type to enum
        const validTypes = Object.values(DocumentType);
        const docType: DocumentType = validTypes.includes(documentType as DocumentType)
            ? (documentType as DocumentType)
            : 'OTHER';

        // Create document record
        const document = await prisma.document.create({
            data: {
                claimId,
                type: docType,
                fileName: file.name,
                mimeType: file.type,
                fileSize: file.size,
                storageUrl,
                uploadedAt: new Date(),
            },
        });

        // Log audit
        await auditLog({
            claimId,
            action: 'DOCUMENT_UPLOADED',
            entityType: 'Document',
            entityId: document.id,
            details: {
                documentId: document.id,
                type: docType,
                fileSize: file.size,
                mimeType: file.type,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: document.id,
                fileName: document.fileName,
                type: document.type,
                fileSize: document.fileSize,
                url: `/api/documents/${document.id}`,
            },
        });
    } catch (error) {
        console.error('Document upload error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to upload document' },
            { status: 500 }
        );
    }
}

// Simple hash function for file integrity
async function hashBuffer(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// GET - List documents for a claim
export async function GET(request: NextRequest) {
    try {
        // Validate session - SECURITY FIX
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const claimId = searchParams.get('claimId');

        if (!claimId) {
            return NextResponse.json(
                { success: false, error: 'Claim ID is required' },
                { status: 400 }
            );
        }

        const documents = await prisma.document.findMany({
            where: { claimId },
            orderBy: { uploadedAt: 'desc' },
            select: {
                id: true,
                type: true,
                fileName: true,
                mimeType: true,
                fileSize: true,
                uploadedAt: true,
                aiAnalysis: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: documents.map(doc => ({
                ...doc,
                url: `/api/documents/${doc.id}`,
            })),
        });
    } catch (error) {
        console.error('Document list error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to list documents' },
            { status: 500 }
        );
    }
}
