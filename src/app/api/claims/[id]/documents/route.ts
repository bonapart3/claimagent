// src/app/api/claims/[id]/documents/route.ts
// Document upload and retrieval with OCR/IDP processing

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { auditLog } from '@/lib/utils/auditLogger';
import { validateSession } from '@/lib/utils/validation';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
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
        const description = formData.get('description') as string;

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

        // Generate unique filename
        const fileExtension = file.name.split('.').pop();
        const uniqueFilename = `${randomUUID()}.${fileExtension}`;
        const uploadPath = join(UPLOAD_DIR, claimId);

        // Create directory if not exists
        await mkdir(uploadPath, { recursive: true });

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = join(uploadPath, uniqueFilename);
        await writeFile(filePath, buffer);

        // Create document record
        const document = await prisma.document.create({
            data: {
                claimId,
                fileName: file.name,
                filePath,
                fileSize: file.size,
                mimeType: file.type,
                type: (documentType as any) || 'OTHER',
                uploadedBy: session.userId,
            }
        });

        // Audit log
        await auditLog({
            claimId,
            userId: session.userId,
            action: 'DOCUMENT_UPLOADED',
            details: {
                documentId: document.id,
                fileName: file.name,
                type: documentType
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        });

        // TODO: Queue for OCR/IDP processing
        // await queueOCRProcessing(document.id);

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
