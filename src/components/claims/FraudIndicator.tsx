// src/components/claims/FraudIndicator.tsx
// Fraud Risk Indicator Component

'use client';

interface FraudIndicatorProps {
    score: number; // 0 to 1
    flags?: string[];
    showDetails?: boolean;
}

export function FraudIndicator({ score, flags = [], showDetails = false }: FraudIndicatorProps) {
    const percentage = Math.round(score * 100);

    const getRiskLevel = () => {
        if (percentage >= 80) return { level: 'CRITICAL', color: 'text-red-700', bg: 'bg-red-100' };
        if (percentage >= 60) return { level: 'HIGH', color: 'text-orange-700', bg: 'bg-orange-100' };
        if (percentage >= 40) return { level: 'MEDIUM', color: 'text-yellow-700', bg: 'bg-yellow-100' };
        if (percentage >= 20) return { level: 'LOW', color: 'text-blue-700', bg: 'bg-blue-100' };
        return { level: 'MINIMAL', color: 'text-green-700', bg: 'bg-green-100' };
    };

    const getProgressColor = () => {
        if (percentage >= 80) return 'bg-red-500';
        if (percentage >= 60) return 'bg-orange-500';
        if (percentage >= 40) return 'bg-yellow-500';
        if (percentage >= 20) return 'bg-blue-500';
        return 'bg-green-500';
    };

    const { level, color, bg } = getRiskLevel();

    return (
        <div className={`rounded-lg p-4 ${bg}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🔍</span>
                    <span className={`font-medium ${color}`}>Fraud Risk: {level}</span>
                </div>
                <span className={`text-xl font-bold ${color}`}>{percentage}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/50 rounded-full h-2 mb-2">
                <div
                    className={`h-2 rounded-full transition-all ${getProgressColor()}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {/* Risk Flags */}
            {showDetails && flags.length > 0 && (
                <div className="mt-3 space-y-1">
                    <p className={`text-xs font-medium ${color}`}>Risk Factors:</p>
                    <ul className="space-y-1">
                        {flags.map((flag, index) => (
                            <li key={index} className={`text-xs ${color} flex items-start gap-1`}>
                                <span>⚠️</span>
                                <span>{flag}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

