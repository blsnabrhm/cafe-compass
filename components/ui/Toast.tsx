'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastRole = 'secondary' | 'primary' | 'error' | 'outline' | 'tertiary';

interface ToastItem {
    id: string;
    message: string;
    role: ToastRole;
}

interface ToastContextType {
    toast: (message: string, role?: ToastRole) => void;
}

const ToastContext = createContext<ToastContextType>({
    toast: () => { },
});

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const toast = useCallback((message: string, role: ToastRole = 'secondary') => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setToasts((prev) => [...prev, { id, message, role }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map((t) => {
                    let icon = 'check_circle';
                    let iconColor = 'text-secondary';
                    if (t.role === 'error') {
                        icon = 'error';
                        iconColor = 'text-error';
                    } else if (t.role === 'primary') {
                        icon = 'bolt';
                        iconColor = 'text-primary';
                    } else if (t.role === 'tertiary') {
                        icon = 'auto_awesome';
                        iconColor = 'text-tertiary';
                    } else if (t.role === 'outline') {
                        icon = 'info';
                        iconColor = 'text-outline';
                    }

                    return (
                        <div
                            key={t.id}
                            className="pointer-events-auto px-4 py-3 rounded-xl bg-surface-container-high/95 backdrop-blur-xl text-on-surface shadow-2xl flex items-center gap-3 border border-white/10 animate-fade-in transition-all transform duration-300"
                        >
                            <span className={`material-symbols-outlined ${iconColor} text-[20px]`}>
                                {icon}
                            </span>
                            <span className="font-headline text-[13px] font-medium leading-snug">
                                {t.message}
                            </span>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
