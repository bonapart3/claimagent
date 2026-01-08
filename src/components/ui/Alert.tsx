// src/components/ui/Alert.tsx
// Alert Component

import { ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
    variant?: AlertVariant;
    title?: string;
    children: ReactNode;
    onClose?: () => void;
    className?: string;
}

const variantStyles: Record<
    AlertVariant,
    { container: string; icon: string; title: string }
> = {
    info: {
        container: 'bg-blue-50 border-blue-200 text-blue-800',
        icon: 'ℹ️',
        title: 'text-blue-900',
    },
    success: {
        container: 'bg-green-50 border-green-200 text-green-800',
        icon: '✅',
        title: 'text-green-900',
    },
    warning: {
        container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        icon: '⚠️',
        title: 'text-yellow-900',
    },
    error: {
        container: 'bg-red-50 border-red-200 text-red-800',
        icon: '❌',
        title: 'text-red-900',
    },
};

export function Alert({
    variant = 'info',
    title,
    children,
    onClose,
    className = '',
}: AlertProps) {
    const styles = variantStyles[variant];

    return (
        <div
            className={`relative rounded-lg border p-4 ${styles.container} ${className}`}
            role="alert"
        >
            <div className="flex gap-3">
                <span className="text-lg flex-shrink-0">{styles.icon}</span>
                <div className="flex-1">
                    {title && (
                        <h3 className={`font-medium mb-1 ${styles.title}`}>{title}</h3>
                    )}
                    <div className="text-sm">{children}</div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
                        aria-label="Dismiss"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}

// Inline alert for form fields
interface InlineAlertProps {
    variant?: 'error' | 'warning';
    children: ReactNode;
}

export function InlineAlert({ variant = 'error', children }: InlineAlertProps) {
    const color = variant === 'error' ? 'text-red-600' : 'text-yellow-600';
    const icon = variant === 'error' ? '⚠️' : '⚡';

    return (
        <p className={`flex items-center gap-1 text-sm mt-1 ${color}`}>
            <span className="text-xs">{icon}</span>
            {children}
        </p>
    );
}

