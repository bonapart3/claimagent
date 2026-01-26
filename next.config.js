/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,

    // Compiler Options
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },

    // Image Optimization
    images: {
        domains: [
            'claimagent.io',
            'veridicus.io',
            'cdn.claimagent.io',
            'storage.googleapis.com',
            's3.amazonaws.com',
        ],
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60,
    },

    // Security Headers
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "img-src 'self' data: blob: https: https://img.clerk.com",
                            "font-src 'self' data: https://fonts.gstatic.com",
                            "connect-src 'self' https://api.openai.com https://*.claimagent.io https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
                            "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
                            "frame-ancestors 'self'",
                            "base-uri 'self'",
                            "form-action 'self' https://*.clerk.accounts.dev https://*.clerk.com"
                        ].join('; ')
                    }
                ],
            },
            {
                source: '/api/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-store, must-revalidate'
                    }
                ]
            }
        ];
    },

    // Redirects
    async redirects() {
        return [
            {
                source: '/home',
                destination: '/',
                permanent: true,
            },
            {
                source: '/claim',
                destination: '/claims/new',
                permanent: true,
            },
        ];
    },

    // Rewrites for API versioning
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: '/api/:path*',
            },
        ];
    },

    // Environment Variables
    env: {
        NEXT_PUBLIC_APP_NAME: 'ClaimAgent™',
        NEXT_PUBLIC_APP_VERSION: '3.0.0',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    },

    // Experimental Features
    experimental: {
        serverComponentsExternalPackages: ['prisma', '@prisma/client'],
        optimizeCss: true,
        optimizePackageImports: [
            'lucide-react',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            'recharts',
        ],
    },

    // Webpack Configuration
    webpack: (config, { isServer, webpack }) => {
        // Add custom webpack config
        config.plugins.push(
            new webpack.DefinePlugin({
                'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
            })
        );

        // Handle node modules that need special treatment
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
            };
        }

        return config;
    },

    // Performance Optimization
    poweredByHeader: false,
    compress: true,
    productionBrowserSourceMaps: false,

    // Output Configuration (removed 'standalone' for Vercel compatibility)

    // TypeScript Configuration
    typescript: {
        ignoreBuildErrors: true, // TODO: Fix type errors and set back to false
    },

    // ESLint Configuration
    eslint: {
        ignoreDuringBuilds: true, // TODO: Fix lint errors and set back to false
    },

    // Trailing Slash
    trailingSlash: false,

    // Page Extensions
    pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

    // Exclude workers from build
    excludeDefaultMomentLocales: true,

    // Generate ETags
    generateEtags: true,

    // HTTP Agent Keep Alive
    httpAgentOptions: {
        keepAlive: true,
    },
};

module.exports = nextConfig;