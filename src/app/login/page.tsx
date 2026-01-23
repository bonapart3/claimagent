// src/app/login/page.tsx
// Login Page

'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/claims/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(redirectPath);
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-xl rounded-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="adjuster@insurance.com"
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 block text-sm text-gray-700">
              Remember me
            </span>
          </label>

          <Link
            href="/forgot-password"
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="bg-white py-8 px-6 shadow-xl rounded-2xl">
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-blue-600 text-white text-3xl shadow-lg">
            🚗
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            ClaimAgent™
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Autonomous Insurance Claims Platform
          </p>
        </div>

        {/* Login Form with Suspense */}
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
          © {new Date().getFullYear()} ClaimAgent™. All rights reserved.
        </p>
      </div>
    </div>
  );
}
