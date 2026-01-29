/**
 * Cloudflare Workers Type Declarations
 *
 * These types match the Cloudflare Workers runtime environment
 */

// D1 Database types
declare class D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

declare class D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result<Record<string, unknown>>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

declare interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: {
    duration: number;
    changes: number;
    last_row_id: number;
  };
}

declare interface D1ExecResult {
  count: number;
  duration: number;
}

// KV Namespace types
declare class KVNamespace {
  get(key: string, options?: { type?: 'text' }): Promise<string | null>;
  get(key: string, options: { type: 'json' }): Promise<unknown | null>;
  get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>;
  get(key: string, options: { type: 'stream' }): Promise<ReadableStream | null>;
  get(key: string, type: 'text'): Promise<string | null>;
  get(key: string, type: 'json'): Promise<unknown | null>;
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  get(key: string, type: 'stream'): Promise<ReadableStream | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: { expiration?: number; expirationTtl?: number; metadata?: unknown }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<KVListResult>;
}

declare interface KVListResult {
  keys: { name: string; expiration?: number; metadata?: unknown }[];
  list_complete: boolean;
  cursor?: string;
}

// R2 Bucket types
declare class R2Bucket {
  head(key: string): Promise<R2Object | null>;
  get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: R2PutOptions
  ): Promise<R2Object>;
  delete(key: string | string[]): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

declare interface R2GetOptions {
  onlyIf?: R2Conditional;
  range?: R2Range;
}

declare interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  md5?: ArrayBuffer | string;
}

declare interface R2ListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
  delimiter?: string;
  startAfter?: string;
}

declare interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  checksums: R2Checksums;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

declare interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  blob(): Promise<Blob>;
}

declare interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}

declare interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

declare interface R2Checksums {
  md5?: ArrayBuffer;
  sha1?: ArrayBuffer;
  sha256?: ArrayBuffer;
  sha384?: ArrayBuffer;
  sha512?: ArrayBuffer;
}

declare interface R2Conditional {
  etagMatches?: string;
  etagDoesNotMatch?: string;
  uploadedBefore?: Date;
  uploadedAfter?: Date;
}

declare interface R2Range {
  offset?: number;
  length?: number;
  suffix?: number;
}

// ExecutionContext
declare class ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// ScheduledEvent
declare interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
  noRetry(): void;
}

// Extend CacheStorage for Cloudflare Workers
declare interface CacheStorage {
  default: Cache;
}
