// src/components/ui/Spinner.tsx
// Loading Spinner Component

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'white' | 'gray';
    className?: string;
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
};

const colorClasses = {
    primary: 'border-blue-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-400 border-t-transparent',
};

export function Spinner({ size = 'md', color = 'primary', className = '' }: SpinnerProps) {
    return (
        <div
            className={`
        inline-block rounded-full border-2 animate-spin
        ${sizeClasses[size]}
        ${colorClasses[color]}
        ${className}
      `}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
}

// Full page loading spinner
interface PageLoaderProps {
    message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-600 font-medium">{message}</p>
            </div>
        </div>
    );
}

// Inline loading state
interface InlineLoaderProps {
    text?: string;
}

export function InlineLoader({ text = 'Loading' }: InlineLoaderProps) {
    return (
        <div className="flex items-center gap-2 text-gray-600">
            <Spinner size="sm" />
            <span className="text-sm">{text}</span>
        </div>
    );
}

// Button loading state wrapper
interface ButtonLoadingProps {
    isLoading: boolean;
    children: React.ReactNode;
    loadingText?: string;
}

export function ButtonLoading({ isLoading, children, loadingText = 'Loading...' }: ButtonLoadingProps) {
    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <Spinner size="sm" color="white" />
                <span>{loadingText}</span>
            </div>
        );
    }
    return <>{children}</>;
}

