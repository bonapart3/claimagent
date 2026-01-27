// src/components/ui/Badge.tsx
// Badge Component

import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
};

const sizeStyles = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1',
};

export function Badge({
    children,
    variant = 'default',
    size = 'md',
    className = '',
}: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center font-medium rounded-full border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
        >
            {children}
        </span>
    );
}

// Status-specific badge component
type ClaimStatus =
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'INVESTIGATING'
    | 'APPROVED'
    | 'REJECTED'
    | 'PAID'
    | 'FLAGGED_FRAUD'
    | 'CLOSED';

const statusVariants: Record<ClaimStatus, BadgeVariant> = {
    SUBMITTED: 'info',
    UNDER_REVIEW: 'warning',
    INVESTIGATING: 'warning',
    APPROVED: 'success',
    REJECTED: 'error',
    PAID: 'success',
    FLAGGED_FRAUD: 'error',
    CLOSED: 'default',
};

interface StatusBadgeProps {
    status: ClaimStatus;
    size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const variant = statusVariants[status] || 'default';
    const displayStatus = status.replace(/_/g, ' ');

    return (
        <Badge variant={variant} size={size}>
            {displayStatus}
        </Badge>
    );
}

