import Icon from '@/Components/Atoms/Icon/Icon';
import { ProductivityTrendCardProps } from '@/types/Components';
import { FC } from 'react';
import { VisualCard } from '../../Atoms/VisualCard/VisualCard';
import { VisualCardHeader } from '../VisualCardHeader/VisualCardHeader';

const getNiceTicks = (maxValue: number, tickCount = 4): number[] => {
    if (maxValue <= 0) {
        return [0];
    }

    const rawStep = maxValue / tickCount;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;

    let niceResidual = 1;
    if (residual > 5) {
        niceResidual = 10;
    } else if (residual > 2) {
        niceResidual = 5;
    } else if (residual > 1) {
        niceResidual = 2;
    }

    const step = Math.max(1, Math.round(niceResidual * magnitude));
    const niceMax = Math.ceil(maxValue / step) * step;

    const ticks: number[] = [];
    for (let tick = niceMax; tick >= 0; tick -= step) {
        ticks.push(tick);
    }

    return ticks;
};

export const ProductivityTrendCard: FC<ProductivityTrendCardProps> = ({
    trendData,
    className = '',
}) => {
    const currentDay = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
    });
    const maxCount = Math.max(...trendData.map((d) => d.count), 0);
    const hasActivity = maxCount > 0;
    const ticks = getNiceTicks(maxCount);
    const axisMax = ticks[0];

    return (
        <VisualCard className={className}>
            <VisualCardHeader
                title="Productivity Trend"
                description="Daily issue updates and fixes from this week"
            />

            {hasActivity ? (
                <div className="mt-6 flex flex-1 flex-col">
                    <div className="flex flex-1 gap-3">
                        <div className="flex w-6 shrink-0 flex-col justify-between text-right text-[10px] font-medium tabular-nums text-[var(--text-muted-color)]">
                            {ticks.map((tick) => (
                                <span key={tick}>{tick}</span>
                            ))}
                        </div>

                        <div className="relative flex-1">
                            <div className="absolute inset-0 flex flex-col justify-between">
                                {ticks.map((tick) => (
                                    <div
                                        key={tick}
                                        className="border-t border-dashed border-[var(--border-color)]"
                                    />
                                ))}
                            </div>

                            <div className="relative flex h-full items-end justify-between gap-1.5 px-1 sm:gap-2 sm:px-2">
                                {trendData.map((day, idx) => {
                                    const isActive = day.day === currentDay;
                                    const isZero = day.count === 0;
                                    const heightPct = Math.round(
                                        (day.count / axisMax) * 100,
                                    );

                                    return (
                                        <div
                                            key={idx}
                                            className="group flex h-full flex-1 flex-col items-center justify-end"
                                        >
                                            <div className="flex h-full w-full flex-col items-center justify-end">
                                                <div
                                                    className="relative flex w-full justify-center transition-all duration-500"
                                                    style={{
                                                        height: isZero
                                                            ? '10px'
                                                            : `${heightPct}%`,
                                                    }}
                                                >
                                                    <span className="absolute -top-7 z-20 scale-0 whitespace-nowrap rounded border border-solid border-[var(--border-color-strong)] bg-[var(--surface-color)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--text-color)] transition-all group-hover:scale-100">
                                                        {day.count}
                                                    </span>
                                                    {isZero ? (
                                                        <div className="h-full w-full max-w-[16px] rounded-t-sm border border-dashed border-[var(--border-color-strong)] bg-[var(--bg-light-color)] transition-colors group-hover:border-[var(--text-muted-color)]" />
                                                    ) : (
                                                        <div
                                                            className={`h-full w-full max-w-[16px] rounded-t-sm transition-colors ${
                                                                isActive
                                                                    ? 'bg-[var(--accent-color)]'
                                                                    : 'bg-[var(--bg-light-color)] group-hover:bg-[var(--bg-light-color-hover)]'
                                                            }`}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 flex gap-3">
                        <div className="w-6 shrink-0" />
                        <div className="flex flex-1 justify-between gap-1.5 px-1 sm:gap-2 sm:px-2">
                            {trendData.map((day, idx) => (
                                <span
                                    key={idx}
                                    className="flex-1 text-center text-[10px] font-semibold text-[var(--text-muted-color)]"
                                >
                                    {day.day}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-light-color)] text-[var(--text-muted-color)]">
                        <Icon name="Activity" size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-[var(--text-color)]">
                            No activity yet this week
                        </p>
                        <p className="mt-1 max-w-[220px] text-xs text-[var(--text-muted-color)]">
                            Issue updates and fixes will show up here as your
                            team gets to work.
                        </p>
                    </div>
                </div>
            )}
        </VisualCard>
    );
};
