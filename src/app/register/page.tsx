'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { CheckCircle } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const passwordRequirements = [
        { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
        { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
        { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
        { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => router.push('/login'), 2000);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Registration error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
                <div className="max-w-md w-full text-center">
                    <div className="bg-white py-8 px-6 shadow-xl rounded-2xl">
                        <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 mb-4">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
                        <p className="text-gray-600 mb-4">Redirecting you to login...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-blue-600 text-white text-3xl shadow-lg">
                        🚗
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Create Account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Join ClaimAgent™ to start processing claims
                    </p>
                </div>

                <div className="bg-white py-8 px-6 shadow-xl rounded-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <Alert variant="error" onClose={() => setError('')}>
                                {error}
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="First Name"
                                type="text"
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                placeholder="John"
                                required
                            />
                            <Input
                                label="Last Name"
                                type="text"
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                placeholder="Doe"
                                required
                            />
                        </div>

                        <Input
                            label="Email Address"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="john@company.com"
                            required
                            autoComplete="email"
                        />

                        <Input
                            label="Password"
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                        />

                        <div className="space-y-1">
                            {passwordRequirements.map((req, i) => (
                                <div key={i} className="flex items-center text-xs">
                                    <span className={req.test(formData.password) ? 'text-green-600' : 'text-gray-400'}>
                                        {req.test(formData.password) ? '✓' : '○'}
                                    </span>
                                    <span className={`ml-2 ${req.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                                        {req.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <Input
                            label="Confirm Password"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating account...' : 'Create Account'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-500">
                    © 2024 ClaimAgent™. All rights reserved.
                </p>
            </div>
        </div>
    );
}
