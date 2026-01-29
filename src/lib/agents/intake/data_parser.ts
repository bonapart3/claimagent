/**
 * ClaimAgent™ - Data Parser Agent (Agent A1)
 * 
 * Parses and normalizes FNOL data from multiple sources:
 * - Phone transcripts
 * - Web forms
 * - Mobile app submissions
 * - Email reports
 * - Telematics data
 * 
 * @module agents/intake/dataParser
 */

import { OCRProcessor } from '../../services/ocrProcessor';
import { TelematicsIntegration } from '../../services/telematicsIntegration';
import type { Claim, ParsedClaimData, Vehicle, Location, Participant } from '../../types/claim';

export class DataParser {
    private ocrProcessor: OCRProcessor;
    private telematicsService: TelematicsIntegration;

    constructor() {
        this.ocrProcessor = new OCRProcessor();
        this.telematicsService = new TelematicsIntegration();
    }

    /**
     * Main parsing method - orchestrates all parsing operations
     */
    static async parseFNOL(claim: any): Promise<ParsedClaimData> {
        const parser = new DataParser();

        console.log(`[AGENT A1: DataParser] Parsing FNOL for claim ${claim.id}`);

        try {
            // Extract basic claim information
            const basicInfo = parser.extractBasicInformation(claim);

            // Parse location data
            const location = parser.parseLocation(claim);

            // Parse vehicle information
            const vehicles = await parser.parseVehicles(claim);

            // Parse participants
            const participants = parser.parseParticipants(claim);

            // Extract incident details
            const incident = parser.parseIncidentDetails(claim);

            // Parse documents (OCR if needed)
            const documents = await parser.parseDocuments(claim.documents);

            // Get telematics data if available
            const telematics = await parser.fetchTelematicsData(claim, vehicles);

            // Normalize and validate all data
            const parsedData: ParsedClaimData = {
                claimId: claim.id,
                policyNumber: basicInfo.policyNumber,
                policyholderId: basicInfo.policyholderId,
                reportedDate: basicInfo.reportedDate,
                lossDate: basicInfo.lossDate,
                lossTime: basicInfo.lossTime,
                lossLocation: location,
                vehicles,
                participants,
                incident,
                documents,
                rawData: { telematics, source: claim.source || 'UNKNOWN' },
                confidence: parser.calculateConfidence({
                    basicInfo,
                    location,
                    vehicles,
                    participants,
                    incident,
                    documents
                })
            };

            // Store additional data that doesn't fit the interface
            if (parsedData.rawData) {
                parsedData.rawData.missingData = parser.identifyMissingData({
                    basicInfo,
                    location,
                    vehicles,
                    participants,
                    incident
                });
            }

            console.log(`[AGENT A1: DataParser] ✓ Parsed FNOL successfully with ${parsedData.confidence}% confidence`);

            return parsedData;

        } catch (error) {
            console.error(`[AGENT A1: DataParser] ✗ Error parsing FNOL:`, error);
            throw new Error(`Failed to parse FNOL: ${(error as Error).message}`);
        }
    }

    /**
     * Extract basic claim information
     */
    private extractBasicInformation(claim: any): {
        policyNumber: string;
        policyholderId: string;
        reportedDate: Date;
        lossDate: Date;
        lossTime: string | undefined;
    } {
        return {
            policyNumber: claim.policyNumber || claim.policy?.number,
            policyholderId: claim.policyholderId,
            reportedDate: new Date(claim.createdAt),
            lossDate: new Date(claim.lossDate),
            lossTime: claim.lossTime || undefined
        };
    }

    /**
     * Parse location data with geocoding
     */
    private parseLocation(claim: any): Location {
        const locationData = claim.lossLocation || {};

        return {
            address: locationData.address || claim.lossAddress,
            city: locationData.city || claim.lossCity,
            state: locationData.state || claim.lossState,
            zipCode: locationData.zipCode || claim.lossZipCode,
            county: locationData.county,
            latitude: locationData.latitude || claim.latitude,
            longitude: locationData.longitude || claim.longitude,
            locationType: this.determineLocationType(locationData),
            weatherConditions: claim.weatherConditions,
            roadConditions: claim.roadConditions,
            lightingConditions: claim.lightingConditions
        };
    }

    /**
     * Determine type of location (residential, commercial, highway, etc.)
     */
    private determineLocationType(locationData: any): string {
        // Logic to determine location type based on address components
        if (locationData.locationType) return locationData.locationType;

        const address = (locationData.address || '').toLowerCase();

        if (address.includes('parking lot') || address.includes('parking garage')) {
            return 'PARKING_LOT';
        } else if (address.match(/i-\d+|interstate|highway|freeway/)) {
            return 'HIGHWAY';
        } else if (address.includes('intersection')) {
            return 'INTERSECTION';
        } else {
            return 'STREET';
        }
    }

    /**
     * Parse all vehicles involved
     */
    private async parseVehicles(claim: any): Promise<Vehicle[]> {
        const vehicles: Vehicle[] = [];

        // Insured vehicle
        if (claim.vehicle) {
            vehicles.push({
                id: claim.vehicle.id,
                vin: claim.vehicle.vin,
                year: claim.vehicle.year,
                make: claim.vehicle.make,
                model: claim.vehicle.model,
                trim: claim.vehicle.trim,
                color: claim.vehicle.color,
                licensePlate: claim.vehicle.licensePlate,
                state: claim.vehicle.registrationState,
                totalLoss: false,
                isInsured: true,
                role: 'INSURED',
                ownerName: claim.policyholder?.name,
                mileage: claim.vehicle.mileage,
                condition: claim.vehicle.condition,
                priorDamage: claim.vehicle.priorDamage,
                hasADAS: this.checkForADAS(claim.vehicle)
            });
        }

        // Third-party vehicles
        if (claim.otherVehicles && Array.isArray(claim.otherVehicles)) {
            for (const otherVehicle of claim.otherVehicles) {
                vehicles.push({
                    id: otherVehicle.id || `third-party-${vehicles.length}`,
                    vin: otherVehicle.vin,
                    year: otherVehicle.year,
                    make: otherVehicle.make,
                    model: otherVehicle.model,
                    trim: otherVehicle.trim,
                    color: otherVehicle.color,
                    licensePlate: otherVehicle.licensePlate,
                    state: otherVehicle.state,
                    totalLoss: false,
                    isInsured: false,
                    role: 'THIRD_PARTY',
                    ownerName: otherVehicle.ownerName,
                    insuranceInfo: otherVehicle.insuranceInfo,
                    hasADAS: this.checkForADAS(otherVehicle)
                });
            }
        }

        return vehicles;
    }

    /**
     * Check if vehicle has Advanced Driver Assistance Systems
     */
    private checkForADAS(vehicle: any): boolean {
        if (vehicle.hasADAS !== undefined) return vehicle.hasADAS;

        // Heuristic: vehicles 2015+ likely have ADAS
        if (vehicle.year >= 2015) return true;

        // Check for specific features
        const adasFeatures = [
            'adaptive cruise control',
            'lane departure',
            'blind spot',
            'collision warning',
            'parking sensors',
            'backup camera'
        ];

        const features = (vehicle.features || '').toLowerCase();
        return adasFeatures.some(feature => features.includes(feature));
    }

    /**
     * Parse all participants (drivers, passengers, witnesses, police)
     */
    private parseParticipants(claim: any): Participant[] {
        const participants: Participant[] = [];

        // Policyholder/insured driver
        if (claim.policyholder) {
            participants.push({
                id: claim.policyholder.id,
                role: 'INSURED_DRIVER',
                name: claim.policyholder.name,
                contactInfo: {
                    phone: claim.policyholder.phone,
                    email: claim.policyholder.email,
                    address: claim.policyholder.address
                },
                licenseNumber: claim.policyholder.driversLicense,
                licenseState: claim.policyholder.licenseState,
                dateOfBirth: claim.policyholder.dateOfBirth,
                injuries: claim.insuredInjuries || []
            });
        }

        // Other drivers
        if (claim.otherDrivers && Array.isArray(claim.otherDrivers)) {
            claim.otherDrivers.forEach((driver: any, index: number) => {
                participants.push({
                    id: driver.id || `other-driver-${index}`,
                    role: 'OTHER_DRIVER',
                    name: driver.name,
                    contactInfo: {
                        phone: driver.phone,
                        email: driver.email,
                        address: driver.address
                    },
                    licenseNumber: driver.licenseNumber,
                    licenseState: driver.licenseState,
                    injuries: driver.injuries || []
                });
            });
        }

        // Passengers
        if (claim.passengers && Array.isArray(claim.passengers)) {
            claim.passengers.forEach((passenger: any, index: number) => {
                participants.push({
                    id: passenger.id || `passenger-${index}`,
                    role: 'PASSENGER',
                    name: passenger.name,
                    contactInfo: {
                        phone: passenger.phone,
                        email: passenger.email
                    },
                    injuries: passenger.injuries || [],
                    relationship: passenger.relationship
                });
            });
        }

        // Witnesses
        if (claim.witnesses && Array.isArray(claim.witnesses)) {
            claim.witnesses.forEach((witness: any, index: number) => {
                participants.push({
                    id: witness.id || `witness-${index}`,
                    role: 'WITNESS',
                    name: witness.name,
                    contactInfo: {
                        phone: witness.phone,
                        email: witness.email
                    },
                    statement: witness.statement
                });
            });
        }

        // Police officer
        if (claim.policeReportFiled) {
            participants.push({
                id: 'police-report',
                role: 'POLICE',
                name: claim.officerName,
                contactInfo: {
                    phone: claim.policeDepartmentPhone
                },
                badgeNumber: claim.badgeNumber,
                department: claim.policeDepartment,
                reportNumber: claim.policeReportNumber
            });
        }

        return participants;
    }

    /**
     * Parse incident details
     */
    private parseIncidentDetails(claim: any): any {
        return {
            type: claim.incidentType || this.classifyIncidentType(claim),
            description: claim.description,
            narrative: claim.narrative,
            insuredStatement: claim.insuredStatement,
            causeOfLoss: claim.causeOfLoss,
            atFault: claim.atFault,
            faultPercentage: claim.faultPercentage,
            impactPoints: claim.impactPoints || [],
            speedAtImpact: claim.speedAtImpact,
            airbagDeployment: claim.airbagDeployment,
            vehicleDrivable: claim.vehicleDrivable,
            vehicleTowed: claim.vehicleTowed,
            towDestination: claim.towDestination,
            estimatedDamage: claim.estimatedDamage,
            policeReportFiled: claim.policeReportFiled,
            policeReportNumber: claim.policeReportNumber,
            citationIssued: claim.citationIssued,
            citationDetails: claim.citationDetails
        };
    }

    /**
     * Classify incident type based on description
     */
    private classifyIncidentType(claim: any): string {
        const description = (claim.description || '').toLowerCase();

        if (description.includes('rear-end') || description.includes('rear end')) {
            return 'REAR_END_COLLISION';
        } else if (description.includes('side swipe') || description.includes('sideswipe')) {
            return 'SIDESWIPE';
        } else if (description.includes('intersection')) {
            return 'INTERSECTION_COLLISION';
        } else if (description.includes('parking')) {
            return 'PARKING_LOT';
        } else if (description.includes('theft') || description.includes('stolen')) {
            return 'THEFT';
        } else if (description.includes('vandal')) {
            return 'VANDALISM';
        } else if (description.includes('hail') || description.includes('wind') || description.includes('weather')) {
            return 'WEATHER';
        } else if (description.includes('hit and run')) {
            return 'HIT_AND_RUN';
        } else {
            return 'OTHER';
        }
    }

    /**
     * Parse and OCR documents
     */
    private async parseDocuments(documents: any[]): Promise<any[]> {
        if (!documents || documents.length === 0) return [];

        const parsedDocs = [];

        for (const doc of documents) {
            try {
                let extracted = null;

                // Perform OCR if document is an image
                if (doc.type === 'IMAGE' && (doc.mimeType?.startsWith('image/') || doc.url?.match(/\.(jpg|jpeg|png|gif)$/i))) {
                    extracted = await this.ocrProcessor.processImage(doc.url);
                }

                parsedDocs.push({
                    id: doc.id,
                    type: doc.type,
                    url: doc.url,
                    filename: doc.filename,
                    uploadedAt: doc.uploadedAt,
                    extractedText: extracted?.text,
                    extractedData: extracted?.structuredData,
                    confidence: extracted?.confidence
                });
            } catch (error) {
                console.error(`[AGENT A1: DataParser] Error processing document ${doc.id}:`, error);
                parsedDocs.push({
                    id: doc.id,
                    type: doc.type,
                    url: doc.url,
                    filename: doc.filename,
                    uploadedAt: doc.uploadedAt,
                    error: (error as Error).message
                });
            }
        }

        return parsedDocs;
    }

    /**
     * Fetch telematics data if available
     */
    private async fetchTelematicsData(claim: any, vehicles: Vehicle[]): Promise<any | null> {
        try {
            const insuredVehicle = vehicles.find(v => v.isInsured);
            if (!insuredVehicle || !insuredVehicle.vin) return null;

            const telematicsData = await this.telematicsService.fetchData(
                insuredVehicle.vin,
                new Date(claim.lossDate)
            );

            return telematicsData;
        } catch (error) {
            console.warn('[AGENT A1: DataParser] Unable to fetch telematics data:', error);
            return null;
        }
    }

    /**
     * Calculate confidence score for parsed data
     */
    private calculateConfidence(data: any): number {
        let score = 0;
        let maxScore = 0;

        // Basic info (30 points)
        maxScore += 30;
        if (data.basicInfo.policyNumber) score += 10;
        if (data.basicInfo.lossDate) score += 10;
        if (data.basicInfo.lossTime) score += 10;

        // Location (20 points)
        maxScore += 20;
        if (data.location.address) score += 5;
        if (data.location.city) score += 5;
        if (data.location.state) score += 5;
        if (data.location.latitude && data.location.longitude) score += 5;

        // Vehicles (25 points)
        maxScore += 25;
        if (data.vehicles.length > 0) {
            score += 10;
            if (data.vehicles[0].vin) score += 10;
            if (data.vehicles[0].year && data.vehicles[0].make && data.vehicles[0].model) score += 5;
        }

        // Participants (15 points)
        maxScore += 15;
        if (data.participants.length > 0) score += 10;
        if (data.participants.some((p: any) => p.role === 'POLICE')) score += 5;

        // Incident details (10 points)
        maxScore += 10;
        if (data.incident.description) score += 5;
        if (data.incident.type) score += 5;

        return Math.round((score / maxScore) * 100);
    }

    /**
     * Identify missing critical data
     */
    private identifyMissingData(data: any): string[] {
        const missing: string[] = [];

        if (!data.basicInfo.policyNumber) missing.push('Policy Number');
        if (!data.basicInfo.lossDate) missing.push('Loss Date');
        if (!data.location.state) missing.push('Loss State');
        if (data.vehicles.length === 0) missing.push('Vehicle Information');
        if (!data.incident.description) missing.push('Incident Description');

        return missing;
    }
}

export default DataParser;