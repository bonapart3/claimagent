'use client';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
}

export function Logo({ className = '', size = 'md', variant = 'full' }: LogoProps) {
  const sizes = {
    sm: { height: 28, iconSize: 24 },
    md: { height: 36, iconSize: 32 },
    lg: { height: 48, iconSize: 40 },
  };

  const { height, iconSize } = sizes[size];

  if (variant === 'icon') {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 ${className}`}
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-3/5 h-3/5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 12l2 2 4-4"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ height }}>
      <div
        className="flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-3/5 h-3/5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 12l2 2 4-4"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span
        className="font-semibold tracking-tight text-gray-900 dark:text-white"
        style={{ fontSize: height * 0.5 }}
      >
        Claim<span className="text-blue-600">Agent</span>
      </span>
    </div>
  );
}

export default Logo;
