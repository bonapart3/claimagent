'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { User, Mail, Shield, Calendar, Save } from 'lucide-react';

interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    licenseNumber?: string;
    state?: string;
    createdAt: string;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await fetch('/api/auth/profile');
            const data = await response.json();

            if (data.success) {
                setProfile(data.user);
                setFormData(prev => ({
                    ...prev,
                    firstName: data.user.firstName,
                    lastName: data.user.lastName,
                    email: data.user.email,
                }));
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        setSuccess('');

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setError('New passwords do not match');
            setIsSaving(false);
            return;
        }

        try {
            const updateData: Record<string, string> = {};
            if (formData.firstName !== profile?.firstName) updateData.firstName = formData.firstName;
            if (formData.lastName !== profile?.lastName) updateData.lastName = formData.lastName;
            if (formData.email !== profile?.email) updateData.email = formData.email;
            if (formData.newPassword) {
                updateData.currentPassword = formData.currentPassword;
                updateData.newPassword = formData.newPassword;
            }

            const response = await fetch('/api/auth/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Profile updated successfully');
                setFormData(prev => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                }));
                fetchProfile();
            } else {
                setError(data.error || 'Failed to update profile');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Update profile error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
                <p className="text-gray-600">Manage your account information</p>
            </div>

            {/* Profile Overview Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                        {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {profile?.firstName} {profile?.lastName}
                        </h2>
                        <p className="text-gray-500">{profile?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Shield className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-600 font-medium">{profile?.role}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <Alert variant="error" onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert variant="success" onClose={() => setSuccess('')}>
                            {success}
                        </Alert>
                    )}

                    {/* Personal Information */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="First Name"
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                            />
                            <Input
                                label="Last Name"
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <Mail className="w-5 h-5" />
                            Email Address
                        </h3>
                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    {/* Password Change */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Change Password
                        </h3>
                        <div className="space-y-4">
                            <Input
                                label="Current Password"
                                type="password"
                                value={formData.currentPassword}
                                onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                                placeholder="Enter current password"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="New Password"
                                    type="password"
                                    value={formData.newPassword}
                                    onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                    placeholder="Enter new password"
                                />
                                <Input
                                    label="Confirm New Password"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            Account created: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
