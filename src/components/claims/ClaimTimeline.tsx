// src/components/claims/ClaimTimeline.tsx
// Claim Timeline Component

'use client';

interface TimelineEvent {
    id: string;
    action: string;
    description: string;
    timestamp: string;
    agent?: string;
}

interface ClaimTimelineProps {
    events: TimelineEvent[];
}

export function ClaimTimeline({ events }: ClaimTimelineProps) {
    const getEventIcon = (action: string) => {
        const icons: Record<string, { icon: string; color: string }> = {
            CLAIM_SUBMITTED: { icon: '📝', color: 'bg-blue-500' },
            CLAIM_RECEIVED: { icon: '📥', color: 'bg-blue-400' },
            CLAIM_ACKNOWLEDGED: { icon: '✓', color: 'bg-green-400' },
            DOCUMENTS_UPLOADED: { icon: '📎', color: 'bg-purple-400' },
            FRAUD_CHECK_COMPLETED: { icon: '🔍', color: 'bg-yellow-500' },
            COVERAGE_VERIFIED: { icon: '📋', color: 'bg-indigo-400' },
            DAMAGE_ASSESSED: { icon: '🔧', color: 'bg-orange-400' },
            SETTLEMENT_DRAFTED: { icon: '💰', color: 'bg-green-500' },
            CLAIM_APPROVED: { icon: '✅', color: 'bg-green-600' },
            CLAIM_REJECTED: { icon: '❌', color: 'bg-red-500' },
            PAYMENT_ISSUED: { icon: '💵', color: 'bg-emerald-500' },
            CLAIM_CLOSED: { icon: '📁', color: 'bg-gray-500' },
            ESCALATION: { icon: '⚠️', color: 'bg-amber-500' },
            DEFAULT: { icon: '📌', color: 'bg-gray-400' },
        };
        return icons[action] || icons.DEFAULT;
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffHours / 24;

        if (diffHours < 1) {
            const diffMins = Math.round(diffMs / (1000 * 60));
            return `${diffMins} minutes ago`;
        } else if (diffHours < 24) {
            return `${Math.round(diffHours)} hours ago`;
        } else if (diffDays < 7) {
            return `${Math.round(diffDays)} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            });
        }
    };

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {events.map((event, eventIdx) => {
                    const { icon, color } = getEventIcon(event.action);
                    const isLast = eventIdx === events.length - 1;

                    return (
                        <li key={event.id}>
                            <div className="relative pb-8">
                                {!isLast && (
                                    <span
                                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                                        aria-hidden="true"
                                    />
                                )}
                                <div className="relative flex space-x-3">
                                    <div>
                                        <span
                                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${color}`}
                                        >
                                            <span className="text-sm">{icon}</span>
                                        </span>
                                    </div>
                                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {event.action.replace(/_/g, ' ')}
                                            </p>
                                            {event.description && (
                                                <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
                                            )}
                                            {event.agent && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    by {event.agent}
                                                </p>
                                            )}
                                        </div>
                                        <div className="whitespace-nowrap text-right text-xs text-gray-500">
                                            {formatTimestamp(event.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

