// src/components/ui/Toaster.tsx
// Toast notification system

'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

interface ToasterContextType {
    toasts: Toast[];
    addToast: (message: string, type: Toast['type']) => void;
    removeToast: (id: string) => void;
}

const ToasterContext = createContext<ToasterContextType | undefined>(undefined);

export function useToaster() {
    const context = useContext(ToasterContext);
    if (!context) {
        throw new Error('useToaster must be used within a Toaster');
    }
    return context;
}

export function Toaster() {
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

    const addToast = useCallback((message: string, type: Toast['type']) => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 5 seconds with tracked timer
        const timer = setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
            timersRef.current.delete(id);
        }, 5000);
        timersRef.current.set(id, timer);
    }, []);

    const removeToast = useCallback((id: string) => {
        // Clear timer when manually removed
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
            rounded-lg px-4 py-3 shadow-lg flex items-center justify-between min-w-[300px]
            ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
            ${toast.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
            ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
          `}
                >
                    <span>{toast.message}</span>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="ml-4 text-white hover:opacity-75"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}

