'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, LogOut, User, Settings } from 'lucide-react';

interface NavItem {
    name: string;
    href: string;
    icon: string;
    badge?: number;
}

const mainNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/claims/dashboard', icon: '📊' },
    { name: 'All Claims', href: '/claims', icon: '📋' },
    { name: 'New Claim', href: '/claims/new', icon: '➕' },
];

const workflowItems: NavItem[] = [
    { name: 'Inbox', href: '/inbox', icon: '📥', badge: 12 },
    { name: 'Pending Review', href: '/review', icon: '⏳', badge: 5 },
    { name: 'Approvals', href: '/approvals', icon: '✅' },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const isActive = (href: string) => {
        if (href === '/claims/dashboard') return pathname === href;
        return pathname.startsWith(href);
    };

    const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => (
        <Link
            href={item.href}
            onClick={onClick}
            className={`
                flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }
            `}
        >
            <div className="flex items-center gap-3">
                <span>{item.icon}</span>
                <span>{item.name}</span>
            </div>
            {item.badge && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                </span>
            )}
        </Link>
    );

    const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
        <>
            {/* Logo */}
            <div className="h-16 flex items-center px-4 border-b border-gray-200">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl">🚗</span>
                    <span className="font-bold text-lg text-gray-900">ClaimAgent™</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Main
                    </h3>
                    <div className="space-y-1">
                        {mainNavItems.map(item => (
                            <NavLink key={item.href} item={item} onClick={onLinkClick} />
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Workflow
                    </h3>
                    <div className="space-y-1">
                        {workflowItems.map(item => (
                            <NavLink key={item.href} item={item} onClick={onLinkClick} />
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Account
                    </h3>
                    <div className="space-y-1">
                        <NavLink item={{ name: 'Profile', href: '/profile', icon: '👤' }} onClick={onLinkClick} />
                        <NavLink item={{ name: 'Settings', href: '/settings', icon: '⚙️' }} onClick={onLinkClick} />
                    </div>
                </div>
            </nav>
        </>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="absolute top-4 right-4">
                    <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <div className="h-full flex flex-col">
                    <SidebarContent onLinkClick={() => setSidebarOpen(false)} />
                </div>
            </aside>

            {/* Desktop sidebar */}
            <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-white border-r border-gray-200">
                <SidebarContent />
            </aside>

            {/* Main content area */}
            <div className="lg:pl-64">
                {/* Top header */}
                <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
                    <div className="flex items-center justify-between h-16 px-4">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                        >
                            <Menu className="h-6 w-6 text-gray-600" />
                        </button>

                        {/* Spacer for desktop */}
                        <div className="hidden lg:block" />

                        {/* User menu */}
                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                    U
                                </div>
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                            </button>

                            {userMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setUserMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                        <Link
                                            href="/profile"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            <User className="h-4 w-4" />
                                            Profile
                                        </Link>
                                        <Link
                                            href="/settings"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            <Settings className="h-4 w-4" />
                                            Settings
                                        </Link>
                                        <hr className="my-1" />
                                        <Link
                                            href="/api/auth/logout"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Sign out
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
