// src/app/api/claims/[id]/documents/route.ts
// Document upload and retrieval with OCR/IDP processing

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { auditLog } from '@/lib/utils/auditLogger';
import { validateSession } from '@/lib/utils/validation';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Validate session
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const claimId = params.id;

        // Verify claim exists
        const claim = await prisma.claim.findUnique({
            where: { id: claimId }
        });

        if (!claim) {
            return NextResponse.json(
                { error: 'Claim not found' },
                { status: 404 }
            );
        }

        // Parse form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const documentType = formData.get('type') as string;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'File type not allowed' },
                { status: 400 }
            );
        }

        // Generate storage URL (in production, upload to R2/S3)
        const fileExtension = file.name.split('.').pop();
        const uniqueFilename = `${randomUUID()}.${fileExtension}`;
        const storageUrl = `/uploads/${claimId}/${uniqueFilename}`;

        // Import DocumentType from Prisma
        const { DocumentType } = await import('@prisma/client');

        // Map document type to enum
        const validTypes = Object.values(DocumentType);
        const docType = validTypes.includes(documentType as typeof DocumentType[keyof typeof DocumentType])
            ? documentType
            : 'OTHER';

        // Create document record
        const document = await prisma.document.create({
            data: {
                claimId,
                fileName: file.name,
                storageUrl,
                fileSize: file.size,
                mimeType: file.type,
                type: docType as typeof DocumentType[keyof typeof DocumentType],
                uploadedAt: new Date(),
            }
        });

        // Audit log
        await auditLog({
            claimId,
            userId: session.userId,
            action: 'DOCUMENT_UPLOADED',
            entityType: 'Document',
            entityId: document.id,
            details: {
                documentId: document.id,
                fileName: file.name,
                type: docType
            },
        });

        return NextResponse.json({
            success: true,
            data: document,
            message: 'Document uploaded successfully'
        });

    } catch (error) {
        console.error('Error uploading document:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Validate session
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const claimId = params.id;

        // Get all documents for claim
        const documents = await prisma.document.findMany({
            where: { claimId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            data: documents
        });

    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
