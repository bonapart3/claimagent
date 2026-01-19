#!/usr/bin/env node
// scripts/migrate.js
// Database migration script for Neon PostgreSQL
// Usage: node scripts/migrate.js [--reset]

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigration() {
    const args = process.argv.slice(2);
    const shouldReset = args.includes('--reset');

    console.log('='.repeat(60));
    console.log('ClaimAgent™ Database Migration');
    console.log('='.repeat(60));
    console.log(`Database: Neon PostgreSQL`);
    console.log(`Reset mode: ${shouldReset ? 'YES - All data will be dropped!' : 'No'}`);
    console.log('');

    try {
        // Test connection
        console.log('Testing database connection...');
        await sql`SELECT 1`;
        console.log('✓ Connection successful\n');

        if (shouldReset) {
            console.log('Dropping existing tables and types...');
            await dropAll();
            console.log('✓ Existing schema dropped\n');
        }

        // Read and execute schema
        console.log('Reading schema file...');
        const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        console.log('✓ Schema file loaded\n');

        console.log('Executing schema migration...');

        // Split schema into individual statements
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let executed = 0;
        let skipped = 0;

        for (const statement of statements) {
            try {
                await sql.unsafe(statement + ';');
                executed++;
            } catch (error) {
                // Skip "already exists" errors
                if (error.message.includes('already exists')) {
                    skipped++;
                } else {
                    console.error(`Error executing statement: ${statement.substring(0, 50)}...`);
                    throw error;
                }
            }
        }

        console.log(`✓ Migration complete: ${executed} statements executed, ${skipped} skipped\n`);

        // Verify tables
        console.log('Verifying tables...');
        const tables = await sql`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        `;

        console.log(`✓ ${tables.length} tables created:`);
        tables.forEach(t => console.log(`  - ${t.tablename}`));

        console.log('\n' + '='.repeat(60));
        console.log('Migration completed successfully!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

async function dropAll() {
    // Drop all tables
    const tables = await sql`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    `;

    for (const { tablename } of tables) {
        await sql.unsafe(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
    }

    // Drop all enum types
    const types = await sql`
        SELECT typname
        FROM pg_type
        WHERE typtype = 'e'
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `;

    for (const { typname } of types) {
        await sql.unsafe(`DROP TYPE IF EXISTS "${typname}" CASCADE`);
    }

    // Drop functions
    await sql.unsafe(`DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`);
}

runMigration();
