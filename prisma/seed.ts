// prisma/seed.ts
// Database seed script

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

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
            active: true,
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
            active: true,
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
            active: true,
        },
    });

    console.log('✅ Created users:', { adminUser: adminUser.email, supervisorUser: supervisorUser.email, adjusterUser: adjusterUser.email });

    // Create sample policies first
    const policy1 = await prisma.policy.create({
        data: {
            policyNumber: 'POL-123456',
            effectiveDate: new Date('2024-01-01'),
            expirationDate: new Date('2025-01-01'),
            state: 'CA',
            policyType: 'AUTO',
            holderFirstName: 'John',
            holderLastName: 'Doe',
            holderEmail: 'john.doe@email.com',
            holderPhone: '555-123-4567',
            holderAddress: '123 Main St',
            holderCity: 'Los Angeles',
            holderState: 'CA',
            holderZip: '90210',
            liabilityLimit: 100000,
            collisionLimit: 50000,
            comprehensiveLimit: 25000,
            collisionDeductible: 500,
            comprehensiveDeductible: 250,
        }
    });

    // Create sample claims
    const sampleClaims = [
        {
            claimNumber: 'CLM-2024-000001',
            policyId: policy1.id,
            status: 'APPROVED' as const,
            claimType: 'COLLISION' as const,
            incidentDate: new Date('2024-01-15'),
            incidentState: 'CA',
            incidentLocation: 'Los Angeles, CA',
            incidentCity: 'Los Angeles',
            incidentZip: '90210',
            description: 'Vehicle was rear-ended at a stop light. Other driver admitted fault.',
            estimatedAmount: 450000, // cents
            approvedAmount: 420000,
            deductibleAmount: 50000,
            fraudScore: 0.12,
        }
    ];

    for (const claimData of sampleClaims) {
        const claim = await prisma.claim.upsert({
            where: { claimNumber: claimData.claimNumber },
            update: {},
            create: {
                ...claimData,
                createdById: adjusterUser.id,
                assignedToId: adjusterUser.id,
            },
        });
        console.log(`✅ Created claim: ${claim.claimNumber}`);
    }

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
