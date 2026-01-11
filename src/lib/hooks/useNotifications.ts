// src/lib/hooks/useNotifications.ts
// Notifications hook

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    timestamp: Date;
    read: boolean;
    link?: string;
    claimId?: string;
}

interface UseNotificationsResult {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

export function useNotifications(): UseNotificationsResult {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Load notifications from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('claimagent-notifications');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setNotifications(parsed.map((n: Notification) => ({
                    ...n,
                    timestamp: new Date(n.timestamp),
                })));
            } catch (e) {
                console.error('Failed to parse notifications:', e);
            }
        }
    }, []);

    // Save notifications to localStorage when they change
    useEffect(() => {
        localStorage.setItem('claimagent-notifications', JSON.stringify(notifications));
    }, [notifications]);

    const addNotification = useCallback(
        (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
            const newNotification: Notification = {
                ...notification,
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                read: false,
            };

            setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
        },
        []
    );

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
    };
}

// Toast notifications (transient)
export interface Toast {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    duration?: number;
}

interface UseToastResult {
    toasts: Toast[];
    showToast: (toast: Omit<Toast, 'id'>) => void;
    dismissToast: (id: string) => void;
}

export function useToast(): UseToastResult {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Cleanup all timers on unmount
    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach(timer => clearTimeout(timer));
            timers.clear();
        };
    }, []);

    const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        // Auto dismiss with tracked timer
        const duration = toast.duration || 5000;
        const timer = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
            timersRef.current.delete(id);
        }, duration);
        timersRef.current.set(id, timer);
    }, []);

    const dismissToast = useCallback((id: string) => {
        // Clear timer when manually dismissed
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return {
        toasts,
        showToast,
        dismissToast,
    };
}

// Helper function to create common notification types
export const notificationHelpers = {
    claimSubmitted: (claimNumber: string) => ({
        type: 'success' as const,
        title: 'Claim Submitted',
        message: `Claim ${claimNumber} has been submitted successfully.`,
        link: `/claims/${claimNumber}`,
        claimId: claimNumber,
    }),

    claimApproved: (claimNumber: string, amount: number) => ({
        type: 'success' as const,
        title: 'Claim Approved',
        message: `Claim ${claimNumber} approved for $${amount.toLocaleString()}.`,
        link: `/claims/${claimNumber}`,
        claimId: claimNumber,
    }),

    claimRejected: (claimNumber: string, reason: string) => ({
        type: 'error' as const,
        title: 'Claim Rejected',
        message: `Claim ${claimNumber} was rejected: ${reason}`,
        link: `/claims/${claimNumber}`,
        claimId: claimNumber,
    }),

    fraudAlert: (claimNumber: string, score: number) => ({
        type: 'warning' as const,
        title: 'Fraud Alert',
        message: `Claim ${claimNumber} flagged for fraud review (${(score * 100).toFixed(0)}% risk).`,
        link: `/claims/${claimNumber}`,
        claimId: claimNumber,
    }),

    documentUploaded: (claimNumber: string, fileName: string) => ({
        type: 'info' as const,
        title: 'Document Uploaded',
        message: `"${fileName}" uploaded to claim ${claimNumber}.`,
        link: `/claims/${claimNumber}`,
        claimId: claimNumber,
    }),

    escalationRequired: (claimNumber: string, reason: string) => ({
        type: 'warning' as const,
        title: 'Escalation Required',
        message: `Claim ${claimNumber} requires attention: ${reason}`,
        link: `/claims/${claimNumber}`,
        claimId: claimNumber,
    }),
};

