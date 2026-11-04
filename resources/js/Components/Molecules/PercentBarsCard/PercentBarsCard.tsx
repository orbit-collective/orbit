import React from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import TrendBadge from '@/Components/Atoms/TrendBadge/TrendBadge';
import { PercentBarsCardProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const AXIS = [100, 80, 60, 40, 20];

const PercentBarsCard: React.FC<PercentBarsCardProps> = ({
    title,
    icon,
    total,
    totalLabel,
    trend,
    bars,
    highlightKey,
    footnote,
    className,
}) => {
    const largest = bars.reduce<string | undefined>(
        (best, bar) =>
            bar.percent > (bars.find((b) => b.key === best)?.percent ?? -1)
                ? bar.key
                : best,
        undefined,
    );
    const highlighted = highlightKey ?? largest;

    return (
        <section
            className={cn(
                'rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] p-5',
                className,
            )}
        >
            <header className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                    <Icon name={icon} size={15} />
                </span>
                <h3 className="text-sm font-semibold text-[var(--text-color)]">
                    {title}
                </h3>
            </header>

            <p className="mt-4 text-xs text-[var(--text-gray-color)]">
                {totalLabel}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
                <p
                    data-testid="total"
                    className="text-2xl font-semibold tracking-tight text-[var(--text-color)]"
                >
                    {total}
                </p>
                {trend && <TrendBadge {...trend} />}
            </div>

            <div className="mt-5 flex gap-3">
                <div
                    aria-hidden="true"
                    className="flex h-48 shrink-0 flex-col justify-between text-[11px] text-[var(--text-muted-color)]"
                >
                    {AXIS.map((tick) => (
                        <span key={tick}>{tick}%</span>
                    ))}
                </div>

                <div
                    role="img"
                    aria-label={`${title}: ${bars
                        .map((bar) => `${bar.label} ${bar.percent}%`)
                        .join(', ')}`}
                    className="flex h-48 min-w-0 flex-1 items-end gap-2"
                >
                    {bars.map((bar) => (
                        <div
                            key={bar.key}
                            className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
                        >
                            <div className="bg-[var(--bg-light-color)]/40 absolute inset-0 rounded-3xl" />
                            <div
                                data-testid="percent-bar"
                                data-highlighted={bar.key === highlighted}
                                className={cn(
                                    'relative flex items-start justify-center rounded-3xl pt-2 transition-all duration-300',
                                    bar.key === highlighted
                                        ? 'bg-[var(--accent-color)]'
                                        : 'bg-[var(--bg-light-color)]',
                                )}
                                style={{
                                    height: `${Math.min(100, Math.max(bar.percent, 0))}%`,
                                    minHeight: bar.percent > 0 ? '1.5rem' : 0,
                                }}
                            >
                                <span className="rotate-180 text-[10px] font-semibold text-[var(--text-color)] [writing-mode:vertical-rl]">
                                    {bar.percent}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="ml-10 mt-2 flex gap-2">
                {bars.map((bar) => (
                    <span
                        key={bar.key}
                        className="min-w-0 flex-1 truncate text-center text-[11px] text-[var(--text-muted-color)]"
                        title={bar.label}
                    >
                        {bar.label}
                    </span>
                ))}
            </div>

            {footnote && (
                <p className="mt-4 text-center text-xs text-[var(--accent-color)]">
                    {footnote}
                </p>
            )}
        </section>
    );
};

export default PercentBarsCard;
