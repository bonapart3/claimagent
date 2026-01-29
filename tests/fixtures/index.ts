// Test Fixtures - Centralized test data for ClaimAgent
// All monetary values in cents

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// USER FIXTURES
// ============================================================================

export const testUsers = {
  admin: {
    id: uuidv4(),
    email: 'admin@claimagent.test',
    passwordHash: '$2a$10$rQEY7XoGPf3.nJA7DRUi0uG9x0qTXqvYpYs2QhDgNJxzQq9sP5Kzq', // "password123"
    role: 'ADMIN' as const,
    firstName: 'Admin',
    lastName: 'User',
    licenseNumber: 'ADM-001',
    state: 'CA',
    active: true,
  },
  adjuster: {
    id: uuidv4(),
    email: 'adjuster@claimagent.test',
    passwordHash: '$2a$10$rQEY7XoGPf3.nJA7DRUi0uG9x0qTXqvYpYs2QhDgNJxzQq9sP5Kzq',
    role: 'ADJUSTER' as const,
    firstName: 'John',
    lastName: 'Adjuster',
    licenseNumber: 'ADJ-123',
    state: 'CA',
    active: true,
  },
  siuSpecialist: {
    id: uuidv4(),
    email: 'siu@claimagent.test',
    passwordHash: '$2a$10$rQEY7XoGPf3.nJA7DRUi0uG9x0qTXqvYpYs2QhDgNJxzQq9sP5Kzq',
    role: 'SIU_SPECIALIST' as const,
    firstName: 'Sarah',
    lastName: 'Investigator',
    licenseNumber: 'SIU-456',
    state: 'CA',
    active: true,
  },
  supervisor: {
    id: uuidv4(),
    email: 'supervisor@claimagent.test',
    passwordHash: '$2a$10$rQEY7XoGPf3.nJA7DRUi0uG9x0qTXqvYpYs2QhDgNJxzQq9sP5Kzq',
    role: 'SUPERVISOR' as const,
    firstName: 'Mike',
    lastName: 'Supervisor',
    licenseNumber: 'SUP-789',
    state: 'CA',
    active: true,
  },
};

// ============================================================================
// POLICY FIXTURES
// ============================================================================

export const testPolicies = {
  standardAuto: {
    id: uuidv4(),
    policyNumber: 'POL-2024-001234',
    effectiveDate: new Date('2024-01-01'),
    expirationDate: new Date('2025-01-01'),
    state: 'CA',
    policyType: 'AUTO',
    status: 'ACTIVE' as const,
    holderFirstName: 'Robert',
    holderLastName: 'Johnson',
    holderEmail: 'robert.johnson@email.test',
    holderPhone: '555-123-4567',
    holderAddress: '456 Oak Avenue',
    holderCity: 'Los Angeles',
    holderState: 'CA',
    holderZip: '90001',
    liabilityLimit: 10000000, // $100,000
    collisionLimit: 5000000, // $50,000
    comprehensiveLimit: 5000000, // $50,000
    umUimLimit: 5000000, // $50,000
    medicalPaymentLimit: 500000, // $5,000
    collisionDeductible: 50000, // $500
    comprehensiveDeductible: 25000, // $250
    carrierId: 'CARRIER-001',
  },
  expiredPolicy: {
    id: uuidv4(),
    policyNumber: 'POL-2023-EXPIRED',
    effectiveDate: new Date('2023-01-01'),
    expirationDate: new Date('2024-01-01'),
    state: 'CA',
    policyType: 'AUTO',
    status: 'EXPIRED' as const,
    holderFirstName: 'Jane',
    holderLastName: 'Expired',
    holderEmail: 'jane.expired@email.test',
    holderPhone: '555-999-0000',
    holderAddress: '789 Pine Street',
    holderCity: 'San Francisco',
    holderState: 'CA',
    holderZip: '94102',
    liabilityLimit: 5000000,
    collisionLimit: 2500000,
    comprehensiveLimit: 2500000,
    umUimLimit: 2500000,
    medicalPaymentLimit: 250000,
    collisionDeductible: 100000,
    comprehensiveDeductible: 50000,
    carrierId: 'CARRIER-001',
  },
  highLimitPolicy: {
    id: uuidv4(),
    policyNumber: 'POL-2024-HIGHLIM',
    effectiveDate: new Date('2024-01-01'),
    expirationDate: new Date('2025-01-01'),
    state: 'TX',
    policyType: 'AUTO',
    status: 'ACTIVE' as const,
    holderFirstName: 'Wealthy',
    holderLastName: 'Customer',
    holderEmail: 'wealthy@email.test',
    holderPhone: '555-RICH-001',
    holderAddress: '1 Mansion Drive',
    holderCity: 'Houston',
    holderState: 'TX',
    holderZip: '77001',
    liabilityLimit: 50000000, // $500,000
    collisionLimit: 25000000, // $250,000
    comprehensiveLimit: 25000000,
    umUimLimit: 25000000,
    medicalPaymentLimit: 2500000, // $25,000
    collisionDeductible: 100000, // $1,000
    comprehensiveDeductible: 50000,
    carrierId: 'CARRIER-002',
  },
};

// ============================================================================
// VEHICLE FIXTURES
// ============================================================================

export const testVehicles = {
  sedan: {
    id: uuidv4(),
    policyId: testPolicies.standardAuto.id,
    vin: '1HGBH41JXMN109186',
    year: 2021,
    make: 'Honda',
    model: 'Accord',
    trim: 'Sport',
    color: 'Silver',
    licensePlate: 'ABC1234',
    licensePlateState: 'CA',
    usage: 'PERSONAL' as const,
    hasSensors: true,
  },
  truck: {
    id: uuidv4(),
    policyId: testPolicies.highLimitPolicy.id,
    vin: '1FTFW1ET5EFC12345',
    year: 2022,
    make: 'Ford',
    model: 'F-150',
    trim: 'Lariat',
    color: 'Black',
    licensePlate: 'TRK5678',
    licensePlateState: 'TX',
    usage: 'PERSONAL' as const,
    hasSensors: true,
  },
  oldCar: {
    id: uuidv4(),
    policyId: testPolicies.standardAuto.id,
    vin: '2T1BURHE5JC654321',
    year: 2015,
    make: 'Toyota',
    model: 'Camry',
    trim: 'LE',
    color: 'White',
    licensePlate: 'OLD9999',
    licensePlateState: 'CA',
    usage: 'PERSONAL' as const,
    hasSensors: false,
  },
};

// ============================================================================
// CLAIM FIXTURES
// ============================================================================

export const testClaims = {
  simpleCollision: {
    id: uuidv4(),
    claimNumber: 'CLM-2024-000001',
    policyId: testPolicies.standardAuto.id,
    vehicleId: testVehicles.sedan.id,
    incidentDate: new Date('2024-01-15'),
    incidentTime: '14:30',
    incidentLocation: '123 Main Street',
    incidentCity: 'Los Angeles',
    incidentState: 'CA',
    incidentZip: '90001',
    description: 'Rear-ended at stoplight. Minor damage to rear bumper.',
    policeReportNum: '2024-LA-001234',
    weatherConditions: 'Clear',
    claimType: 'COLLISION' as const,
    lossType: ['PROPERTY_DAMAGE'] as const,
    severity: 'LOW' as const,
    status: 'SUBMITTED' as const,
    estimatedAmount: 150000, // $1,500
    fraudScore: 12.5,
    fraudFlags: [],
    escalationReasons: [],
    createdById: testUsers.adjuster.id,
  },
  complexBodilyInjury: {
    id: uuidv4(),
    claimNumber: 'CLM-2024-000002',
    policyId: testPolicies.standardAuto.id,
    vehicleId: testVehicles.sedan.id,
    incidentDate: new Date('2024-01-20'),
    incidentTime: '08:15',
    incidentLocation: '456 Highway 101',
    incidentCity: 'San Francisco',
    incidentState: 'CA',
    incidentZip: '94102',
    description: 'Multi-vehicle accident on highway. Driver and passenger injured.',
    policeReportNum: '2024-SF-005678',
    weatherConditions: 'Rain',
    claimType: 'COLLISION' as const,
    lossType: ['PROPERTY_DAMAGE', 'BODILY_INJURY'] as const,
    severity: 'HIGH' as const,
    status: 'UNDER_REVIEW' as const,
    estimatedAmount: 2500000, // $25,000
    fraudScore: 22.0,
    fraudFlags: [],
    escalationReasons: ['BODILY_INJURY', 'MULTI_VEHICLE'],
    createdById: testUsers.adjuster.id,
    assignedToId: testUsers.supervisor.id,
  },
  suspiciousClaim: {
    id: uuidv4(),
    claimNumber: 'CLM-2024-000003',
    policyId: testPolicies.standardAuto.id,
    vehicleId: testVehicles.oldCar.id,
    incidentDate: new Date('2024-01-25'),
    incidentTime: '02:30',
    incidentLocation: 'Unknown parking lot',
    incidentCity: 'Los Angeles',
    incidentState: 'CA',
    incidentZip: '90015',
    description: 'Found car damaged in parking lot. No witnesses.',
    policeReportNum: null,
    weatherConditions: 'Unknown',
    claimType: 'COMPREHENSIVE' as const,
    lossType: ['PROPERTY_DAMAGE', 'VANDALISM'] as const,
    severity: 'MEDIUM' as const,
    status: 'INVESTIGATION' as const,
    estimatedAmount: 800000, // $8,000
    fraudScore: 65.0,
    fraudFlags: ['NO_WITNESSES', 'LATE_NIGHT', 'NO_POLICE_REPORT', 'VAGUE_DESCRIPTION'],
    escalationReasons: ['FRAUD_SCORE_HIGH'],
    createdById: testUsers.adjuster.id,
    assignedToId: testUsers.siuSpecialist.id,
  },
  totalLoss: {
    id: uuidv4(),
    claimNumber: 'CLM-2024-000004',
    policyId: testPolicies.highLimitPolicy.id,
    vehicleId: testVehicles.truck.id,
    incidentDate: new Date('2024-02-01'),
    incidentTime: '16:45',
    incidentLocation: 'Interstate 10, Mile Marker 45',
    incidentCity: 'Houston',
    incidentState: 'TX',
    incidentZip: '77001',
    description: 'Rolled vehicle after tire blowout. Vehicle totaled.',
    policeReportNum: '2024-TX-009012',
    weatherConditions: 'Clear',
    claimType: 'TOTAL_LOSS' as const,
    lossType: ['PROPERTY_DAMAGE'] as const,
    severity: 'CATASTROPHIC' as const,
    status: 'UNDER_REVIEW' as const,
    estimatedAmount: 4500000, // $45,000
    fraudScore: 8.0,
    fraudFlags: [],
    escalationReasons: ['TOTAL_LOSS'],
    createdById: testUsers.adjuster.id,
  },
  autoApproveCandidate: {
    id: uuidv4(),
    claimNumber: 'CLM-2024-000005',
    policyId: testPolicies.standardAuto.id,
    vehicleId: testVehicles.sedan.id,
    incidentDate: new Date('2024-02-10'),
    incidentTime: '10:00',
    incidentLocation: '789 Shopping Center',
    incidentCity: 'Pasadena',
    incidentState: 'CA',
    incidentZip: '91101',
    description: 'Shopping cart hit car in parking lot. Minor dent on door.',
    policeReportNum: null,
    weatherConditions: 'Sunny',
    claimType: 'COMPREHENSIVE' as const,
    lossType: ['PROPERTY_DAMAGE'] as const,
    severity: 'LOW' as const,
    status: 'SUBMITTED' as const,
    estimatedAmount: 85000, // $850 - under $2,500 threshold
    fraudScore: 5.0, // Very low fraud score
    fraudFlags: [],
    escalationReasons: [],
    createdById: testUsers.adjuster.id,
  },
};

// ============================================================================
// PARTICIPANT FIXTURES
// ============================================================================

export const testParticipants = {
  claimant: {
    id: uuidv4(),
    claimId: testClaims.simpleCollision.id,
    role: 'CLAIMANT' as const,
    firstName: 'Robert',
    lastName: 'Johnson',
    email: 'robert.johnson@email.test',
    phone: '555-123-4567',
    address: '456 Oak Avenue',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90001',
    injuries: [],
    injurySeverity: 'NONE' as const,
  },
  thirdParty: {
    id: uuidv4(),
    claimId: testClaims.simpleCollision.id,
    role: 'THIRD_PARTY' as const,
    firstName: 'Alice',
    lastName: 'Driver',
    email: 'alice.driver@email.test',
    phone: '555-987-6543',
    address: '321 Elm Street',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90002',
    insuranceCarrier: 'Other Insurance Co',
    policyNumber: 'OTH-2024-5678',
    injuries: [],
    injurySeverity: 'NONE' as const,
  },
  injuredParty: {
    id: uuidv4(),
    claimId: testClaims.complexBodilyInjury.id,
    role: 'INJURED_PARTY' as const,
    firstName: 'Bob',
    lastName: 'Passenger',
    email: 'bob.passenger@email.test',
    phone: '555-456-7890',
    address: '555 Pine Road',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    injuries: ['Whiplash', 'Bruised ribs'],
    injurySeverity: 'MODERATE' as const,
  },
};

// ============================================================================
// DOCUMENT FIXTURES
// ============================================================================

export const testDocuments = {
  damagePhoto: {
    id: uuidv4(),
    claimId: testClaims.simpleCollision.id,
    type: 'PHOTO_DAMAGE' as const,
    fileName: 'rear_bumper_damage.jpg',
    filePath: '/uploads/claims/CLM-2024-000001/rear_bumper_damage.jpg',
    fileSize: 2048576, // 2MB
    mimeType: 'image/jpeg',
    uploadedBy: testUsers.adjuster.id,
    damageAreas: ['Rear', 'Bumper'],
  },
  policeReport: {
    id: uuidv4(),
    claimId: testClaims.simpleCollision.id,
    type: 'POLICE_REPORT' as const,
    fileName: 'police_report_2024-LA-001234.pdf',
    filePath: '/uploads/claims/CLM-2024-000001/police_report.pdf',
    fileSize: 512000,
    mimeType: 'application/pdf',
    uploadedBy: testUsers.adjuster.id,
    extractedData: {
      reportNumber: '2024-LA-001234',
      officerName: 'Officer Smith',
      citationIssued: true,
    },
    ocrConfidence: 0.94,
  },
  repairEstimate: {
    id: uuidv4(),
    claimId: testClaims.simpleCollision.id,
    type: 'REPAIR_ESTIMATE' as const,
    fileName: 'abc_auto_estimate.pdf',
    filePath: '/uploads/claims/CLM-2024-000001/repair_estimate.pdf',
    fileSize: 256000,
    mimeType: 'application/pdf',
    uploadedBy: testUsers.adjuster.id,
    extractedData: {
      shopName: 'ABC Auto Body',
      totalAmount: 153705, // $1,537.05
      laborHours: 16,
    },
    ocrConfidence: 0.91,
  },
};

// ============================================================================
// FRAUD WATCHLIST FIXTURES
// ============================================================================

export const testWatchlist = {
  suspiciousEmail: {
    id: uuidv4(),
    type: 'EMAIL' as const,
    value: 'fraudster@scam.test',
    reason: 'Multiple fraudulent claims submitted',
    severity: 'HIGH' as const,
    addedBy: testUsers.siuSpecialist.id,
    active: true,
  },
  suspiciousVIN: {
    id: uuidv4(),
    type: 'VIN' as const,
    value: 'FAKE1234567890123',
    reason: 'VIN associated with title washing scheme',
    severity: 'CRITICAL' as const,
    addedBy: testUsers.siuSpecialist.id,
    active: true,
  },
  suspiciousPhone: {
    id: uuidv4(),
    type: 'PHONE' as const,
    value: '555-FRAUD-99',
    reason: 'Phone number linked to organized fraud ring',
    severity: 'CRITICAL' as const,
    addedBy: testUsers.siuSpecialist.id,
    active: true,
  },
};

// ============================================================================
// STATE RULES FIXTURES
// ============================================================================

export const testStateRules = {
  california: {
    id: uuidv4(),
    state: 'CA',
    thresholdType: 'PERCENTAGE_ACV' as const,
    thresholdValue: 75.0,
    formula: 'Total Loss if repair cost >= 75% of ACV',
    effectiveDate: new Date('2024-01-01'),
    source: 'CA DOI Bulletin 2024-01',
  },
  texas: {
    id: uuidv4(),
    state: 'TX',
    thresholdType: 'COMBINED' as const,
    thresholdValue: 100.0,
    formula: 'TDI Formula: Total Loss if repair + salvage > ACV',
    effectiveDate: new Date('2024-01-01'),
    source: 'TX TDI Rule 2024',
  },
  florida: {
    id: uuidv4(),
    state: 'FL',
    thresholdType: 'PERCENTAGE_ACV' as const,
    thresholdValue: 80.0,
    formula: 'Total Loss if repair cost >= 80% of ACV',
    effectiveDate: new Date('2024-01-01'),
    source: 'FL OIR Bulletin 2024-02',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createTestClaim(overrides: Partial<typeof testClaims.simpleCollision> = {}) {
  return {
    ...testClaims.simpleCollision,
    id: uuidv4(),
    claimNumber: `CLM-TEST-${Date.now()}`,
    ...overrides,
  };
}

export function createTestPolicy(overrides: Partial<typeof testPolicies.standardAuto> = {}) {
  return {
    ...testPolicies.standardAuto,
    id: uuidv4(),
    policyNumber: `POL-TEST-${Date.now()}`,
    ...overrides,
  };
}

export function createTestUser(overrides: Partial<typeof testUsers.adjuster> = {}) {
  return {
    ...testUsers.adjuster,
    id: uuidv4(),
    email: `test-${Date.now()}@claimagent.test`,
    ...overrides,
  };
}

export function createTestVehicle(policyId: string, overrides: Partial<typeof testVehicles.sedan> = {}) {
  return {
    ...testVehicles.sedan,
    id: uuidv4(),
    policyId,
    vin: `TEST${Date.now().toString().slice(-13)}`,
    ...overrides,
  };
}
