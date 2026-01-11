// Cloudflare Pages local development support
const setupDevPlatform = async () => {
    if (process.env.NODE_ENV === 'development') {
        const { setupDevPlatform } = await import('@cloudflare/next-on-pages/next-dev');
        await setupDevPlatform();
    }
};

setupDevPlatform();

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,

    // Compiler Options
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },

    // Image Optimization
    // Note: Using Cloudflare Image Resizing or external optimization
    images: {
        loader: 'custom',
        loaderFile: './src/lib/utils/imageLoader.ts',
        remotePatterns: [
            { protocol: 'https', hostname: 'claimagent.io' },
            { protocol: 'https', hostname: 'veridicus.io' },
            { protocol: 'https', hostname: 'cdn.claimagent.io' },
            { protocol: 'https', hostname: 'storage.googleapis.com' },
            { protocol: 'https', hostname: 's3.amazonaws.com' },
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
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: https:",
                            "font-src 'self' data:",
                            "connect-src 'self' https://api.openai.com https://*.claimagent.io",
                            "frame-ancestors 'self'",
                            "base-uri 'self'",
                            "form-action 'self'"
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

        // Optimize bundle
        config.optimization = {
            ...config.optimization,
            moduleIds: 'deterministic',
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    default: false,
                    vendors: false,
                    // Vendor chunk for node_modules
                    vendor: {
                        name: 'vendor',
                        chunks: 'all',
                        test: /node_modules/,
                        priority: 20,
                    },
                    // Common chunk for shared components
                    common: {
                        name: 'common',
                        minChunks: 2,
                        chunks: 'async',
                        priority: 10,
                        reuseExistingChunk: true,
                        enforce: true,
                    },
                },
            },
        };

        return config;
    },

    // Performance Optimization
    poweredByHeader: false,
    compress: true,
    productionBrowserSourceMaps: false,

    // Output Configuration
    // Note: 'standalone' is not used for Cloudflare Pages deployment
    // @cloudflare/next-on-pages handles the build output

    // TypeScript Configuration
    typescript: {
        ignoreBuildErrors: false,
    },

    // ESLint Configuration
    eslint: {
        ignoreDuringBuilds: false,
        dirs: ['src', 'tests'],
    },

    // Trailing Slash
    trailingSlash: false,

    // Page Extensions
    pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

    // Generate ETags
    generateEtags: true,

    // HTTP Agent Keep Alive
    httpAgentOptions: {
        keepAlive: true,
    },
};

module.exports = nextConfig;