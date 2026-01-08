/**
 * ClaimAgent™ Encryption Utility
 * 
 * Provides encryption/decryption for sensitive data (PII, payment info).
 * Uses AES-256-GCM for symmetric encryption with secure key management.
 * 
 * @module Encryption
 * @compliance PCI-DSS, CCPA, GLBA
 */

import crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface EncryptionResult {
    ciphertext: string;
    iv: string;
    authTag: string;
}

export interface EncryptionConfig {
    algorithm: string;
    keyLength: number;
    ivLength: number;
}

// ============================================================================
// ENCRYPTION SERVICE
// ============================================================================

export class EncryptionService {
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static readonly KEY_LENGTH = 32; // 256 bits
    private static readonly IV_LENGTH = 16; // 128 bits
    private static readonly AUTH_TAG_LENGTH = 16;

    private static key: Buffer | null = null;

    /**
     * Initialize encryption key from environment
     */
    static initialize(key?: string): void {
        const keyString = key || process.env.ENCRYPTION_KEY;

        if (!keyString) {
            throw new Error('Encryption key not provided');
        }

        if (keyString.length !== this.KEY_LENGTH * 2) {
            throw new Error(`Encryption key must be ${this.KEY_LENGTH * 2} characters (${this.KEY_LENGTH} bytes)`);
        }

        this.key = Buffer.from(keyString, 'hex');
    }

    /**
     * Generate new encryption key
     */
    static generateKey(): string {
        return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
    }

    /**
     * Encrypt data
     */
    static encrypt(plaintext: string): string {
        if (!this.key) {
            throw new Error('Encryption not initialized. Call initialize() first.');
        }

        const iv = crypto.randomBytes(this.IV_LENGTH);
        const cipher = crypto.createCipheriv(this.ALGORITHM, this.key, iv);

        let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
        ciphertext += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        const result = {
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            ciphertext,
        };

        return Buffer.from(JSON.stringify(result)).toString('base64');
    }

    /**
     * Decrypt data
     */
    static decrypt(encrypted: string): string {
        if (!this.key) {
            throw new Error('Encryption not initialized. Call initialize() first.');
        }

        try {
            const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
            const { iv, authTag, ciphertext } = JSON.parse(decoded);

            const decipher = crypto.createDecipheriv(
                this.ALGORITHM,
                this.key,
                Buffer.from(iv, 'hex')
            );

            decipher.setAuthTag(Buffer.from(authTag, 'hex'));

            let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
            plaintext += decipher.final('utf8');

            return plaintext;
        } catch (error) {
            throw new Error('Decryption failed: Invalid ciphertext or key');
        }
    }

    /**
     * Hash data (one-way)
     */
    static hash(data: string, salt?: string): string {
        const actualSalt = salt || crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512');

        return `${actualSalt}:${hash.toString('hex')}`;
    }

    /**
     * Verify hash
     */
    static verifyHash(data: string, hashedData: string): boolean {
        const [salt, originalHash] = hashedData.split(':');
        const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');

        return hash.toString('hex') === originalHash;
    }

    /**
     * Mask sensitive data (for display purposes)
     */
    static mask(data: string, visibleChars: number = 4): string {
        if (data.length <= visibleChars) {
            return '*'.repeat(data.length);
        }

        const masked = '*'.repeat(data.length - visibleChars);
        const visible = data.slice(-visibleChars);

        return masked + visible;
    }

    /**
     * Generate secure random token
     */
    static generateToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }
}

// Auto-initialize if key is in environment
if (process.env.ENCRYPTION_KEY) {
    EncryptionService.initialize();
}

// Export convenience functions
export const encrypt = (data: string) => EncryptionService.encrypt(data);
export const decrypt = (data: string) => EncryptionService.decrypt(data);
export const hash = (data: string, salt?: string) => EncryptionService.hash(data, salt);
export const verifyHash = (data: string, hashed: string) => EncryptionService.verifyHash(data, hashed);
export const mask = (data: string, visible?: number) => EncryptionService.mask(data, visible);
export const generateToken = (length?: number) => EncryptionService.generateToken(length);

export default EncryptionService;

