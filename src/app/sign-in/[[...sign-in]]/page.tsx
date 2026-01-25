// src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Sign in to your account to continue
          </p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-white dark:bg-gray-900 shadow-xl rounded-2xl',
              headerTitle: 'text-gray-900 dark:text-white',
              headerSubtitle: 'text-gray-600 dark:text-gray-400',
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
            },
          }}
        />
      </div>
    </div>
  );
}
