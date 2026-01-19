// Integration test for security headers from next.config.js

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextConfig = require('../../next.config.js');

describe('Next.js Security Headers', () => {
    it('includes core security headers on all routes', async () => {
        const headers = await nextConfig.headers();
        const allHeaders = headers.find((h: any) => h.source === '/(.*)');
        expect(allHeaders).toBeTruthy();

        const keys = allHeaders.headers.map((h: any) => h.key);
        expect(keys).toEqual(expect.arrayContaining([
            'Strict-Transport-Security',
            'X-Frame-Options',
            'X-Content-Type-Options',
            'X-XSS-Protection',
            'Referrer-Policy',
            'Content-Security-Policy',
        ]));
    });
});