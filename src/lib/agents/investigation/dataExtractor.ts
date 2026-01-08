/**
 * ClaimAgent™ - Data Extractor (Agent B2)
 * 
 * Responsibilities:
 * - Extract structured fields from documents (VIN, damage codes, CPT/ICD codes)
 * - Parts identification and pricing
 * - Historical data cross-referencing
 * - OCR and AI-based extraction
 * - Validate extracted data against known formats
 * - Confidence scoring for extractions
 * 
 * @module agents/investigation/dataExtractor
 */

import { auditLog } from '@/lib/utils/auditLogger';

export interface ExtractionInput {
  claimId: string;
  documents: ExtractionDocument[];
  vehicleInfo?: { year?: number; make?: string; model?: string; vin?: string };
}

export interface ExtractionDocument {
  id: string;
  type: string;
  content: Buffer | string;
  filename: string;
  metadata?: Record<string, any>;
}

export interface ExtractionOutput {
  claimId: string;
  extractionDate: Date;
  vehicleData: VehicleData;
  damageAssessment: DamageAssessment;
  medicalData?: MedicalData;
  financialData: FinancialData;
  confidence: ConfidenceScores;
  validationResults: ValidationResult[];
  historicalComparisons: HistoricalComparison[];
}

export interface VehicleData {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  odometer?: number;
  odometerUnit?: 'miles' | 'kilometers';
  licensePlate?: string;
  state?: string;
  vinConfidence?: number;
}

export interface DamageAssessment {
  damageAreas: DamageArea[];
  estimatedRepairCost: number;
  laborHours: number;
  partsRequired: Part[];
  damageSeverity: 'minor' | 'moderate' | 'severe' | 'total_loss';
  airbagDeployment: boolean;
  structuralDamage: boolean;
  priorDamage?: PriorDamageIndicator[];
}

export interface DamageArea {
  location: string;
  severity: 'light' | 'moderate' | 'severe';
  description: string;
  estimatedCost: number;
  requiresReplace: boolean;
  damageCode?: string;
}

export interface Part {
  partNumber?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: 'OEM' | 'aftermarket' | 'used' | 'remanufactured';
  availability: 'in_stock' | 'order_required' | 'backordered' | 'discontinued';
}

export interface PriorDamageIndicator { area: string; evidence: string; likelihood: 'low' | 'medium' | 'high'; }
export interface MedicalData { providers: MedicalProvider[]; treatments: Treatment[]; icdCodes: string[]; cptCodes: string[]; totalBilled: number; dateOfService: Date[]; }
export interface MedicalProvider { name: string; npi?: string; specialty: string; address?: string; }
export interface Treatment { date: Date; description: string; cptCode?: string; amount: number; }
export interface FinancialData { estimates: EstimateData[]; invoices: InvoiceData[]; totalEstimated: number; totalActual: number; }
export interface EstimateData { source: string; date: Date; amount: number; laborCost: number; partsCost: number; taxAmount: number; items: LineItem[]; }
export interface InvoiceData { invoiceNumber: string; vendor: string; date: Date; amount: number; items: LineItem[]; }
export interface LineItem { description: string; quantity: number; unitPrice: number; total: number; }
export interface ConfidenceScores { overall: number; vehicleData: number; damageAssessment: number; medicalData: number; financialData: number; }
export interface ValidationResult { field: string; status: 'valid' | 'invalid' | 'uncertain'; message: string; suggestion?: string; }
export interface HistoricalComparison { metric: string; currentValue: number; historicalAverage: number; deviation: number; flag: 'normal' | 'high' | 'low'; }

export class DataExtractor {
  async extractData(input: ExtractionInput): Promise<ExtractionOutput> {
    await auditLog({ action: 'DATA_EXTRACTION_INITIATED', entityType: 'claim', entityId: input.claimId, metadata: { documentCount: input.documents.length } });

    try {
      const vehicleData = await this.extractVehicleData(input.documents, input.vehicleInfo);
      const damageAssessment = await this.extractDamageAssessment(input.documents, vehicleData);
      const medicalData = await this.extractMedicalData(input.documents);
      const financialData = await this.extractFinancialData(input.documents);
      const confidence = this.calculateConfidenceScores(vehicleData, damageAssessment, medicalData, financialData);
      const validationResults = await this.performValidations(vehicleData, damageAssessment, financialData);
      const historicalComparisons = await this.compareWithHistoricalData(vehicleData, damageAssessment, financialData);

      const output: ExtractionOutput = { claimId: input.claimId, extractionDate: new Date(), vehicleData, damageAssessment, medicalData, financialData, confidence, validationResults, historicalComparisons };
      await auditLog({ action: 'DATA_EXTRACTION_COMPLETED', entityType: 'claim', entityId: input.claimId, metadata: { overallConfidence: confidence.overall, validationsPassed: validationResults.filter(v => v.status === 'valid').length, validationsTotal: validationResults.length } });
      return output;
    } catch (error) {
      await auditLog({ action: 'DATA_EXTRACTION_ERROR', entityType: 'claim', entityId: input.claimId, metadata: { error: error instanceof Error ? error.message : 'Unknown error' } });
      throw error;
    }
  }

  private async extractVehicleData(documents: ExtractionDocument[], providedInfo?: { year?: number; make?: string; model?: string; vin?: string }): Promise<VehicleData> {
    const vehicleData: VehicleData = { year: providedInfo?.year, make: providedInfo?.make, model: providedInfo?.model, vin: providedInfo?.vin, vinConfidence: providedInfo?.vin ? 100 : 0 };
    for (const doc of documents) {
      if (!vehicleData.vin) {
        const extractedVin = this.extractVIN(doc);
        if (extractedVin) {
          vehicleData.vin = extractedVin.vin;
          vehicleData.vinConfidence = extractedVin.confidence;
          const decoded = this.decodeVIN(extractedVin.vin);
          vehicleData.year = vehicleData.year || decoded.year;
          vehicleData.make = vehicleData.make || decoded.make;
        }
      }
      if (!vehicleData.odometer) {
        const odometer = this.extractOdometer(doc);
        if (odometer) { vehicleData.odometer = odometer.value; vehicleData.odometerUnit = odometer.unit; }
      }
      if (!vehicleData.licensePlate) {
        const plate = this.extractLicensePlate(doc);
        if (plate) { vehicleData.licensePlate = plate.number; vehicleData.state = plate.state; }
      }
    }
    return vehicleData;
  }

  private extractVIN(doc: ExtractionDocument): { vin: string; confidence: number } | null {
    const content = doc.content.toString();
    const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
    const matches = content.match(vinPattern);
    if (matches && matches.length > 0) {
      for (const match of matches) { if (this.validateVINChecksum(match)) return { vin: match, confidence: 95 }; }
      return { vin: matches[0], confidence: 70 };
    }
    return null;
  }

  private validateVINChecksum(vin: string): boolean {
    if (vin.length !== 17) return false;
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const transliteration: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9, 'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9 };
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const char = vin[i];
      const value = isNaN(parseInt(char)) ? transliteration[char] || 0 : parseInt(char);
      sum += value * weights[i];
    }
    const checkDigit = vin[8];
    const calculatedCheck = sum % 11;
    return (calculatedCheck === 10 && checkDigit === 'X') || (calculatedCheck.toString() === checkDigit);
  }

  private decodeVIN(vin: string): { year?: number; make?: string; model?: string } {
    if (vin.length !== 17) return {};
    const yearCode = vin[9];
    const year = this.decodeVINYear(yearCode);
    const wmi = vin.substring(0, 3);
    const make = this.decodeWMI(wmi);
    return { year, make };
  }

  private decodeVINYear(code: string): number {
    const yearCodes: Record<string, number> = { 'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030, '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009 };
    return yearCodes[code] || 0;
  }

  private decodeWMI(wmi: string): string {
    const wmiMap: Record<string, string> = { '1G1': 'Chevrolet', '1G6': 'Cadillac', '1FA': 'Ford', '1FT': 'Ford Truck', '2FA': 'Ford', '2G1': 'Chevrolet', '3FA': 'Ford', '4T1': 'Toyota', '5NP': 'Hyundai', 'JM1': 'Mazda', 'KM8': 'Hyundai', 'WBA': 'BMW', 'WDD': 'Mercedes-Benz', 'YV1': 'Volvo', 'ZFF': 'Ferrari' };
    return wmiMap[wmi] || 'Unknown';
  }

  private extractOdometer(doc: ExtractionDocument): { value: number; unit: 'miles' | 'kilometers' } | null {
    const content = doc.content.toString();
    const odometerPattern = /(\d{1,6})\s*(miles|mi|km|kilometers)/gi;
    const match = odometerPattern.exec(content);
    if (match) { return { value: parseInt(match[1]), unit: match[2].toLowerCase().startsWith('k') ? 'kilometers' : 'miles' }; }
    return null;
  }

  private extractLicensePlate(doc: ExtractionDocument): { number: string; state: string } | null {
    const content = doc.content.toString();
    const platePattern = /([A-Z]{2})\s*[:#]?\s*([A-Z0-9]{2,8})/gi;
    const match = platePattern.exec(content);
    if (match) { return { state: match[1], number: match[2] }; }
    return null;
  }

  private async extractDamageAssessment(documents: ExtractionDocument[], vehicleData: VehicleData): Promise<DamageAssessment> {
    const damageAreas: DamageArea[] = [];
    let estimatedRepairCost = 0;
    let laborHours = 0;
    const partsRequired: Part[] = [];
    let airbagDeployment = false;
    let structuralDamage = false;

    for (const doc of documents) {
      if (doc.type === 'estimate' || doc.type === 'repair_invoice') {
        const lineItems = this.extractLineItems(doc);
        for (const item of lineItems) {
          if (this.isLaborItem(item.description)) { laborHours += item.quantity; }
          else { partsRequired.push({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.total, category: this.categorizePart(item.description), availability: 'in_stock' }); }
          estimatedRepairCost += item.total;
          const area = this.identifyDamageArea(item.description);
          if (area && !damageAreas.some(da => da.location === area.location)) { damageAreas.push(area); }
        }
        if (doc.content.toString().toLowerCase().includes('airbag')) airbagDeployment = true;
        if (this.hasStructuralDamage(doc.content.toString())) structuralDamage = true;
      }
    }

    const damageSeverity = this.determineDamageSeverity(estimatedRepairCost, damageAreas.length, airbagDeployment, structuralDamage, vehicleData);
    return { damageAreas, estimatedRepairCost, laborHours, partsRequired, damageSeverity, airbagDeployment, structuralDamage };
  }

  private extractLineItems(doc: ExtractionDocument): LineItem[] {
    const items: LineItem[] = [];
    const content = doc.content.toString();
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/(.+?)\s+(\d+)\s+\$?([\d,]+\.?\d*)/);
      if (match) { const [, description, qty, price] = match; const quantity = parseInt(qty); const unitPrice = parseFloat(price.replace(/,/g, '')); items.push({ description: description.trim(), quantity, unitPrice, total: quantity * unitPrice }); }
    }
    return items;
  }

  private isLaborItem(description: string): boolean {
    const laborKeywords = ['labor', 'hour', 'hrs', 'work', 'service', 'install', 'remove'];
    return laborKeywords.some(keyword => description.toLowerCase().includes(keyword));
  }

  private categorizePart(description: string): 'OEM' | 'aftermarket' | 'used' | 'remanufactured' {
    const desc = description.toLowerCase();
    if (desc.includes('oem') || desc.includes('genuine')) return 'OEM';
    if (desc.includes('aftermarket') || desc.includes('replacement')) return 'aftermarket';
    if (desc.includes('used') || desc.includes('salvage')) return 'used';
    if (desc.includes('remanufactured') || desc.includes('rebuilt')) return 'remanufactured';
    return 'OEM';
  }

  private identifyDamageArea(description: string): DamageArea | null {
    const areaKeywords: Record<string, string[]> = {
      'Front Bumper': ['front', 'bumper', 'grille', 'hood'],
      'Rear Bumper': ['rear', 'back', 'tailgate', 'trunk'],
      'Front Left Fender': ['front', 'left', 'fender', 'quarter'],
      'Driver Door': ['driver', 'door', 'left', 'front'],
      'Passenger Door': ['passenger', 'door', 'right', 'front'],
      'Windshield': ['windshield', 'glass', 'front'],
      'Roof': ['roof', 'top'],
      'Undercarriage': ['undercarriage', 'frame', 'suspension']
    };
    const desc = description.toLowerCase();
    for (const [area, keywords] of Object.entries(areaKeywords)) {
      if (keywords.some(kw => desc.includes(kw))) {
        return { location: area, severity: 'moderate', description, estimatedCost: 0, requiresReplace: desc.includes('replace'), damageCode: this.generateDamageCode(area) };
      }
    }
    return null;
  }

  private generateDamageCode(area: string): string {
    const codes: Record<string, string> = { 'Front Bumper': 'FB01', 'Rear Bumper': 'RB01', 'Front Left Fender': 'FLF01', 'Driver Door': 'DD01', 'Passenger Door': 'PD01', 'Windshield': 'WS01', 'Roof': 'RF01', 'Undercarriage': 'UC01' };
    return codes[area] || 'OTH01';
  }

  private hasStructuralDamage(content: string): boolean {
    const keywords = ['frame', 'structural', 'unibody', 'pillar', 'rail', 'subframe'];
    return keywords.some(kw => content.toLowerCase().includes(kw));
  }

  private determineDamageSeverity(cost: number, areaCount: number, airbagDeployment: boolean, structuralDamage: boolean, vehicleData: VehicleData): 'minor' | 'moderate' | 'severe' | 'total_loss' {
    const estimatedACV = this.estimateACV(vehicleData);
    if (estimatedACV > 0 && cost / estimatedACV > 0.75) return 'total_loss';
    if (structuralDamage || airbagDeployment || cost > 15000) return 'severe';
    if (areaCount > 2 || cost > 5000) return 'moderate';
    return 'minor';
  }

  private estimateACV(vehicleData: VehicleData): number {
    if (!vehicleData.year) return 0;
    const currentYear = new Date().getFullYear();
    const age = currentYear - vehicleData.year;
    const baseValue = 30000;
    const depreciation = Math.pow(0.85, age);
    return Math.round(baseValue * depreciation);
  }

  private async extractMedicalData(documents: ExtractionDocument[]): Promise<MedicalData | undefined> {
    const medicalDocs = documents.filter(d => d.type === 'medical_bill');
    if (medicalDocs.length === 0) return undefined;
    const providers: MedicalProvider[] = [];
    const treatments: Treatment[] = [];
    const icdCodes: Set<string> = new Set();
    const cptCodes: Set<string> = new Set();
    let totalBilled = 0;
    const dateOfService: Date[] = [];

    for (const doc of medicalDocs) {
      const content = doc.content.toString();
      const cpts = this.extractCPTCodes(content);
      cpts.forEach(code => cptCodes.add(code));
      const icds = this.extractICDCodes(content);
      icds.forEach(code => icdCodes.add(code));
      const amount = this.extractBillAmount(content);
      if (amount) totalBilled += amount;
      const dos = this.extractDateOfService(content);
      if (dos) dateOfService.push(dos);
    }

    return { providers, treatments, icdCodes: Array.from(icdCodes), cptCodes: Array.from(cptCodes), totalBilled, dateOfService };
  }

  private extractCPTCodes(content: string): string[] {
    const cptPattern = /\b\d{5}\b/g;
    return content.match(cptPattern) || [];
  }

  private extractICDCodes(content: string): string[] {
    const icdPattern = /\b[A-TV-Z]\d{2}\.?\d{0,4}\b/g;
    return content.match(icdPattern) || [];
  }

  private extractBillAmount(content: string): number | null {
    const amountPattern = /(Total|Amount Due|Balance)[:\s]*\$?([\d,]+\.?\d{0,2})/i;
    const match = content.match(amountPattern);
    if (match) return parseFloat(match[2].replace(/,/g, ''));
    return null;
  }

  private extractDateOfService(content: string): Date | null {
    const datePattern = /Date of Service[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i;
    const match = content.match(datePattern);
    if (match) return new Date(match[1]);
    return null;
  }

  private async extractFinancialData(documents: ExtractionDocument[]): Promise<FinancialData> {
    const estimates: EstimateData[] = [];
    const invoices: InvoiceData[] = [];
    for (const doc of documents) {
      if (doc.type === 'estimate') {
        const estimate = this.parseEstimate(doc);
        if (estimate) estimates.push(estimate);
      } else if (doc.type === 'repair_invoice') {
        const invoice = this.parseInvoice(doc);
        if (invoice) invoices.push(invoice);
      }
    }
    const totalEstimated = estimates.reduce((sum, e) => sum + e.amount, 0);
    const totalActual = invoices.reduce((sum, i) => sum + i.amount, 0);
    return { estimates, invoices, totalEstimated, totalActual };
  }

  private parseEstimate(doc: ExtractionDocument): EstimateData | null {
    const items = this.extractLineItems(doc);
    if (items.length === 0) return null;
    const laborItems = items.filter(i => this.isLaborItem(i.description));
    const partsItems = items.filter(i => !this.isLaborItem(i.description));
    const laborCost = laborItems.reduce((sum, i) => sum + i.total, 0);
    const partsCost = partsItems.reduce((sum, i) => sum + i.total, 0);
    const amount = laborCost + partsCost;
    const taxAmount = amount * 0.08;
    return { source: doc.filename, date: new Date(), amount: amount + taxAmount, laborCost, partsCost, taxAmount, items };
  }

  private parseInvoice(doc: ExtractionDocument): InvoiceData | null {
    const content = doc.content.toString();
    const invoicePattern = /Invoice\s*#?\s*:?\s*(\d+)/i;
    const invoiceMatch = content.match(invoicePattern);
    if (!invoiceMatch) return null;
    const items = this.extractLineItems(doc);
    const amount = items.reduce((sum, i) => sum + i.total, 0);
    return { invoiceNumber: invoiceMatch[1], vendor: 'Repair Shop', date: new Date(), amount, items };
  }

  private calculateConfidenceScores(vehicleData: VehicleData, damageAssessment: DamageAssessment, medicalData: MedicalData | undefined, financialData: FinancialData): ConfidenceScores {
    let vehicleConfidence = 0;
    if (vehicleData.vin) vehicleConfidence += (vehicleData.vinConfidence || 0) * 0.4;
    if (vehicleData.year) vehicleConfidence += 20;
    if (vehicleData.make) vehicleConfidence += 20;
    if (vehicleData.odometer) vehicleConfidence += 20;

    let damageConfidence = 0;
    if (damageAssessment.estimatedRepairCost > 0) damageConfidence += 40;
    if (damageAssessment.damageAreas.length > 0) damageConfidence += 30;
    if (damageAssessment.partsRequired.length > 0) damageConfidence += 30;

    let medicalConfidence = medicalData ? 80 : 0;
    let financialConfidence = 0;
    if (financialData.estimates.length > 0) financialConfidence += 50;
    if (financialData.invoices.length > 0) financialConfidence += 50;

    const overall = Math.round((vehicleConfidence + damageConfidence + medicalConfidence + financialConfidence) / 4);
    return { overall, vehicleData: Math.round(vehicleConfidence), damageAssessment: Math.round(damageConfidence), medicalData: Math.round(medicalConfidence), financialData: Math.round(financialConfidence) };
  }

  private async performValidations(vehicleData: VehicleData, damageAssessment: DamageAssessment, financialData: FinancialData): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    if (vehicleData.vin) {
      results.push({ field: 'VIN', status: this.validateVINChecksum(vehicleData.vin) ? 'valid' : 'invalid', message: this.validateVINChecksum(vehicleData.vin) ? 'VIN checksum valid' : 'VIN checksum invalid', suggestion: this.validateVINChecksum(vehicleData.vin) ? undefined : 'Verify VIN with policyholder' });
    }
    if (vehicleData.year) {
      const currentYear = new Date().getFullYear();
      const yearValid = vehicleData.year >= 1900 && vehicleData.year <= currentYear + 1;
      results.push({ field: 'Vehicle Year', status: yearValid ? 'valid' : 'invalid', message: yearValid ? 'Vehicle year within valid range' : `Vehicle year ${vehicleData.year} outside valid range`, suggestion: yearValid ? undefined : 'Verify vehicle year with registration' });
    }
    const avgRepairCost = 5000;
    const costDeviation = Math.abs((damageAssessment.estimatedRepairCost - avgRepairCost) / avgRepairCost);
    results.push({ field: 'Repair Cost', status: costDeviation < 2 ? 'valid' : 'uncertain', message: costDeviation < 2 ? 'Repair cost within expected range' : `Repair cost ${costDeviation > 1 ? 'significantly' : 'moderately'} outside typical range`, suggestion: costDeviation >= 2 ? 'Review estimate for accuracy' : undefined });
    return results;
  }

  private async compareWithHistoricalData(vehicleData: VehicleData, damageAssessment: DamageAssessment, financialData: FinancialData): Promise<HistoricalComparison[]> {
    const comparisons: HistoricalComparison[] = [];
    const historicalAvgRepairCost = 5000;
    const historicalAvgLaborHours = 15;
    const historicalAvgPartsCount = 8;

    const costDeviation = ((damageAssessment.estimatedRepairCost - historicalAvgRepairCost) / historicalAvgRepairCost) * 100;
    comparisons.push({ metric: 'Repair Cost', currentValue: damageAssessment.estimatedRepairCost, historicalAverage: historicalAvgRepairCost, deviation: Math.round(costDeviation), flag: Math.abs(costDeviation) > 50 ? (costDeviation > 0 ? 'high' : 'low') : 'normal' });

    const laborDeviation = ((damageAssessment.laborHours - historicalAvgLaborHours) / historicalAvgLaborHours) * 100;
    comparisons.push({ metric: 'Labor Hours', currentValue: damageAssessment.laborHours, historicalAverage: historicalAvgLaborHours, deviation: Math.round(laborDeviation), flag: Math.abs(laborDeviation) > 30 ? (laborDeviation > 0 ? 'high' : 'low') : 'normal' });

    const partsDeviation = ((damageAssessment.partsRequired.length - historicalAvgPartsCount) / historicalAvgPartsCount) * 100;
    comparisons.push({ metric: 'Parts Count', currentValue: damageAssessment.partsRequired.length, historicalAverage: historicalAvgPartsCount, deviation: Math.round(partsDeviation), flag: Math.abs(partsDeviation) > 40 ? (partsDeviation > 0 ? 'high' : 'low') : 'normal' });

    return comparisons;
  }
}

export default DataExtractor;

