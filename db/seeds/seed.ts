// db/seeds/seed.ts
// Database seed script for ClaimAgent™
// Usage: npx tsx db/seeds/seed.ts

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function seed() {
    console.log('='.repeat(60));
    console.log('ClaimAgent™ Database Seeder');
    console.log('='.repeat(60));
    console.log('');

    try {
        // Test connection
        console.log('Testing database connection...');
        await sql`SELECT 1`;
        console.log('✓ Connection successful\n');

        // Create demo carrier
        console.log('Creating demo carrier...');
        const carrierId = uuidv4();
        await sql`
            INSERT INTO carriers (id, name, code, annual_written_premium, license_number, domiciled_state, tier)
            VALUES (
                ${carrierId},
                'Veridicus Insurance Co.',
                'VERIDICUS',
                ${75000000},
                'INS-2024-001',
                'CA',
                'REGIONAL'
            )
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        `;
        console.log('✓ Demo carrier created\n');

        // Create demo admin user
        console.log('Creating demo admin user...');
        const adminPasswordHash = await hash('Admin123!@#', 10);
        await sql`
            INSERT INTO users (id, email, password_hash, first_name, last_name, role, carrier_id, can_auto_approve, approval_limit)
            VALUES (
                ${uuidv4()},
                'admin@claimagent.io',
                ${adminPasswordHash},
                'System',
                'Administrator',
                'ADMIN',
                ${carrierId},
                true,
                ${100000}
            )
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        `;
        console.log('✓ Admin user created (admin@claimagent.io / Admin123!@#)\n');

        // Create demo adjuster
        console.log('Creating demo adjuster...');
        const adjusterPasswordHash = await hash('Adjuster123!', 10);
        const adjusterId = uuidv4();
        await sql`
            INSERT INTO users (id, email, password_hash, first_name, last_name, role, carrier_id, can_auto_approve, approval_limit)
            VALUES (
                ${adjusterId},
                'adjuster@claimagent.io',
                ${adjusterPasswordHash},
                'Jane',
                'Adjuster',
                'ADJUSTER',
                ${carrierId},
                true,
                ${5000}
            )
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        `;
        console.log('✓ Adjuster user created (adjuster@claimagent.io / Adjuster123!)\n');

        // Create state regulations
        console.log('Creating state regulations...');
        const stateRegs = [
            { state: 'CA', threshold: 0.75, formula: 'ACV', ackDays: 15, invDays: 40, payDays: 30, allowsDv: true },
            { state: 'TX', threshold: 1.00, formula: 'ACV', ackDays: 15, invDays: 45, payDays: 5, allowsDv: true },
            { state: 'FL', threshold: 0.80, formula: 'ACV', ackDays: 14, invDays: 90, payDays: 20, allowsDv: false },
            { state: 'NY', threshold: 0.75, formula: 'ACV', ackDays: 15, invDays: 30, payDays: 30, allowsDv: true },
            { state: 'IL', threshold: 0.80, formula: 'ACV', ackDays: 15, invDays: 45, payDays: 30, allowsDv: true },
        ];

        for (const reg of stateRegs) {
            await sql`
                INSERT INTO state_regulations (id, state, total_loss_threshold, total_loss_formula, acknowledgment_days, investigation_days, payment_days, allows_dv)
                VALUES (
                    ${uuidv4()},
                    ${reg.state},
                    ${reg.threshold},
                    ${reg.formula},
                    ${reg.ackDays},
                    ${reg.invDays},
                    ${reg.payDays},
                    ${reg.allowsDv}
                )
                ON CONFLICT (state) DO UPDATE SET
                    total_loss_threshold = EXCLUDED.total_loss_threshold,
                    total_loss_formula = EXCLUDED.total_loss_formula
            `;
        }
        console.log(`✓ ${stateRegs.length} state regulations created\n`);

        // Create demo policy
        console.log('Creating demo policy...');
        const policyId = uuidv4();
        await sql`
            INSERT INTO policies (
                id, policy_number, carrier_id, holder_first_name, holder_last_name,
                holder_email, holder_phone, holder_address,
                effective_date, expiration_date, annual_premium
            )
            VALUES (
                ${policyId},
                'POL-2024-000001',
                ${carrierId},
                'John',
                'Smith',
                'john.smith@example.com',
                '555-123-4567',
                ${JSON.stringify({ street: '123 Main St', city: 'Los Angeles', state: 'CA', zip: '90001' })},
                '2024-01-01',
                '2025-01-01',
                ${1200}
            )
            ON CONFLICT (policy_number) DO NOTHING
        `;
        console.log('✓ Demo policy created\n');

        // Create demo vehicle
        console.log('Creating demo vehicle...');
        const vehicleId = uuidv4();
        await sql`
            INSERT INTO vehicles (
                id, policy_id, vin, year, make, model, trim, color, mileage,
                msrp, current_acv, has_sensors, has_adas
            )
            VALUES (
                ${vehicleId},
                ${policyId},
                '1HGCM82633A123456',
                2023,
                'Honda',
                'Accord',
                'EX-L',
                'Silver',
                15000,
                ${32000},
                ${28500},
                true,
                true
            )
            ON CONFLICT (vin) DO NOTHING
        `;
        console.log('✓ Demo vehicle created\n');

        // Create demo coverages
        console.log('Creating demo coverages...');
        const coverages = [
            { type: 'LIABILITY', limitPerson: 100000, limitAccident: 300000, limitProperty: 100000, deductible: 0 },
            { type: 'COLLISION', limitPerson: null, limitAccident: null, limitProperty: null, deductible: 500 },
            { type: 'COMPREHENSIVE', limitPerson: null, limitAccident: null, limitProperty: null, deductible: 250 },
        ];

        for (const cov of coverages) {
            await sql`
                INSERT INTO coverages (id, policy_id, type, limit_per_person, limit_per_accident, limit_property, deductible)
                VALUES (
                    ${uuidv4()},
                    ${policyId},
                    ${cov.type}::coverage_type,
                    ${cov.limitPerson},
                    ${cov.limitAccident},
                    ${cov.limitProperty},
                    ${cov.deductible}
                )
            `;
        }
        console.log(`✓ ${coverages.length} coverages created\n`);

        // Create demo claim
        console.log('Creating demo claim...');
        const claimId = uuidv4();
        await sql`
            INSERT INTO claims (
                id, claim_number, carrier_id, policy_id, vehicle_id, adjuster_id,
                loss_date, loss_location, loss_description,
                claim_type, loss_type, severity, complexity, status,
                estimated_loss, deductible, fraud_score
            )
            VALUES (
                ${claimId},
                'CLM-2024-000001',
                ${carrierId},
                ${policyId},
                ${vehicleId},
                ${adjusterId},
                '2024-01-15',
                ${JSON.stringify({ address: '456 Oak Ave', city: 'Los Angeles', state: 'CA', zip: '90002' })},
                'Vehicle was rear-ended at a traffic light. Damage to rear bumper and trunk.',
                'AUTO_COLLISION',
                'COLLISION',
                'MEDIUM',
                'SIMPLE',
                'INTAKE',
                ${4500},
                ${500},
                12
            )
            ON CONFLICT (claim_number) DO NOTHING
        `;
        console.log('✓ Demo claim created\n');

        // Create fraud rule
        console.log('Creating demo fraud rules...');
        await sql`
            INSERT INTO fraud_rules (id, carrier_id, name, description, rule_logic, score_impact, is_active)
            VALUES (
                ${uuidv4()},
                ${carrierId},
                'Rapid Claim Reporting',
                'Flag claims reported within 24 hours of policy inception',
                ${JSON.stringify({ condition: 'reported_date - policy_effective_date < 24 hours' })},
                25,
                true
            )
        `;
        await sql`
            INSERT INTO fraud_rules (id, carrier_id, name, description, rule_logic, score_impact, is_active)
            VALUES (
                ${uuidv4()},
                ${carrierId},
                'Multiple Claims Same Vehicle',
                'Flag if vehicle has more than 2 claims in 12 months',
                ${JSON.stringify({ condition: 'claim_count > 2', period: '12 months' })},
                30,
                true
            )
        `;
        console.log('✓ Fraud rules created\n');

        console.log('='.repeat(60));
        console.log('Seeding completed successfully!');
        console.log('='.repeat(60));
        console.log('');
        console.log('Demo Accounts:');
        console.log('  Admin:    admin@claimagent.io / Admin123!@#');
        console.log('  Adjuster: adjuster@claimagent.io / Adjuster123!');
        console.log('');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
