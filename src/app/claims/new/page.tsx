// src/app/claims/new/page.tsx
// New Claim Submission Page

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface ClaimFormData {
    policyNumber: string;
    lossDate: string;
    lossTime: string;
    lossLocation: string;
    lossDescription: string;
    claimType: string;
    vehicleVin: string;
    vehicleYear: string;
    vehicleMake: string;
    vehicleModel: string;
    damageDescription: string;
    policeReportNumber: string;
    injuriesReported: boolean;
    injuryDescription: string;
}

export default function NewClaimPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<ClaimFormData>({
        policyNumber: '',
        lossDate: '',
        lossTime: '',
        lossLocation: '',
        lossDescription: '',
        claimType: 'COLLISION',
        vehicleVin: '',
        vehicleYear: '',
        vehicleMake: '',
        vehicleModel: '',
        damageDescription: '',
        policeReportNumber: '',
        injuriesReported: false,
        injuryDescription: '',
    });

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/claims/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    policyNumber: formData.policyNumber,
                    lossDate: formData.lossDate,
                    lossTime: formData.lossTime,
                    lossLocation: formData.lossLocation,
                    lossDescription: formData.lossDescription,
                    claimType: formData.claimType,
                    vehicle: {
                        vin: formData.vehicleVin,
                        year: parseInt(formData.vehicleYear),
                        make: formData.vehicleMake,
                        model: formData.vehicleModel,
                    },
                    damageDescription: formData.damageDescription,
                    policeReportNumber: formData.policeReportNumber || undefined,
                    injuries: formData.injuriesReported
                        ? { description: formData.injuryDescription }
                        : undefined,
                }),
            });

            const result = await response.json();

            if (result.success) {
                router.push(`/claims/dashboard?submitted=${result.data.claimNumber}`);
            } else {
                alert(result.error || 'Failed to submit claim');
            }
        } catch (error) {
            console.error('Error submitting claim:', error);
            alert('An error occurred while submitting your claim');
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = () => setStep(s => Math.min(s + 1, 4));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Progress Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${step >= i
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-600'
                                        }`}
                                >
                                    {i}
                                </div>
                                {i < 4 && (
                                    <div
                                        className={`w-24 h-1 mx-2 ${step > i ? 'bg-blue-600' : 'bg-gray-200'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-gray-600">
                        <span>Policy Info</span>
                        <span>Incident</span>
                        <span>Vehicle</span>
                        <span>Review</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Step 1: Policy Information */}
                    {step === 1 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Policy Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Policy Number *
                                    </label>
                                    <input
                                        type="text"
                                        name="policyNumber"
                                        value={formData.policyNumber}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., POL-123456789"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date of Loss *
                                        </label>
                                        <input
                                            type="date"
                                            name="lossDate"
                                            value={formData.lossDate}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Time of Loss
                                        </label>
                                        <input
                                            type="time"
                                            name="lossTime"
                                            value={formData.lossTime}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Claim Type *
                                    </label>
                                    <select
                                        name="claimType"
                                        value={formData.claimType}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="COLLISION">Collision</option>
                                        <option value="COMPREHENSIVE">Comprehensive</option>
                                        <option value="LIABILITY">Liability</option>
                                        <option value="UNINSURED_MOTORIST">Uninsured Motorist</option>
                                        <option value="MEDICAL_PAYMENTS">Medical Payments</option>
                                    </select>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="button" onClick={nextStep}>
                                        Continue
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 2: Incident Details */}
                    {step === 2 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Incident Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Location of Incident *
                                    </label>
                                    <input
                                        type="text"
                                        name="lossLocation"
                                        value={formData.lossLocation}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Street address, city, state"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description of Incident *
                                    </label>
                                    <textarea
                                        name="lossDescription"
                                        value={formData.lossDescription}
                                        onChange={handleInputChange}
                                        required
                                        rows={4}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Please describe what happened..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Police Report Number (if applicable)
                                    </label>
                                    <input
                                        type="text"
                                        name="policeReportNumber"
                                        value={formData.policeReportNumber}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., PR-2024-12345"
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="injuriesReported"
                                        checked={formData.injuriesReported}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label className="text-sm text-gray-700">
                                        Were there any injuries?
                                    </label>
                                </div>

                                {formData.injuriesReported && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Describe Injuries
                                        </label>
                                        <textarea
                                            name="injuryDescription"
                                            value={formData.injuryDescription}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Describe any injuries that occurred..."
                                        />
                                    </div>
                                )}

                                <div className="flex justify-between pt-4">
                                    <Button type="button" variant="outline" onClick={prevStep}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={nextStep}>
                                        Continue
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 3: Vehicle Information */}
                    {step === 3 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Vehicle Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        VIN (Vehicle Identification Number) *
                                    </label>
                                    <input
                                        type="text"
                                        name="vehicleVin"
                                        value={formData.vehicleVin}
                                        onChange={handleInputChange}
                                        required
                                        maxLength={17}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                        placeholder="17-character VIN"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Year *
                                        </label>
                                        <input
                                            type="number"
                                            name="vehicleYear"
                                            value={formData.vehicleYear}
                                            onChange={handleInputChange}
                                            required
                                            min={1900}
                                            max={new Date().getFullYear() + 1}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Make *
                                        </label>
                                        <input
                                            type="text"
                                            name="vehicleMake"
                                            value={formData.vehicleMake}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="e.g., Toyota"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Model *
                                        </label>
                                        <input
                                            type="text"
                                            name="vehicleModel"
                                            value={formData.vehicleModel}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="e.g., Camry"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description of Damage
                                    </label>
                                    <textarea
                                        name="damageDescription"
                                        value={formData.damageDescription}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Describe the damage to your vehicle..."
                                    />
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button type="button" variant="outline" onClick={prevStep}>
                                        Back
                                    </Button>
                                    <Button type="button" onClick={nextStep}>
                                        Review Claim
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 4: Review & Submit */}
                    {step === 4 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Review Your Claim</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-medium text-gray-900 mb-2">Policy Information</h3>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <dt className="text-gray-500">Policy Number:</dt>
                                        <dd className="text-gray-900">{formData.policyNumber}</dd>
                                        <dt className="text-gray-500">Date of Loss:</dt>
                                        <dd className="text-gray-900">{formData.lossDate}</dd>
                                        <dt className="text-gray-500">Claim Type:</dt>
                                        <dd className="text-gray-900">{formData.claimType}</dd>
                                    </dl>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-medium text-gray-900 mb-2">Incident Details</h3>
                                    <dl className="grid grid-cols-1 gap-y-2 text-sm">
                                        <dt className="text-gray-500">Location:</dt>
                                        <dd className="text-gray-900">{formData.lossLocation}</dd>
                                        <dt className="text-gray-500">Description:</dt>
                                        <dd className="text-gray-900">{formData.lossDescription}</dd>
                                        {formData.injuriesReported && (
                                            <>
                                                <dt className="text-gray-500">Injuries:</dt>
                                                <dd className="text-gray-900">{formData.injuryDescription}</dd>
                                            </>
                                        )}
                                    </dl>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-medium text-gray-900 mb-2">Vehicle Information</h3>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <dt className="text-gray-500">VIN:</dt>
                                        <dd className="text-gray-900 font-mono">{formData.vehicleVin}</dd>
                                        <dt className="text-gray-500">Vehicle:</dt>
                                        <dd className="text-gray-900">
                                            {formData.vehicleYear} {formData.vehicleMake} {formData.vehicleModel}
                                        </dd>
                                    </dl>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-sm text-yellow-800">
                                        <strong>Important:</strong> By submitting this claim, you certify that all
                                        information provided is accurate and complete. Providing false information
                                        may result in denial of your claim and could constitute insurance fraud.
                                    </p>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button type="button" variant="outline" onClick={prevStep}>
                                        Back
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Submitting...' : 'Submit Claim'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </form>
            </div>
        </div>
    );
}

