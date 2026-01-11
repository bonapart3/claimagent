// src/lib/schemas/api.ts
// Zod schemas for API request validation

import { z } from 'zod';

// =============================================================================
// Common Schema Helpers
// =============================================================================

/**
 * Custom sanitization transforms to prevent injection attacks
 */
const sanitizeString = (val: string) =>
    val.trim()
        .replace(/[<>]/g, '') // Remove angle brackets to prevent XSS
        .slice(0, 10000); // Limit string length

const sanitizeHtml = (val: string) =>
    val.trim()
        .replace(/[<>'"&]/g, (char) => {
            const entities: Record<string, string> = {
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;',
                '&': '&amp;',
            };
            return entities[char] || char;
        })
        .slice(0, 50000);

/**
 * Safe string schema with sanitization
 */
export const safeString = (maxLength = 1000) =>
    z.string()
        .max(maxLength, `String must be ${maxLength} characters or less`)
        .transform(sanitizeString);

/**
 * Safe text schema for longer content (descriptions, notes)
 */
export const safeText = (maxLength = 10000) =>
    z.string()
        .max(maxLength, `Text must be ${maxLength} characters or less`)
        .transform(sanitizeHtml);

/**
 * Email validation with sanitization
 */
export const safeEmail = z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .toLowerCase()
    .transform((val) => val.trim());

/**
 * UUID validation
 */
export const uuid = z.string()
    .uuid('Invalid UUID format')
    .or(z.string().regex(/^[a-zA-Z0-9-_]{8,36}$/, 'Invalid ID format'));

/**
 * ISO date string validation
 */
export const isoDateString = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, 'Invalid date format')
    .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
    }, 'Invalid date value');

/**
 * Phone number validation
 */
export const phoneNumber = z.string()
    .regex(/^[\d\s\-+()]{7,20}$/, 'Invalid phone number format')
    .transform((val) => val.replace(/[^\d+]/g, ''));

/**
 * VIN validation (17 characters, no I, O, Q)
 */
export const vin = z.string()
    .length(17, 'VIN must be exactly 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'Invalid VIN format (cannot contain I, O, or Q)')
    .toUpperCase();

/**
 * Policy number validation
 */
export const policyNumber = z.string()
    .min(6, 'Policy number too short')
    .max(20, 'Policy number too long')
    .regex(/^[A-Z0-9-]+$/i, 'Invalid policy number format')
    .toUpperCase();

/**
 * US state code validation
 */
export const stateCode = z.string()
    .length(2, 'State code must be 2 characters')
    .regex(/^[A-Z]{2}$/i, 'Invalid state code')
    .toUpperCase();

/**
 * Positive number validation
 */
export const positiveNumber = z.number()
    .positive('Must be a positive number')
    .finite('Must be a finite number');

/**
 * Non-negative number validation
 */
export const nonNegativeNumber = z.number()
    .nonnegative('Must be zero or positive')
    .finite('Must be a finite number');

/**
 * Pagination parameters
 */
export const paginationParams = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// Enum Schemas
// =============================================================================

export const ClaimStatusSchema = z.enum([
    'SUBMITTED',
    'UNDER_REVIEW',
    'INVESTIGATING',
    'NEEDS_INFO',
    'APPROVED',
    'REJECTED',
    'PAYMENT_PENDING',
    'PAID',
    'CLOSED',
    'FLAGGED_FRAUD',
    'PAYMENT_FAILED',
    'CANCELLED',
    'WITHDRAWN',
]);

export const ClaimTypeSchema = z.enum([
    'COLLISION',
    'COMPREHENSIVE',
    'LIABILITY',
    'UNINSURED_MOTORIST',
    'MEDICAL_PAYMENTS',
    'PERSONAL_INJURY',
]);

export const SeverityLevelSchema = z.enum([
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
]);

export const UserRoleSchema = z.enum([
    'ADMIN',
    'SUPERVISOR',
    'ADJUSTER',
    'SIU_SPECIALIST',
    'UNDERWRITER',
    'CLAIMS_REP',
]);

export const DocumentTypeSchema = z.enum([
    'POLICE_REPORT',
    'PHOTO',
    'ESTIMATE',
    'INVOICE',
    'MEDICAL_RECORD',
    'IDENTIFICATION',
    'INSURANCE_CARD',
    'WITNESS_STATEMENT',
    'OTHER',
]);

// =============================================================================
// Authentication Schemas
// =============================================================================

export const LoginRequestSchema = z.object({
    email: safeEmail,
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long'),
}).strict();

export const RegisterRequestSchema = z.object({
    email: safeEmail,
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    firstName: safeString(50),
    lastName: safeString(50),
    role: UserRoleSchema.optional(),
}).strict();

// =============================================================================
// Claims Schemas
// =============================================================================

export const InjuryDataSchema = z.object({
    injured: z.boolean(),
    description: safeText(2000).optional(),
    severity: z.enum(['MINOR', 'MODERATE', 'SEVERE', 'FATAL']).optional(),
    medicalTreatment: z.boolean().optional(),
    hospitalName: safeString(200).optional(),
    estimatedMedicalCosts: nonNegativeNumber.optional(),
}).strict();

export const ParticipantContactSchema = z.object({
    phone: phoneNumber.optional(),
    email: safeEmail.optional(),
    address: safeText(500).optional(),
}).strict();

export const ParticipantVehicleSchema = z.object({
    vin: vin.optional(),
    licensePlate: safeString(15).optional(),
    insurance: safeString(100).optional(),
}).strict();

export const ParticipantDataSchema = z.object({
    name: safeString(100),
    role: z.enum(['INSURED', 'THIRD_PARTY', 'WITNESS']),
    contactInfo: ParticipantContactSchema,
    vehicleInfo: ParticipantVehicleSchema.optional(),
}).strict();

export const ClaimSubmitRequestSchema = z.object({
    policyNumber: policyNumber,
    lossDate: isoDateString,
    lossTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format').optional(),
    lossLocation: safeText(500),
    lossDescription: safeText(5000),
    claimType: ClaimTypeSchema,
    vehicleVin: vin,
    damageDescription: safeText(3000).optional(),
    policeReportNumber: safeString(50).optional(),
    injuries: InjuryDataSchema.optional(),
    participants: z.array(ParticipantDataSchema).max(20).optional(),
}).strict();

export const ClaimUpdateRequestSchema = z.object({
    status: ClaimStatusSchema.optional(),
    assignedTo: uuid.optional(),
    severity: SeverityLevelSchema.optional(),
    estimatedAmount: nonNegativeNumber.optional(),
    approvedAmount: nonNegativeNumber.optional(),
    lossDescription: safeText(5000).optional(),
    damageDescription: safeText(3000).optional(),
    notes: safeText(5000).optional(),
}).strict();

export const ClaimListQuerySchema = z.object({
    status: ClaimStatusSchema.optional(),
    policyId: uuid.optional(),
    assignedTo: uuid.optional(),
    claimType: ClaimTypeSchema.optional(),
    fromDate: isoDateString.optional(),
    toDate: isoDateString.optional(),
    search: safeString(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['createdAt', 'updatedAt', 'lossDate', 'status', 'estimatedAmount']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

// =============================================================================
// Document Schemas
// =============================================================================

export const DocumentUploadMetadataSchema = z.object({
    claimId: uuid,
    type: DocumentTypeSchema.optional().default('OTHER'),
    description: safeText(500).optional(),
});

export const DocumentListQuerySchema = z.object({
    claimId: uuid,
    type: DocumentTypeSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

// =============================================================================
// Fraud Schemas
// =============================================================================

export const FraudScoreRequestSchema = z.object({
    claimId: uuid,
    forceRescore: z.boolean().optional().default(false),
}).strict();

// =============================================================================
// Policy Schemas
// =============================================================================

export const PolicyValidateRequestSchema = z.object({
    policyNumber: policyNumber,
    lossDate: isoDateString,
    coverageType: z.string().max(50).optional(),
}).strict();

// =============================================================================
// Webhook Schemas
// =============================================================================

export const WebhookPayloadSchema = z.object({
    event: safeString(100),
    timestamp: isoDateString,
    data: z.record(z.unknown()).optional(),
    signature: z.string().max(256).optional(),
}).strict();

// =============================================================================
// Status Update Schemas
// =============================================================================

export const ClaimStatusUpdateSchema = z.object({
    status: ClaimStatusSchema,
    reason: safeText(1000).optional(),
    notes: safeText(2000).optional(),
}).strict();

// =============================================================================
// Automate Schemas
// =============================================================================

export const ClaimAutomateRequestSchema = z.object({
    actions: z.array(z.enum([
        'FRAUD_CHECK',
        'POLICY_VALIDATE',
        'COVERAGE_ANALYZE',
        'VALUATION',
        'AUTO_APPROVE',
        'FULL_PIPELINE',
    ])).min(1).max(10),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
    forceReprocess: z.boolean().optional().default(false),
}).strict();

// =============================================================================
// Export Schema Types
// =============================================================================

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type ClaimSubmitRequest = z.infer<typeof ClaimSubmitRequestSchema>;
export type ClaimUpdateRequest = z.infer<typeof ClaimUpdateRequestSchema>;
export type ClaimListQuery = z.infer<typeof ClaimListQuerySchema>;
export type FraudScoreRequest = z.infer<typeof FraudScoreRequestSchema>;
export type PolicyValidateRequest = z.infer<typeof PolicyValidateRequestSchema>;
export type ClaimStatusUpdate = z.infer<typeof ClaimStatusUpdateSchema>;
export type ClaimAutomateRequest = z.infer<typeof ClaimAutomateRequestSchema>;
