// src/lib/utils/requestValidator.ts
// Request validation middleware with malicious payload detection

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';
import { auditLog } from './auditLogger';

// =============================================================================
// Types
// =============================================================================

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: ValidationError[];
    blocked?: boolean;
    threatLevel?: ThreatLevel;
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface SecurityCheckResult {
    safe: boolean;
    threatLevel: ThreatLevel;
    threats: string[];
    blocked: boolean;
}

export interface ValidatorOptions {
    /** Block requests that fail validation (default: true) */
    blockOnFailure?: boolean;
    /** Block requests with detected threats (default: true) */
    blockOnThreat?: boolean;
    /** Minimum threat level to block (default: 'medium') */
    blockThreshold?: ThreatLevel;
    /** Log all validation failures (default: true) */
    logFailures?: boolean;
    /** Log detected threats (default: true) */
    logThreats?: boolean;
    /** Custom error message for blocked requests */
    blockMessage?: string;
    /** Skip security checks (not recommended) */
    skipSecurityChecks?: boolean;
    /** Maximum request body size in bytes (default: 1MB) */
    maxBodySize?: number;
}

const DEFAULT_OPTIONS: Required<ValidatorOptions> = {
    blockOnFailure: true,
    blockOnThreat: true,
    blockThreshold: 'medium',
    logFailures: true,
    logThreats: true,
    blockMessage: 'Request blocked due to security policy',
    skipSecurityChecks: false,
    maxBodySize: 1024 * 1024, // 1MB
};

// =============================================================================
// Threat Detection Patterns
// =============================================================================

const THREAT_PATTERNS = {
    // SQL Injection patterns
    sqlInjection: [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b\s)/gi,
        /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
        /(--|;|\/\*|\*\/|@@|@|char\(|nchar\(|varchar\(|nvarchar\()/gi,
        /(\bWAITFOR\s+DELAY\b)/gi,
        /(\bBENCHMARK\s*\()/gi,
        /(\bSLEEP\s*\()/gi,
        /(0x[0-9a-fA-F]+)/g, // Hex-encoded strings
    ],

    // XSS patterns
    xss: [
        /<script\b[^>]*>[\s\S]*?<\/script>/gi,
        /<script\b[^>]*>/gi,
        /javascript\s*:/gi,
        /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers
        /on\w+\s*=/gi,
        /<\s*img[^>]*\s+onerror\s*=/gi,
        /<\s*svg[^>]*\s+onload\s*=/gi,
        /<\s*iframe/gi,
        /<\s*embed/gi,
        /<\s*object/gi,
        /data\s*:\s*text\/html/gi,
        /expression\s*\(/gi, // CSS expression
        /vbscript\s*:/gi,
    ],

    // Command injection patterns
    commandInjection: [
        /[;&|`$](?:\s*(?:cat|ls|cd|pwd|rm|mv|cp|chmod|chown|curl|wget|nc|netcat|python|perl|ruby|php|node|bash|sh|zsh)\b)/gi,
        /\$\(.*\)/g, // Command substitution
        /`.*`/g, // Backtick execution
        /\|\s*(?:cat|ls|rm|wget|curl|nc)\b/gi,
        /(?:&&|\|\|)\s*(?:cat|ls|rm|wget|curl)\b/gi,
        />\s*\/(?:etc|tmp|var)/gi, // File redirection
        /;\s*(?:cat|rm|wget|curl|nc)\b/gi,
    ],

    // Path traversal patterns
    pathTraversal: [
        /\.\.[\/\\]/g,
        /\.\.%2[fF]/g,
        /\.\.%5[cC]/g,
        /%2e%2e[\/\\%]/gi,
        /\.%00\./g, // Null byte injection
        /%00/g,
    ],

    // LDAP injection patterns
    ldapInjection: [
        /[)(|*\\]/g,
        /\x00/g, // Null bytes
    ],

    // NoSQL injection patterns (MongoDB)
    nosqlInjection: [
        /\$(?:where|gt|gte|lt|lte|ne|in|nin|or|and|not|nor|exists|type|mod|regex|text|all|size|elemMatch)\b/gi,
        /\{\s*['"]\$\w+['"]\s*:/g,
    ],

    // SSRF patterns
    ssrf: [
        /(?:localhost|127\.0\.0\.1|0\.0\.0\.0|::1|0x7f\.)/gi,
        /(?:169\.254\.\d+\.\d+)/g, // AWS metadata
        /(?:192\.168\.\d+\.\d+)/g, // Private IP
        /(?:10\.\d+\.\d+\.\d+)/g, // Private IP
        /(?:172\.(?:1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/g, // Private IP
        /file:\/\//gi,
        /gopher:\/\//gi,
        /dict:\/\//gi,
    ],

    // Prototype pollution
    prototypePollution: [
        /__proto__/gi,
        /constructor\s*\[/gi,
        /prototype\s*\[/gi,
    ],

    // Log injection / CRLF injection
    logInjection: [
        /\r\n/g,
        /%0[dD]%0[aA]/g,
        /\n.*(?:ERROR|WARN|INFO|DEBUG|TRACE)/g,
    ],

    // Template injection
    templateInjection: [
        /\{\{.*\}\}/g, // Mustache/Handlebars
        /\$\{.*\}/g, // Template literals (could be legitimate)
        /<%= .* %>/g, // EJS
        /\{%.*%\}/g, // Jinja/Twig
    ],
};

// Threat severity levels
const THREAT_SEVERITY: Record<string, ThreatLevel> = {
    sqlInjection: 'critical',
    xss: 'high',
    commandInjection: 'critical',
    pathTraversal: 'high',
    ldapInjection: 'high',
    nosqlInjection: 'high',
    ssrf: 'high',
    prototypePollution: 'critical',
    logInjection: 'medium',
    templateInjection: 'medium',
};

// =============================================================================
// Security Check Functions
// =============================================================================

/**
 * Check a value for malicious patterns
 */
function checkValue(value: unknown, path: string, threats: string[]): ThreatLevel {
    if (value === null || value === undefined) {
        return 'none';
    }

    let maxThreat: ThreatLevel = 'none';

    if (typeof value === 'string') {
        for (const [threatType, patterns] of Object.entries(THREAT_PATTERNS)) {
            for (const pattern of patterns) {
                // Reset lastIndex for global patterns
                pattern.lastIndex = 0;
                if (pattern.test(value)) {
                    const severity = THREAT_SEVERITY[threatType] || 'medium';
                    threats.push(`${threatType} detected in ${path}`);
                    maxThreat = getHigherThreat(maxThreat, severity);
                    break; // One match per threat type is enough
                }
            }
        }
    } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const itemThreat = checkValue(value[i], `${path}[${i}]`, threats);
            maxThreat = getHigherThreat(maxThreat, itemThreat);
        }
    } else if (typeof value === 'object') {
        // Check for prototype pollution in keys
        for (const key of Object.keys(value)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                threats.push(`Prototype pollution attempt in key: ${path}.${key}`);
                maxThreat = getHigherThreat(maxThreat, 'critical');
            }
            const keyThreat = checkValue((value as Record<string, unknown>)[key], `${path}.${key}`, threats);
            maxThreat = getHigherThreat(maxThreat, keyThreat);
        }
    }

    return maxThreat;
}

/**
 * Compare threat levels and return the higher one
 */
function getHigherThreat(a: ThreatLevel, b: ThreatLevel): ThreatLevel {
    const levels: ThreatLevel[] = ['none', 'low', 'medium', 'high', 'critical'];
    return levels[Math.max(levels.indexOf(a), levels.indexOf(b))];
}

/**
 * Check if a threat level meets or exceeds the threshold
 */
function threatMeetsThreshold(threat: ThreatLevel, threshold: ThreatLevel): boolean {
    const levels: ThreatLevel[] = ['none', 'low', 'medium', 'high', 'critical'];
    return levels.indexOf(threat) >= levels.indexOf(threshold);
}

/**
 * Perform security checks on request body
 */
export function performSecurityChecks(
    body: unknown,
    options: ValidatorOptions = {}
): SecurityCheckResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const threats: string[] = [];

    const threatLevel = checkValue(body, 'body', threats);
    const shouldBlock = opts.blockOnThreat && threatMeetsThreshold(threatLevel, opts.blockThreshold);

    return {
        safe: threatLevel === 'none',
        threatLevel,
        threats,
        blocked: shouldBlock,
    };
}

/**
 * Check request headers for suspicious patterns
 */
export function checkHeaders(request: NextRequest): SecurityCheckResult {
    const threats: string[] = [];
    let threatLevel: ThreatLevel = 'none';

    // Check for suspicious headers
    const suspiciousHeaders = [
        'x-forwarded-host',
        'x-original-url',
        'x-rewrite-url',
    ];

    for (const header of suspiciousHeaders) {
        const value = request.headers.get(header);
        if (value) {
            const headerThreats: string[] = [];
            const headerThreat = checkValue(value, `header:${header}`, headerThreats);
            if (headerThreat !== 'none') {
                threats.push(...headerThreats);
                threatLevel = getHigherThreat(threatLevel, headerThreat);
            }
        }
    }

    // Check User-Agent for known attack tools
    const userAgent = request.headers.get('user-agent') || '';
    const attackToolPatterns = [
        /sqlmap/i,
        /nikto/i,
        /nmap/i,
        /masscan/i,
        /dirbuster/i,
        /gobuster/i,
        /burpsuite/i,
        /hydra/i,
    ];

    for (const pattern of attackToolPatterns) {
        if (pattern.test(userAgent)) {
            threats.push(`Suspicious user-agent detected: matches attack tool pattern`);
            threatLevel = getHigherThreat(threatLevel, 'medium');
            break;
        }
    }

    // Check Content-Type for mismatches
    const contentType = request.headers.get('content-type');
    if (contentType && request.method !== 'GET') {
        if (!contentType.includes('application/json') &&
            !contentType.includes('multipart/form-data') &&
            !contentType.includes('application/x-www-form-urlencoded')) {
            threats.push(`Unusual content-type: ${contentType}`);
            threatLevel = getHigherThreat(threatLevel, 'low');
        }
    }

    return {
        safe: threatLevel === 'none',
        threatLevel,
        threats,
        blocked: threatMeetsThreshold(threatLevel, 'high'),
    };
}

// =============================================================================
// Main Validation Functions
// =============================================================================

/**
 * Validate request body against a Zod schema with security checks
 */
export async function validateRequestBody<T>(
    request: NextRequest,
    schema: ZodSchema<T>,
    options: ValidatorOptions = {}
): Promise<ValidationResult<T>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
        // Check content length
        const contentLength = parseInt(request.headers.get('content-length') || '0');
        if (contentLength > opts.maxBodySize) {
            await logSecurityEvent(request, 'BODY_TOO_LARGE', {
                size: contentLength,
                maxSize: opts.maxBodySize,
            });
            return {
                success: false,
                errors: [{ field: 'body', message: 'Request body too large', code: 'body_too_large' }],
                blocked: opts.blockOnFailure,
                threatLevel: 'low',
            };
        }

        // Parse body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return {
                success: false,
                errors: [{ field: 'body', message: 'Invalid JSON body', code: 'invalid_json' }],
                blocked: opts.blockOnFailure,
                threatLevel: 'none',
            };
        }

        // Perform security checks
        if (!opts.skipSecurityChecks) {
            const securityResult = performSecurityChecks(body, opts);

            if (!securityResult.safe) {
                if (opts.logThreats) {
                    await logSecurityEvent(request, 'MALICIOUS_PAYLOAD_DETECTED', {
                        threatLevel: securityResult.threatLevel,
                        threats: securityResult.threats,
                    });
                }

                if (securityResult.blocked) {
                    return {
                        success: false,
                        errors: [{ field: 'body', message: opts.blockMessage, code: 'security_blocked' }],
                        blocked: true,
                        threatLevel: securityResult.threatLevel,
                    };
                }
            }
        }

        // Validate against schema
        const result = schema.safeParse(body);

        if (!result.success) {
            const errors = formatZodErrors(result.error);

            if (opts.logFailures) {
                await logSecurityEvent(request, 'VALIDATION_FAILED', {
                    errors,
                    path: request.nextUrl.pathname,
                });
            }

            return {
                success: false,
                errors,
                blocked: opts.blockOnFailure,
                threatLevel: 'none',
            };
        }

        return {
            success: true,
            data: result.data,
            blocked: false,
            threatLevel: 'none',
        };
    } catch (error) {
        console.error('[RequestValidator] Unexpected error:', error);
        return {
            success: false,
            errors: [{ field: 'body', message: 'Validation failed', code: 'internal_error' }],
            blocked: opts.blockOnFailure,
            threatLevel: 'none',
        };
    }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQueryParams<T>(
    request: NextRequest,
    schema: ZodSchema<T>,
    options: ValidatorOptions = {}
): ValidationResult<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const { searchParams } = new URL(request.url);

    // Convert search params to object
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        params[key] = value;
    });

    // Perform security checks on query params
    if (!opts.skipSecurityChecks) {
        const securityResult = performSecurityChecks(params, opts);

        if (securityResult.blocked) {
            return {
                success: false,
                errors: [{ field: 'query', message: opts.blockMessage, code: 'security_blocked' }],
                blocked: true,
                threatLevel: securityResult.threatLevel,
            };
        }
    }

    // Validate against schema
    const result = schema.safeParse(params);

    if (!result.success) {
        return {
            success: false,
            errors: formatZodErrors(result.error),
            blocked: opts.blockOnFailure,
            threatLevel: 'none',
        };
    }

    return {
        success: true,
        data: result.data,
        blocked: false,
        threatLevel: 'none',
    };
}

/**
 * Validate path parameters
 */
export function validatePathParams<T>(
    params: Record<string, string>,
    schema: ZodSchema<T>,
    options: ValidatorOptions = {}
): ValidationResult<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Perform security checks
    if (!opts.skipSecurityChecks) {
        const securityResult = performSecurityChecks(params, opts);

        if (securityResult.blocked) {
            return {
                success: false,
                errors: [{ field: 'params', message: opts.blockMessage, code: 'security_blocked' }],
                blocked: true,
                threatLevel: securityResult.threatLevel,
            };
        }
    }

    const result = schema.safeParse(params);

    if (!result.success) {
        return {
            success: false,
            errors: formatZodErrors(result.error),
            blocked: opts.blockOnFailure,
            threatLevel: 'none',
        };
    }

    return {
        success: true,
        data: result.data,
        blocked: false,
        threatLevel: 'none',
    };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format Zod errors into a consistent structure
 */
function formatZodErrors(error: ZodError): ValidationError[] {
    return error.errors.map((err) => ({
        field: err.path.join('.') || 'body',
        message: err.message,
        code: err.code,
    }));
}

/**
 * Log security events
 */
async function logSecurityEvent(
    request: NextRequest,
    action: string,
    details: Record<string, unknown>
): Promise<void> {
    try {
        await auditLog({
            action,
            details: {
                ...details,
                path: request.nextUrl.pathname,
                method: request.method,
                ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown',
            },
        });
    } catch (error) {
        console.error('[RequestValidator] Failed to log security event:', error);
    }
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
    result: ValidationResult<unknown>,
    statusCode: number = 400
): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: result.blocked ? 'Request blocked' : 'Validation failed',
            details: result.errors,
            ...(result.threatLevel && result.threatLevel !== 'none' && {
                security: { threatLevel: result.threatLevel },
            }),
        },
        {
            status: result.blocked ? 403 : statusCode,
            headers: {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
            },
        }
    );
}

/**
 * Higher-order function to wrap API handlers with validation
 */
export function withValidation<T, R>(
    schema: ZodSchema<T>,
    handler: (data: T, request: NextRequest, context?: any) => Promise<NextResponse<R>>,
    options: ValidatorOptions = {}
) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
        const validation = await validateRequestBody(request, schema, options);

        if (!validation.success || !validation.data) {
            return validationErrorResponse(validation);
        }

        return handler(validation.data, request, context);
    };
}

/**
 * Validate form data for file uploads
 */
export async function validateFormData(
    request: NextRequest,
    options: {
        maxFileSize?: number;
        allowedMimeTypes?: string[];
        maxFiles?: number;
    } = {}
): Promise<{ success: boolean; formData?: FormData; error?: string }> {
    const {
        maxFileSize = 10 * 1024 * 1024, // 10MB
        allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        maxFiles = 10,
    } = options;

    try {
        const formData = await request.formData();
        let fileCount = 0;

        for (const [, value] of formData.entries()) {
            if (value instanceof File) {
                fileCount++;

                if (fileCount > maxFiles) {
                    return { success: false, error: `Maximum ${maxFiles} files allowed` };
                }

                if (value.size > maxFileSize) {
                    return {
                        success: false,
                        error: `File ${value.name} exceeds maximum size of ${maxFileSize / 1024 / 1024}MB`,
                    };
                }

                if (!allowedMimeTypes.includes(value.type)) {
                    return {
                        success: false,
                        error: `File type ${value.type} is not allowed`,
                    };
                }

                // Check for suspicious file names
                const threats: string[] = [];
                checkValue(value.name, 'filename', threats);
                if (threats.length > 0) {
                    return { success: false, error: 'Suspicious filename detected' };
                }
            }
        }

        return { success: true, formData };
    } catch {
        return { success: false, error: 'Invalid form data' };
    }
}
