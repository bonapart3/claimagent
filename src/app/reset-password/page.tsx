'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { CheckCircle, ArrowLeft } from 'lucide-react';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const passwordRequirements = [
        { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
        { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
        { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
        { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
    ];

    if (!token) {
        return (
            <div className="bg-white py-8 px-6 shadow-xl rounded-2xl text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Invalid Reset Link</h2>
                <p className="text-gray-600 mb-6">
                    This password reset link is invalid or has expired.
                </p>
                <Link
                    href="/forgot-password"
                    className="text-blue-600 hover:text-blue-500 font-medium"
                >
                    Request a new reset link
                </Link>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => router.push('/login'), 3000);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Reset password error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-white py-8 px-6 shadow-xl rounded-2xl text-center">
                <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
                <p className="text-gray-600 mb-4">
                    Your password has been reset successfully. Redirecting to login...
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <Alert variant="error" onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                <Input
                    label="New Password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                />

                <div className="space-y-1">
                    {passwordRequirements.map((req, i) => (
                        <div key={i} className="flex items-center text-xs">
                            <span className={req.test(password) ? 'text-green-600' : 'text-gray-400'}>
                                {req.test(password) ? '✓' : '○'}
                            </span>
                            <span className={`ml-2 ${req.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                                {req.label}
                            </span>
                        </div>
                    ))}
                </div>

                <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                />

                <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
            </form>

            <div className="mt-6 text-center">
                <Link
                    href="/login"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to login
                </Link>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-blue-600 text-white text-3xl shadow-lg">
                        🚗
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Set New Password
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Create a strong password for your account
                    </p>
                </div>

                <Suspense fallback={<div className="bg-white py-8 px-6 shadow-xl rounded-2xl text-center">Loading...</div>}>
                    <ResetPasswordForm />
                </Suspense>

                <p className="text-center text-sm text-gray-500">
                    © 2024 ClaimAgent™. All rights reserved.
                </p>
            </div>
        </div>
    );
}
