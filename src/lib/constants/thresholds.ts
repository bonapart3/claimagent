// src/lib/constants/thresholds.ts
// System-wide threshold constants and business rules

export const AUTO_APPROVAL_THRESHOLD = {
    MAX_AMOUNT: 2500,
    MIN_CONFIDENCE: 0.80,
    MIN_FRAUD_SCORE_PASS: 50 // Below this is acceptable
};

export const FRAUD_THRESHOLD = {
    LOW: 20,
    MEDIUM: 40,
    HIGH: 60,
    CRITICAL: 80,
    ESCALATION: 50 // Auto-escalate to SIU above this
};

export const SEVERITY_SCORING = {
    PD_ONLY: 1,
    MINOR_INJURY: 3,
    MODERATE_INJURY: 5,
    SEVERE_INJURY: 8,
    FATALITY: 10,
    MULTI_VEHICLE: 2,
    COMMERCIAL: 2,
    TOTAL_LOSS: 3
};

export const COMPLEXITY_FACTORS = {
    MULTIPLE_CLAIMANTS: 2,
    LITIGATION_INVOLVED: 3,
    DISPUTED_LIABILITY: 2,
    PRIOR_CLAIMS: 1,
    HIGH_VALUE_VEHICLE: 1,
    OUT_OF_STATE: 1,
    RENTAL_INVOLVED: 1
};

// Total Loss thresholds by state (percentage of ACV)
export const TOTAL_LOSS_THRESHOLDS: Record<string, number> = {
    AL: 0.75, AK: 1.00, AZ: 1.00, AR: 0.70, CA: 1.00,
    CO: 1.00, CT: 1.00, DE: 1.00, FL: 0.80, GA: 1.00,
    HI: 1.00, ID: 1.00, IL: 1.00, IN: 0.70, IA: 0.70,
    KS: 1.00, KY: 0.75, LA: 0.75, ME: 1.00, MD: 0.75,
    MA: 1.00, MI: 0.75, MN: 0.70, MS: 1.00, MO: 0.80,
    MT: 1.00, NE: 0.75, NV: 0.65, NH: 0.75, NJ: 1.00,
    NM: 1.00, NY: 0.75, NC: 0.75, ND: 1.00, OH: 1.00,
    OK: 0.60, OR: 0.80, PA: 1.00, RI: 1.00, SC: 0.75,
    SD: 1.00, TN: 0.75, TX: 1.00, UT: 1.00, VT: 1.00,
    VA: 0.75, WA: 1.00, WV: 0.75, WI: 0.70, WY: 0.75
};

export const SENSOR_ZONE_KEYWORDS = [
    'front bumper',
    'rear bumper',
    'windshield',
    'front grille',
    'side mirror',
    'camera',
    'radar',
    'lidar',
    'sensor'
];

export const RESERVE_RANGES = {
    LOW: { min: 0, max: 5000 },
    MEDIUM: { min: 5000, max: 15000 },
    HIGH: { min: 15000, max: 50000 },
    SEVERE: { min: 50000, max: 100000 },
    CATASTROPHIC: { min: 100000, max: 500000 }
};

export const CYCLE_TIME_TARGETS = {
    PD_ONLY_AUTO_APPROVE: 4, // hours
    PD_ONLY_HUMAN_REVIEW: 48, // hours
    MINOR_INJURY: 72, // hours
    MODERATE_INJURY: 120, // hours
    SEVERE_INJURY: 240, // hours
    TOTAL_LOSS: 96 // hours
};

export const DOCUMENT_RETENTION_DAYS = {
    ACTIVE_CLAIM: 0, // Never delete while active
    CLOSED_CLAIM: 2555, // 7 years
    REJECTED_CLAIM: 1095, // 3 years
    FRAUD_FLAGGED: 3650 // 10 years
};

export const RATE_LIMITS = {
    CLAIM_SUBMISSION: {
        perMinute: 10,
        perHour: 50,
        perDay: 200
    },
    API_CALLS: {
        perMinute: 100,
        perHour: 1000
    },
    DOCUMENT_UPLOAD: {
        perClaim: 50,
        totalSize: 100 * 1024 * 1024 // 100MB
    }
};

export const NOTIFICATION_THRESHOLDS = {
    FRAUD_ALERT: 60,
    HIGH_VALUE_CLAIM: 50000,
    RAPID_RESOLUTION: 2, // hours
    OVERDUE_CLAIM: 168 // hours (7 days)
};

export const CONFIDENCE_LEVELS = {
    VERY_LOW: 0.0,
    LOW: 0.4,
    MEDIUM: 0.6,
    HIGH: 0.8,
    VERY_HIGH: 0.95
};

// Alias for backward compatibility
export const AUTO_APPROVAL_THRESHOLDS = AUTO_APPROVAL_THRESHOLD;

// Financial thresholds for reserve and settlement agents
export const FINANCIAL_THRESHOLDS = {
    LOW_VALUE_CLAIM: 5000,
    MEDIUM_VALUE_CLAIM: 25000,
    HIGH_VALUE_CLAIM: 50000,
    ESCALATION_THRESHOLD: 100000,
    RESERVE_WARNING: 75000,
    SETTLEMENT_AUTHORITY: {
        AUTO: 2500,
        ADJUSTER: 50000,
        SUPERVISOR: 100000,
        MANAGER: 250000,
        EXECUTIVE: 500000
    }
};

// Auto approval limits for severity scorer
export const AUTO_APPROVAL_LIMITS = {
    MAX_CLAIM_AMOUNT: 2500,
    MAX_VEHICLE_AGE: 10,
    MAX_COMPLEXITY_SCORE: 3,
    MIN_CONFIDENCE: 0.80,
    EXCLUDED_CLAIM_TYPES: ['BODILY_INJURY', 'FATALITY', 'LITIGATION']
};

export const STATE_NOTIFICATION_DEADLINES = {
    // Days to acknowledge claim
    ACKNOWLEDGMENT: {
        DEFAULT: 15,
        CA: 15,
        FL: 14,
        NY: 15,
        TX: 15,
        IL: 15
    },
    // Days to investigate
    INVESTIGATION: {
        DEFAULT: 30,
        CA: 40,
        FL: 90,
        NY: 30,
        TX: 15,
        IL: 45
    },
    // Days to pay/deny after decision
    PAYMENT: {
        DEFAULT: 30,
        CA: 30,
        FL: 20,
        NY: 30,
        TX: 5,
        IL: 30
    }
};

