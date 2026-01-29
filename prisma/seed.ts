// prisma/seed.ts
// Database seed script

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create a demo carrier first
    const carrier = await prisma.carrier.upsert({
        where: { code: 'DEMO-CARRIER' },
        update: {},
        create: {
            name: 'Demo Insurance Company',
            code: 'DEMO-CARRIER',
            annualWrittenPremium: 50000000,
            licenseNumber: 'LIC-123456',
            domiciledState: 'CA',
            isActive: true,
            tier: 'REGIONAL',
        },
    });

    console.log('✅ Created carrier:', carrier.name);

    // Create demo users
    const adminUser = await prisma.user.upsert({
        where: { email: 'tyler@claimagent.io' },
        update: {},
        create: {
            email: 'tyler@claimagent.io',
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            passwordHash: '$2b$10$demohashedpassword', // Demo password
            isActive: true,
            carrierId: carrier.id,
        },
    });

    const supervisorUser = await prisma.user.upsert({
        where: { email: 'tyler@claimagent.io' },
        update: {},
        create: {
            email: 'tyler@claimagent.io',
            firstName: 'Sarah',
            lastName: 'Supervisor',
            role: 'SUPERVISOR',
            passwordHash: '$2b$10$demohashedpassword',
            isActive: true,
            carrierId: carrier.id,
        },
    });

    const adjusterUser = await prisma.user.upsert({
        where: { email: 'tyler@claimagent.io' },
        update: {},
        create: {
            email: 'tyler@claimagent.io',
            firstName: 'John',
            lastName: 'Adjuster',
            role: 'ADJUSTER',
            passwordHash: '$2b$10$demohashedpassword',
            isActive: true,
            carrierId: carrier.id,
        },
    });

    console.log('✅ Created users:', {
        adminUser: adminUser.email,
        supervisorUser: supervisorUser.email,
        adjusterUser: adjusterUser.email
    });

    // Create sample policy
    const policy = await prisma.policy.upsert({
        where: { policyNumber: 'POL-123456' },
        update: {},
        create: {
            policyNumber: 'POL-123456',
            carrierId: carrier.id,
            holderFirstName: 'John',
            holderLastName: 'Doe',
            holderEmail: 'john.doe@email.com',
            holderPhone: '555-123-4567',
            holderAddress: {
                street: '123 Main St',
                city: 'Los Angeles',
                state: 'CA',
                zip: '90210',
            },
            effectiveDate: new Date('2024-01-01'),
            expirationDate: new Date('2025-01-01'),
            status: 'ACTIVE',
            annualPremium: 1200,
        },
    });

    console.log('✅ Created policy:', policy.policyNumber);

    // Create a vehicle for the policy
    const vehicle = await prisma.vehicle.upsert({
        where: { vin: '1HGBH41JXMN109186' },
        update: {},
        create: {
            policyId: policy.id,
            vin: '1HGBH41JXMN109186',
            year: 2021,
            make: 'Honda',
            model: 'Accord',
            trim: 'EX-L',
            color: 'Silver',
            mileage: 35000,
        },
    });

    console.log('✅ Created vehicle:', `${vehicle.year} ${vehicle.make} ${vehicle.model}`);

    // Create sample claim
    const claim = await prisma.claim.upsert({
        where: { claimNumber: 'CLM-2024-000001' },
        update: {},
        create: {
            claimNumber: 'CLM-2024-000001',
            carrierId: carrier.id,
            policyId: policy.id,
            vehicleId: vehicle.id,
            adjusterId: adjusterUser.id,
            lossDate: new Date('2024-01-15'),
            reportedDate: new Date('2024-01-15'),
            lossLocation: {
                address: '456 Oak Ave',
                city: 'Los Angeles',
                state: 'CA',
                zip: '90210',
                description: 'Intersection of Oak Ave and Main St',
            },
            lossDescription: 'Vehicle was rear-ended at a stop light. Other driver admitted fault.',
            claimType: 'AUTO_COLLISION',
            lossType: 'COLLISION',
            severity: 'MEDIUM',
            complexity: 'SIMPLE',
            status: 'APPROVED',
            estimatedLoss: 4500,
            reserveAmount: 5000,
            paidAmount: 4200,
            deductible: 500,
            fraudScore: 12,
            requiresHumanReview: false,
            autoApprovalEligible: true,
        },
    });

    console.log('✅ Created claim:', claim.claimNumber);

    // Create state regulation for California
    await prisma.stateRegulation.upsert({
        where: { state: 'CA' },
        update: {},
        create: {
            state: 'CA',
            totalLossThreshold: 0.75,
            totalLossFormula: 'ACV',
            allowsDv: true,
            dvLimitations: 'Allowed for third-party claims',
            acknowledgmentDays: 15,
            investigationDays: 40,
            paymentDays: 30,
            requiresRor: true,
            doiWebsite: 'https://www.insurance.ca.gov',
            doiPhone: '800-927-4357',
        },
    });

    console.log('✅ Created CA state regulation');

    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
