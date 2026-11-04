import React from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { BarChartCardProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const TICKS = 4;

/** Rounds the axis maximum up to a "nice" number so ticks read cleanly. */
export function niceMax(max: number): number {
    if (max <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(max));
    const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= max) ?? 10;

    return step * magnitude;
}

const BarChartCard: React.FC<BarChartCardProps> = ({
    title,
    icon,
    items,
    formatValue = (value) => String(Math.round(value)),
    summary,
    emptyText = 'Nothing to chart yet.',
    className,
}) => {
    const max = niceMax(Math.max(0, ...items.map((item) => item.value)));
    const average =
        items.length > 0
            ? items.reduce((sum, item) => sum + item.value, 0) / items.length
            : 0;
    const highlighted = items.reduce<number>(
        (best, item, index) =>
            item.value > (items[best]?.value ?? -1) ? index : best,
        -1,
    );
    const ticks = Array.from(
        { length: TICKS + 1 },
        (_, i) => (max / TICKS) * i,
    );

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

            {summary && (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-gray-color)]">
                    {summary}
                </div>
            )}

            {items.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--text-gray-color)]">
                    {emptyText}
                </p>
            ) : (
                <div className="mt-5 flex gap-3">
                    <div
                        aria-hidden="true"
                        className="flex h-44 shrink-0 flex-col-reverse justify-between text-[11px] text-[var(--text-muted-color)]"
                    >
                        {ticks.map((tick) => (
                            <span key={tick}>{formatValue(tick)}</span>
                        ))}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div
                            role="img"
                            aria-label={`${title}: ${items
                                .map(
                                    (item) =>
                                        `${item.label} ${item.valueLabel ?? formatValue(item.value)}`,
                                )
                                .join(', ')}`}
                            className="relative flex h-44 items-end gap-1.5 sm:gap-2"
                        >
                            <div
                                aria-hidden="true"
                                data-testid="average-line"
                                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--text-muted-color)]"
                                style={{ bottom: `${(average / max) * 100}%` }}
                            >
                                <span className="absolute -top-2.5 right-0 rounded bg-[var(--bg-dark-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                    Avg {formatValue(average)}
                                </span>
                            </div>

                            {items.map((item, index) => (
                                <div
                                    key={item.key}
                                    className="bg-[var(--bg-light-color)]/40 group relative flex h-full min-w-0 flex-1 items-end rounded-full"
                                >
                                    <div
                                        data-testid="bar"
                                        data-highlighted={index === highlighted}
                                        className={cn(
                                            'w-full rounded-full transition-all duration-300',
                                            index === highlighted
                                                ? 'bg-[var(--accent-color)]'
                                                : 'bg-[var(--bg-light-color)] group-hover:bg-[var(--text-muted-color)]',
                                        )}
                                        style={{
                                            height: `${Math.max((item.value / max) * 100, item.value > 0 ? 3 : 0)}%`,
                                        }}
                                    />
                                    <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--bg-dark-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-color)] opacity-0 transition-opacity group-hover:opacity-100">
                                        {item.valueLabel ??
                                            formatValue(item.value)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-2 flex gap-1.5 sm:gap-2">
                            {items.map((item, index) => (
                                <span
                                    key={item.key}
                                    className={cn(
                                        'min-w-0 flex-1 truncate text-center text-[11px]',
                                        index === highlighted
                                            ? 'font-semibold text-[var(--text-color)]'
                                            : 'text-[var(--text-muted-color)]',
                                    )}
                                    title={item.label}
                                >
                                    {item.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default BarChartCard;
