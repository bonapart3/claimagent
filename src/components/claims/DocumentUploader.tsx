// src/components/claims/DocumentUploader.tsx
// Document Upload Component

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface DocumentUploaderProps {
    claimId: string;
    onUploadComplete?: (documents: UploadedDocument[]) => void;
}

interface UploadedDocument {
    id: string;
    fileName: string;
    type: string;
    size: number;
    url: string;
}

const DOCUMENT_TYPES = [
    { value: 'DAMAGE_PHOTO', label: 'Damage Photos' },
    { value: 'POLICE_REPORT', label: 'Police Report' },
    { value: 'REPAIR_ESTIMATE', label: 'Repair Estimate' },
    { value: 'MEDICAL_BILL', label: 'Medical Bill' },
    { value: 'REGISTRATION', label: 'Vehicle Registration' },
    { value: 'DRIVERS_LICENSE', label: "Driver's License" },
    { value: 'INSURANCE_CARD', label: 'Insurance Card' },
    { value: 'OTHER', label: 'Other Document' },
];

export function DocumentUploader({ claimId, onUploadComplete }: DocumentUploaderProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [documentType, setDocumentType] = useState('DAMAGE_PHOTO');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(prev => [...prev, ...droppedFiles]);
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const uploadedDocs: UploadedDocument[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', documentType);
                formData.append('claimId', claimId);

                const response = await fetch(`/api/claims/${claimId}/documents`, {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (result.success) {
                    uploadedDocs.push(result.data);
                }

                setUploadProgress(((i + 1) / files.length) * 100);
            }

            setFiles([]);
            setUploadProgress(0);
            onUploadComplete?.(uploadedDocs);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload documents');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Document Type Selector */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Document Type
                    </label>
                    <select
                        value={documentType}
                        onChange={e => setDocumentType(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {DOCUMENT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Drop Zone */}
                <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        multiple
                        onChange={handleFileInput}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*,.pdf,.doc,.docx"
                    />
                    <div className="space-y-2">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                        >
                            <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <div className="text-gray-600">
                            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                    </div>
                </div>

                {/* Selected Files List */}
                {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">
                            Selected Files ({files.length})
                        </h4>
                        {files.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        {file.type.startsWith('image/') ? (
                                            <span className="text-blue-600">🖼️</span>
                                        ) : (
                                            <span className="text-blue-600">📄</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Uploading...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Upload Button */}
                <div className="mt-4 flex justify-end">
                    <Button
                        onClick={handleUpload}
                        disabled={files.length === 0 || isUploading}
                    >
                        {isUploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

