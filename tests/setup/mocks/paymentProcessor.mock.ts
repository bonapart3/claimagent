// Mock Payment Processor Service

export interface MockPaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  method: 'CHECK' | 'ACH' | 'WIRE' | 'CARD';
  status: 'PENDING' | 'PROCESSED' | 'FAILED' | 'CANCELLED';
  processedAt?: Date;
  error?: string;
}

const defaultPaymentResult: MockPaymentResult = {
  success: true,
  transactionId: 'TXN-MOCK-' + Date.now(),
  amount: 0,
  method: 'ACH',
  status: 'PROCESSED',
  processedAt: new Date(),
};

let mockPaymentResult: MockPaymentResult = { ...defaultPaymentResult };
let shouldFail = false;
let failureReason = '';

export const setMockPaymentResult = (result: Partial<MockPaymentResult>) => {
  mockPaymentResult = { ...defaultPaymentResult, ...result };
};

export const setPaymentToFail = (reason: string) => {
  shouldFail = true;
  failureReason = reason;
};

export const resetPaymentMock = () => {
  mockPaymentResult = { ...defaultPaymentResult };
  shouldFail = false;
  failureReason = '';
};

export const processPayment = jest.fn().mockImplementation(
  async (paymentDetails: {
    amount: number;
    payeeName: string;
    payeeAddress?: string;
    method: 'CHECK' | 'ACH' | 'WIRE' | 'CARD';
    claimId: string;
  }): Promise<MockPaymentResult> => {
    await new Promise((resolve) => setTimeout(resolve, 10));

    if (shouldFail) {
      return {
        success: false,
        transactionId: '',
        amount: paymentDetails.amount,
        method: paymentDetails.method,
        status: 'FAILED',
        error: failureReason,
      };
    }

    return {
      ...mockPaymentResult,
      transactionId: 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      amount: paymentDetails.amount,
      method: paymentDetails.method,
    };
  }
);

export const verifyPayment = jest.fn().mockImplementation(
  async (transactionId: string): Promise<{ verified: boolean; status: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return {
      verified: true,
      status: 'PROCESSED',
    };
  }
);

export const cancelPayment = jest.fn().mockImplementation(
  async (transactionId: string): Promise<{ cancelled: boolean }> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { cancelled: true };
  }
);

export const getPaymentStatus = jest.fn().mockImplementation(
  async (transactionId: string): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return 'PROCESSED';
  }
);
