'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Settings, Bell, Moon, Globe, Shield, Save } from 'lucide-react';

interface SettingsState {
    notifications: {
        emailClaims: boolean;
        emailFraud: boolean;
        emailApprovals: boolean;
        browserNotifications: boolean;
    };
    appearance: {
        theme: 'light' | 'dark' | 'system';
        compactMode: boolean;
    };
    privacy: {
        showOnlineStatus: boolean;
        shareActivity: boolean;
    };
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsState>({
        notifications: {
            emailClaims: true,
            emailFraud: true,
            emailApprovals: true,
            browserNotifications: false,
        },
        appearance: {
            theme: 'light',
            compactMode: false,
        },
        privacy: {
            showOnlineStatus: true,
            shareActivity: true,
        },
    });
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        setSuccess('Settings saved successfully');
        setIsSaving(false);
    };

    const Toggle = ({
        checked,
        onChange
    }: {
        checked: boolean;
        onChange: (value: boolean) => void;
    }) => (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${checked ? 'bg-blue-600' : 'bg-gray-200'}
            `}
        >
            <span
                className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${checked ? 'translate-x-6' : 'translate-x-1'}
                `}
            />
        </button>
    );

    const SettingRow = ({
        label,
        description,
        checked,
        onChange
    }: {
        label: string;
        description: string;
        checked: boolean;
        onChange: (value: boolean) => void;
    }) => (
        <div className="flex items-center justify-between py-4">
            <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    Settings
                </h1>
                <p className="text-gray-600">Customize your ClaimAgent experience</p>
            </div>

            {success && (
                <Alert variant="success" onClose={() => setSuccess('')} className="mb-6">
                    {success}
                </Alert>
            )}

            {/* Notifications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                </h2>
                <div className="divide-y divide-gray-100">
                    <SettingRow
                        label="Claim Updates"
                        description="Receive email notifications for claim status changes"
                        checked={settings.notifications.emailClaims}
                        onChange={(value) => setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, emailClaims: value }
                        })}
                    />
                    <SettingRow
                        label="Fraud Alerts"
                        description="Get notified when fraud is detected on claims"
                        checked={settings.notifications.emailFraud}
                        onChange={(value) => setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, emailFraud: value }
                        })}
                    />
                    <SettingRow
                        label="Approval Requests"
                        description="Receive notifications for claims requiring your approval"
                        checked={settings.notifications.emailApprovals}
                        onChange={(value) => setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, emailApprovals: value }
                        })}
                    />
                    <SettingRow
                        label="Browser Notifications"
                        description="Show desktop notifications for important updates"
                        checked={settings.notifications.browserNotifications}
                        onChange={(value) => setSettings({
                            ...settings,
                            notifications: { ...settings.notifications, browserNotifications: value }
                        })}
                    />
                </div>
            </div>

            {/* Appearance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Moon className="w-5 h-5" />
                    Appearance
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-900 mb-2 block">Theme</label>
                        <div className="flex gap-3">
                            {(['light', 'dark', 'system'] as const).map((theme) => (
                                <button
                                    key={theme}
                                    onClick={() => setSettings({
                                        ...settings,
                                        appearance: { ...settings.appearance, theme }
                                    })}
                                    className={`
                                        px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors
                                        ${settings.appearance.theme === theme
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }
                                    `}
                                >
                                    {theme}
                                </button>
                            ))}
                        </div>
                    </div>
                    <SettingRow
                        label="Compact Mode"
                        description="Use smaller spacing and fonts for more information density"
                        checked={settings.appearance.compactMode}
                        onChange={(value) => setSettings({
                            ...settings,
                            appearance: { ...settings.appearance, compactMode: value }
                        })}
                    />
                </div>
            </div>

            {/* Privacy */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Privacy
                </h2>
                <div className="divide-y divide-gray-100">
                    <SettingRow
                        label="Online Status"
                        description="Show when you're active to other team members"
                        checked={settings.privacy.showOnlineStatus}
                        onChange={(value) => setSettings({
                            ...settings,
                            privacy: { ...settings.privacy, showOnlineStatus: value }
                        })}
                    />
                    <SettingRow
                        label="Activity Sharing"
                        description="Allow managers to see your activity metrics"
                        checked={settings.privacy.shareActivity}
                        onChange={(value) => setSettings({
                            ...settings,
                            privacy: { ...settings.privacy, shareActivity: value }
                        })}
                    />
                </div>
            </div>

            {/* Language (placeholder) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Language & Region
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-900 mb-2 block">Language</label>
                        <select className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="en">English (US)</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-900 mb-2 block">Timezone</label>
                        <select className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
}
