// src/lib/utils/statusColors.ts
// Centralized status color mappings for consistent UI across the app

import { ClaimStatus } from '@prisma/client';

export type StatusColorClasses = {
    bg: string;
    text: string;
    border: string;
    full: string; // Combined classes for convenience
};

/**
 * Status color mappings for claim statuses
 * Single source of truth - use this everywhere instead of duplicating
 */
export const STATUS_COLORS: Record<string, StatusColorClasses> = {
    // Intake/Initial states
    INTAKE: {
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-200',
        full: 'bg-slate-100 text-slate-800 border-slate-200',
    },
    SUBMITTED: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
        full: 'bg-blue-100 text-blue-800 border-blue-200',
    },

    // In Progress states
    UNDER_REVIEW: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        full: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    INVESTIGATION: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-200',
        full: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    INVESTIGATING: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-200',
        full: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    EVALUATION: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        border: 'border-indigo-200',
        full: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
    PENDING_APPROVAL: {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-200',
        full: 'bg-amber-100 text-amber-800 border-amber-200',
    },

    // Success states
    APPROVED: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        full: 'bg-green-100 text-green-800 border-green-200',
    },
    PAYMENT_PROCESSING: {
        bg: 'bg-teal-100',
        text: 'text-teal-800',
        border: 'border-teal-200',
        full: 'bg-teal-100 text-teal-800 border-teal-200',
    },
    PAID: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        full: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    CLOSED: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        full: 'bg-gray-100 text-gray-800 border-gray-200',
    },

    // Negative states
    DENIED: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        full: 'bg-red-100 text-red-800 border-red-200',
    },
    REJECTED: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        full: 'bg-red-100 text-red-800 border-red-200',
    },
    SUSPENDED: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200',
        full: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    WITHDRAWN: {
        bg: 'bg-gray-100',
        text: 'text-gray-500',
        border: 'border-gray-200',
        full: 'bg-gray-100 text-gray-500 border-gray-200',
    },

    // Fraud/Escalation states
    FLAGGED_FRAUD: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        full: 'bg-red-100 text-red-800 border-red-200',
    },
    ESCALATED_SIU: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        full: 'bg-red-100 text-red-800 border-red-200',
    },
    SIU_REVIEW: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200',
        full: 'bg-orange-100 text-orange-800 border-orange-200',
    },
};

// Default fallback colors
const DEFAULT_COLORS: StatusColorClasses = {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    full: 'bg-gray-100 text-gray-800 border-gray-200',
};

/**
 * Get color classes for a status
 * @param status - The claim status string
 * @returns StatusColorClasses object with bg, text, border, and full classes
 */
export function getStatusColors(status: string): StatusColorClasses {
    return STATUS_COLORS[status] || DEFAULT_COLORS;
}

/**
 * Get the full combined color classes for a status badge
 * @param status - The claim status string
 * @returns Combined Tailwind classes string
 */
export function getStatusBadgeClasses(status: string): string {
    return getStatusColors(status).full;
}

/**
 * Severity color mappings
 */
export const SEVERITY_COLORS: Record<string, StatusColorClasses> = {
    LOW: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        full: 'bg-green-100 text-green-800 border-green-200',
    },
    MEDIUM: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        full: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    HIGH: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200',
        full: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    CRITICAL: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        full: 'bg-red-100 text-red-800 border-red-200',
    },
};

export function getSeverityColors(severity: string): StatusColorClasses {
    return SEVERITY_COLORS[severity] || DEFAULT_COLORS;
}

export function getSeverityBadgeClasses(severity: string): string {
    return getSeverityColors(severity).full;
}

/**
 * Fraud risk level colors
 */
export const RISK_COLORS: Record<string, StatusColorClasses> = {
    LOW: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        full: 'bg-green-100 text-green-800 border-green-200',
    },
    MEDIUM: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        full: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    HIGH: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200',
        full: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    CRITICAL: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        full: 'bg-red-100 text-red-800 border-red-200',
    },
};

export function getRiskColors(risk: string): StatusColorClasses {
    return RISK_COLORS[risk] || DEFAULT_COLORS;
}

export function getRiskBadgeClasses(risk: string): string {
    return getRiskColors(risk).full;
}
