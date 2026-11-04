import React from 'react';
import { BarPlotProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * The plot shared by the chart cards: dotted grid lines with an axis, pill
 * shaped bars that keep a sensible width however many there are, the
 * highlighted bar in the accent colour with a dot on top, and an optional
 * dashed marker line with a tag. Plain CSS, no chart library.
 */
const BarPlot: React.FC<BarPlotProps> = ({
    bars,
    ticks,
    highlightKey,
    marker,
    ariaLabel,
    barTestId = 'bar',
    className,
}) => (
    <div className={cn('min-w-0', className)}>
        <div
            role="img"
            aria-label={ariaLabel}
            className="relative ml-11 h-48 sm:ml-12 sm:h-56"
        >
            {ticks.map((tick) => (
                <div
                    key={tick.percent}
                    aria-hidden="true"
                    className="absolute inset-x-0 border-t border-dotted border-[var(--border-color-strong)]"
                    style={{ bottom: `${clamp(tick.percent)}%` }}
                >
                    <span className="absolute right-full top-0 mr-2.5 -translate-y-1/2 text-[11px] leading-none text-[var(--text-muted-color)] sm:mr-3">
                        {tick.label}
                    </span>
                </div>
            ))}

            <div className="absolute inset-0 flex">
                {bars.map((bar) => {
                    const highlighted = bar.key === highlightKey;
                    const height = clamp(bar.heightPercent);

                    return (
                        <div
                            key={bar.key}
                            className="group relative flex h-full min-w-0 flex-1 items-end justify-center px-0.5 sm:px-1"
                        >
                            <div
                                data-testid={barTestId}
                                data-highlighted={highlighted}
                                title={bar.tooltip}
                                className={cn(
                                    'relative w-full max-w-10 rounded-full transition-all duration-300',
                                    highlighted
                                        ? 'bg-[var(--accent-color)]'
                                        : 'bg-[var(--bg-light-color)] group-hover:bg-[var(--text-muted-color)]/60',
                                )}
                                style={{
                                    height: `${height}%`,
                                    minHeight: height > 0 ? '0.75rem' : 0,
                                }}
                            >
                                {highlighted && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-[var(--surface-color)] bg-[var(--accent-color)]"
                                    />
                                )}
                                {bar.caption && (
                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-[var(--text-color)]">
                                        {bar.caption}
                                    </span>
                                )}
                            </div>
                            {bar.tooltip && (
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--text-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--bg-color)] opacity-0 transition-opacity group-hover:opacity-100"
                                    style={{
                                        bottom: `calc(${height}% + 0.5rem)`,
                                    }}
                                >
                                    {bar.tooltip}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {marker && (
                <div
                    aria-hidden="true"
                    data-testid="marker-line"
                    className="pointer-events-none absolute inset-x-0 z-[5] border-t border-dashed border-[var(--text-gray-color)]"
                    style={{ bottom: `${clamp(marker.percent)}%` }}
                >
                    <span className="absolute right-full top-0 mr-1.5 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--text-color)] px-2 py-1 text-[10px] font-medium leading-none text-[var(--bg-color)]">
                        {marker.label}
                    </span>
                </div>
            )}
        </div>

        <div className="ml-11 mt-3 flex sm:ml-12">
            {bars.map((bar) => (
                <span
                    key={bar.key}
                    title={bar.label}
                    className={cn(
                        'min-w-0 flex-1 truncate px-0.5 text-center text-[11px]',
                        bar.key === highlightKey
                            ? 'font-semibold text-[var(--text-color)]'
                            : 'text-[var(--text-muted-color)]',
                    )}
                >
                    {bar.label}
                </span>
            ))}
        </div>
    </div>
);

export default BarPlot;
