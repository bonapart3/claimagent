// src/components/layout/Sidebar.tsx
// Sidebar Navigation Component

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
    { name: 'Documents', href: '/documents', icon: '📁' },
    { name: 'Reports', href: '/reports', icon: '📈' },
];

const workflowItems: NavItem[] = [
    { name: 'Inbox', href: '/inbox', icon: '📥', badge: 12 },
    { name: 'Pending Review', href: '/review', icon: '⏳', badge: 5 },
    { name: 'Escalations', href: '/escalations', icon: '⚠️', badge: 3 },
    { name: 'Approvals', href: '/approvals', icon: '✅' },
];

const adminItems: NavItem[] = [
    { name: 'Users', href: '/admin/users', icon: '👥' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
    { name: 'Audit Log', href: '/admin/audit', icon: '📜' },
];

export function Sidebar() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/claims/dashboard') {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    const NavLink = ({ item }: { item: NavItem }) => (
        <Link
            href={item.href}
            className={`
        flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
            {/* Logo */}
            <div className="h-16 flex items-center px-4 border-b border-gray-200">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-2xl">🚗</span>
                    <span className="font-bold text-lg text-gray-900">ClaimAgent™</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Main Navigation */}
                <div>
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Main
                    </h3>
                    <div className="space-y-1">
                        {mainNavItems.map(item => (
                            <NavLink key={item.href} item={item} />
                        ))}
                    </div>
                </div>

                {/* Workflow */}
                <div>
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Workflow
                    </h3>
                    <div className="space-y-1">
                        {workflowItems.map(item => (
                            <NavLink key={item.href} item={item} />
                        ))}
                    </div>
                </div>

                {/* Admin */}
                <div>
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Administration
                    </h3>
                    <div className="space-y-1">
                        {adminItems.map(item => (
                            <NavLink key={item.href} item={item} />
                        ))}
                    </div>
                </div>
            </nav>

            {/* User Info */}
            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                        JD
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">John Doe</p>
                        <p className="text-xs text-gray-500 truncate">Claims Adjuster</p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                        <span className="sr-only">Settings</span>
                        ⚙️
                    </button>
                </div>
            </div>
        </aside>
    );
}

