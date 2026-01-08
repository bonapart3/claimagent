// src/components/layout/Header.tsx
// Header Component

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useNotifications } from '@/lib/hooks/useNotifications';

export function Header() {
    const { user, logout } = useAuth();
    const { notifications, unreadCount, markAllAsRead } = useNotifications();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            {/* Search */}
            <div className="flex-1 max-w-lg">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search claims, policies, documents..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        🔍
                    </span>
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
                {/* Help */}
                <button className="text-gray-500 hover:text-gray-700 p-2">
                    ❓
                </button>

                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative text-gray-500 hover:text-gray-700 p-2"
                    >
                        🔔
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={() => markAllAsRead()}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
                                        No notifications
                                    </div>
                                ) : (
                                    notifications.slice(0, 5).map(notification => (
                                        <Link
                                            key={notification.id}
                                            href={notification.link || '#'}
                                            className={`block p-4 hover:bg-gray-50 border-b border-gray-100 ${!notification.read ? 'bg-blue-50' : ''
                                                }`}
                                            onClick={() => setShowNotifications(false)}
                                        >
                                            <div className="flex gap-3">
                                                <span className="text-lg">
                                                    {notification.type === 'success' && '✅'}
                                                    {notification.type === 'warning' && '⚠️'}
                                                    {notification.type === 'error' && '❌'}
                                                    {notification.type === 'info' && 'ℹ️'}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {notification.title}
                                                    </p>
                                                    {notification.message && (
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {notification.message}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {formatTimeAgo(notification.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                            {notifications.length > 5 && (
                                <Link
                                    href="/notifications"
                                    className="block p-3 text-center text-sm text-blue-600 hover:bg-gray-50 border-t border-gray-200"
                                    onClick={() => setShowNotifications(false)}
                                >
                                    View all notifications
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* User Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                            {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </div>
                        <span className="text-sm font-medium text-gray-700 hidden sm:block">
                            {user?.name || 'User'}
                        </span>
                        <span className="text-gray-400">▼</span>
                    </button>

                    {/* User Dropdown */}
                    {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                            <div className="p-4 border-b border-gray-200">
                                <p className="font-medium text-gray-900">{user?.name}</p>
                                <p className="text-sm text-gray-500">{user?.email}</p>
                                <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {user?.role}
                                </span>
                            </div>
                            <div className="p-2">
                                <Link
                                    href="/profile"
                                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    👤 Profile
                                </Link>
                                <Link
                                    href="/settings"
                                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    ⚙️ Settings
                                </Link>
                                <Link
                                    href="/help"
                                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    ❓ Help & Support
                                </Link>
                            </div>
                            <div className="p-2 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        logout();
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    🚪 Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

