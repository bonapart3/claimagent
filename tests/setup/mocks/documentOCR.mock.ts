// Mock Document OCR Service

export interface MockOCRResult {
  text: string;
  confidence: number;
  fields: Record<string, string>;
  documentType: string;
}

const mockPoliceReport: MockOCRResult = {
  text: `POLICE ACCIDENT REPORT
Report Number: 2024-001234
Date: 01/15/2024
Time: 14:30
Location: 123 Main Street, Los Angeles, CA 90001

VEHICLE 1:
Driver: John Smith
License: CA DL12345678
VIN: 1HGBH41JXMN109186
Insurance: ABC Insurance Policy #POL123456

VEHICLE 2:
Driver: Jane Doe
License: CA DL87654321
VIN: 2T1BURHE5JC123456
Insurance: XYZ Insurance Policy #POL789012

DESCRIPTION:
Vehicle 1 was traveling northbound when Vehicle 2 failed to stop at red light.
Vehicle 2 struck Vehicle 1 on driver side.

INJURIES: Minor injuries reported. EMS responded.
CITATIONS: Vehicle 2 driver cited for running red light.`,
  confidence: 0.94,
  fields: {
    reportNumber: '2024-001234',
    date: '01/15/2024',
    time: '14:30',
    location: '123 Main Street, Los Angeles, CA 90001',
    vehicle1Driver: 'John Smith',
    vehicle1VIN: '1HGBH41JXMN109186',
    vehicle2Driver: 'Jane Doe',
    vehicle2VIN: '2T1BURHE5JC123456',
    injuries: 'Minor injuries reported',
    citations: 'Vehicle 2 driver cited for running red light',
  },
  documentType: 'POLICE_REPORT',
};

const mockRepairEstimate: MockOCRResult = {
  text: `REPAIR ESTIMATE
Shop: ABC Auto Body
Date: 01/20/2024
Vehicle: 2021 Honda Accord Sport
VIN: 1HGBH41JXMN109186

PARTS:
Front Bumper Cover - $450.00
Hood - $650.00
Left Fender - $380.00
Headlight Assembly - $320.00

LABOR:
Body Work - 8 hours @ $75/hr - $600.00
Paint - 6 hours @ $65/hr - $390.00
Mechanical - 2 hours @ $85/hr - $170.00

MATERIALS:
Paint and supplies - $285.00

SUBTOTAL: $3,245.00
TAX: $292.05
TOTAL: $3,537.05`,
  confidence: 0.91,
  fields: {
    shopName: 'ABC Auto Body',
    date: '01/20/2024',
    vehicle: '2021 Honda Accord Sport',
    vin: '1HGBH41JXMN109186',
    partsTotal: '1800.00',
    laborTotal: '1160.00',
    materialsTotal: '285.00',
    subtotal: '3245.00',
    tax: '292.05',
    total: '3537.05',
  },
  documentType: 'REPAIR_ESTIMATE',
};

const mockMedicalBill: MockOCRResult = {
  text: `MEDICAL BILL
Provider: City General Hospital
Patient: John Smith
Date of Service: 01/15/2024
Account #: MED-2024-5678

SERVICES:
Emergency Room Visit - $1,200.00
X-Ray (Chest) - $350.00
CT Scan - $800.00
Physician Consultation - $250.00

DIAGNOSIS:
ICD-10: S22.32XA - Fracture of one rib, right side
CPT: 99283 - Emergency department visit

TOTAL CHARGES: $2,600.00
INSURANCE ADJUSTMENT: -$800.00
PATIENT RESPONSIBILITY: $1,800.00`,
  confidence: 0.89,
  fields: {
    provider: 'City General Hospital',
    patient: 'John Smith',
    dateOfService: '01/15/2024',
    accountNumber: 'MED-2024-5678',
    icdCode: 'S22.32XA',
    cptCode: '99283',
    totalCharges: '2600.00',
    insuranceAdjustment: '800.00',
    patientResponsibility: '1800.00',
  },
  documentType: 'MEDICAL_BILL',
};

let mockResults: Record<string, MockOCRResult> = {
  POLICE_REPORT: mockPoliceReport,
  REPAIR_ESTIMATE: mockRepairEstimate,
  MEDICAL_BILL: mockMedicalBill,
};

export const setMockOCRResult = (docType: string, result: Partial<MockOCRResult>) => {
  mockResults[docType] = { ...mockResults[docType], ...result };
};

export const resetMockOCRResults = () => {
  mockResults = {
    POLICE_REPORT: mockPoliceReport,
    REPAIR_ESTIMATE: mockRepairEstimate,
    MEDICAL_BILL: mockMedicalBill,
  };
};

export const extractTextFromDocument = jest.fn().mockImplementation(
  async (filePath: string, documentType?: string): Promise<MockOCRResult> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    const type = documentType || 'POLICE_REPORT';
    return mockResults[type] || mockPoliceReport;
  }
);

export const extractFieldsFromDocument = jest.fn().mockImplementation(
  async (filePath: string, documentType: string): Promise<Record<string, string>> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return (mockResults[documentType] || mockPoliceReport).fields;
  }
);

export const getOCRConfidence = jest.fn().mockImplementation(
  async (filePath: string): Promise<number> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return 0.92;
  }
);
