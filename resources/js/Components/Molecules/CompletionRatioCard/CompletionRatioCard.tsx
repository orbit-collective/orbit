import { CompletionRatioCardProps } from '@/types/Components';
import { FC } from 'react';
import { VisualCard } from '../../Atoms/VisualCard/VisualCard';
import { VisualCardHeader } from '../VisualCardHeader/VisualCardHeader';

const tierFor = (closedPct: number) => {
    if (closedPct >= 75) {
        return { label: 'Excellent', colorClass: 'bg-[var(--success-color)]' };
    }

    if (closedPct >= 40) {
        return { label: 'On track', colorClass: 'bg-[var(--accent-color)]' };
    }

    return {
        label: 'Needs attention',
        colorClass: 'bg-[var(--warning-color)]',
    };
};

export const CompletionRatioCard: FC<CompletionRatioCardProps> = ({
    open,
    inProgress,
    closed,
    total,
    closedPct,
}) => {
    const bars = [
        { label: 'Open', value: open, colorClass: 'bg-[var(--info-color)]' },
        {
            label: 'In Progress',
            value: inProgress,
            colorClass: 'bg-[var(--accent-color)]',
        },
        {
            label: 'Closed',
            value: closed,
            colorClass: 'bg-[var(--success-color)]',
        },
    ];
    const maxValue = Math.max(1, open, inProgress, closed);
    const tier = tierFor(closedPct);

    return (
        <VisualCard>
            <div>
                <div className="flex items-start justify-between gap-2">
                    <VisualCardHeader
                        title="Completion Ratio"
                        description="Resolution status of all logged tasks"
                    />
                    {total > 0 && (
                        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${tier.colorClass}`}
                            />
                            <span className="text-xs font-medium text-[var(--text-gray-color)]">
                                {tier.label}
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-6xl font-bold tabular-nums leading-none tracking-tight text-[var(--text-color)]">
                            {closedPct}%
                        </span>
                        <span className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted-color)]">
                            Resolved
                        </span>
                        <span className="mt-1 text-xs text-[var(--text-gray-color)]">
                            {closed} of {total} issues
                        </span>
                    </div>

                    <div className="flex h-32 items-end gap-5 border-l border-solid border-[var(--border-color-strong)] pl-8">
                        {bars.map((bar) => (
                            <div
                                key={bar.label}
                                className="flex flex-col items-center gap-2"
                            >
                                <span className="text-xs font-semibold tabular-nums text-[var(--text-color)]">
                                    {bar.value}
                                </span>
                                <div className="flex h-20 w-7 items-end rounded-md bg-[var(--bg-light-color)]">
                                    <div
                                        className={`w-full rounded-t-md transition-all duration-500 ease-out ${bar.colorClass}`}
                                        style={{
                                            height: `${(bar.value / maxValue) * 100}%`,
                                        }}
                                        title={`${bar.label}: ${bar.value}`}
                                    />
                                </div>
                                <span className="whitespace-nowrap text-[10px] font-medium text-[var(--text-muted-color)]">
                                    {bar.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </VisualCard>
    );
};
