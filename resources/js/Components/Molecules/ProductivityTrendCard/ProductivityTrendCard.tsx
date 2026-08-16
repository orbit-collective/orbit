import { ProductivityTrendCardProps } from '@/types/Components';
import { FC } from 'react';
import { VisualCard } from '../../Atoms/VisualCard/VisualCard';
import { VisualCardHeader } from '../VisualCardHeader/VisualCardHeader';

export const ProductivityTrendCard: FC<ProductivityTrendCardProps> = ({
    trendData,
    className = '',
}) => {
    const currentDay = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
    });
    const maxCount = Math.max(...trendData.map((d) => d.count), 1);

    return (
        <VisualCard className={className}>
            <VisualCardHeader
                title="Productivity Trend"
                description="Daily issue updates and fixes from this week"
            />
            <div className="flex h-28 items-end justify-between gap-1.5 px-1 pt-4 sm:gap-2 sm:px-2">
                {trendData.map((day, idx) => {
                    const isActive = day.day === currentDay;
                    const heightPct = Math.round((day.count / maxCount) * 100);

                    return (
                        <div
                            key={idx}
                            className="group flex h-full flex-1 flex-col items-center justify-end"
                        >
                            <div className="relative flex h-20 w-full flex-col items-center justify-end">
                                <span className="absolute -top-7 z-20 scale-0 whitespace-nowrap rounded border border-solid border-[var(--border-color-strong)] bg-[var(--surface-color)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--text-color)] transition-all group-hover:scale-100">
                                    {day.count}
                                </span>
                                <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full max-w-[16px] rounded-t-sm transition-all duration-500 ${
                                        isActive
                                            ? 'bg-gradient-to-t from-[var(--accent-color)] to-[var(--accent-light-color)] shadow-[0_0_10px_rgba(136,68,218,0.3)]'
                                            : 'bg-[var(--bg-light-color)] group-hover:bg-[var(--bg-light-color-hover)]'
                                    }`}
                                />
                            </div>
                            <span className="mt-2 text-[10px] font-semibold text-[var(--text-muted-color)]">
                                {day.day}
                            </span>
                        </div>
                    );
                })}
            </div>
        </VisualCard>
    );
};
