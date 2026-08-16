import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { PriorityBreakdownCardProps, PriorityItem } from '@/types/Components';
import { FC } from 'react';
import { VisualCard } from '../../Atoms/VisualCard/VisualCard';
import { VisualCardHeader } from '../VisualCardHeader/VisualCardHeader';

export const PriorityBreakdownCard: FC<PriorityBreakdownCardProps> = ({
    high,
    medium,
    low,
    highPct,
    mediumPct,
    lowPct,
}) => {
    const items: PriorityItem[] = [
        { label: 'High Priority', status: 'high', count: high, pct: highPct },
        {
            label: 'Medium Priority',
            status: 'medium',
            count: medium,
            pct: mediumPct,
        },
        { label: 'Low Priority', status: 'low', count: low, pct: lowPct },
    ];

    return (
        <VisualCard>
            <VisualCardHeader
                title="Priority Breakdown"
                description="Issues distribution by level of urgency"
            />
            <div className="flex flex-1 flex-col justify-center py-4">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--bg-light-color)]">
                    <div
                        style={{ width: `${highPct}%` }}
                        className="h-full bg-[var(--error-color)] transition-all"
                        title={`High: ${highPct}%`}
                    />
                    <div
                        style={{ width: `${mediumPct}%` }}
                        className="h-full bg-[var(--warning-color)] transition-all"
                        title={`Medium: ${mediumPct}%`}
                    />
                    <div
                        style={{ width: `${lowPct}%` }}
                        className="h-full bg-[var(--success-color)] transition-all"
                        title={`Low: ${lowPct}%`}
                    />
                </div>
                <div className="mt-5 flex flex-col gap-2.5">
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between text-xs"
                        >
                            <div className="flex items-center gap-2">
                                <StatusDot status={item.status} size={'md'} />
                                <span className="font-medium text-[var(--text-color)]">
                                    {item.label}
                                </span>
                            </div>
                            <span className="font-semibold text-[var(--text-color)]">
                                {item.count}{' '}
                                <span className="font-medium text-[var(--text-muted-color)]">
                                    ({item.pct}%)
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </VisualCard>
    );
};
