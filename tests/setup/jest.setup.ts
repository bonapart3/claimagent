import '@testing-library/jest-dom';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/claimagent_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock external services
jest.mock('@/lib/services/aiDamageAnalysis', () => require('./mocks/aiDamageAnalysis.mock'));
jest.mock('@/lib/services/vehicleValuation', () => require('./mocks/vehicleValuation.mock'));
jest.mock('@/lib/services/documentOCR', () => require('./mocks/documentOCR.mock'));
jest.mock('@/lib/services/paymentProcessor', () => require('./mocks/paymentProcessor.mock'));

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    analysis: 'Mock AI analysis',
                    confidence: 0.95,
                    recommendations: ['Proceed with claim'],
                  }),
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

// Mock console methods to reduce noise in tests (optional)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    // Only show actual errors, not expected test errors
    if (!args[0]?.includes?.('Expected test error')) {
      originalConsoleError(...args);
    }
  });
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
