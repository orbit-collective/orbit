import { motion } from 'framer-motion';
import React from 'react';
import Badge from '@/Components/Atoms/Badge/Badge';
import { BarPlotProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { DURATION, EASE, rowDelay } from '@/utils/motion';

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * The plot shared by the chart cards: dotted grid lines with an axis, pill
 * shaped bars that keep a sensible width however many there are, the
 * highlighted bar in the accent colour with a dot on top, and an optional
 * dashed marker line with a tag. Bars grow into place one after another and
 * glide to their new height when the data changes. Each bar is a focusable
 * Badge whose tooltip opens on hover and on keyboard focus. Plain CSS plus
 * framer-motion, no chart library.
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
            role="group"
            aria-label={ariaLabel}
            className="relative ml-11 h-48 sm:ml-12 sm:h-56"
        >
            {ticks.map((tick, index) => (
                <motion.div
                    key={tick.percent}
                    aria-hidden="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                        duration: DURATION.base,
                        delay: rowDelay(index),
                    }}
                    className="absolute inset-x-0 border-t border-dotted border-[var(--border-color-strong)]"
                    style={{ bottom: `${clamp(tick.percent)}%` }}
                >
                    <span className="absolute right-full top-0 mr-2.5 -translate-y-1/2 text-[11px] leading-none text-[var(--text-muted-color)] sm:mr-3">
                        {tick.label}
                    </span>
                </motion.div>
            ))}

            <div className="absolute inset-0 flex">
                {bars.map((bar, index) => {
                    const highlighted = bar.key === highlightKey;
                    const height = clamp(bar.heightPercent);

                    return (
                        <div
                            key={bar.key}
                            className="relative flex h-full min-w-0 flex-1 items-end justify-center px-0.5 sm:px-1"
                        >
                            <motion.div
                                className="relative w-full max-w-10"
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{
                                    duration: DURATION.slow,
                                    ease: EASE,
                                    delay: 0.15 + rowDelay(index),
                                }}
                                style={{
                                    minHeight: height > 0 ? '0.75rem' : 0,
                                }}
                            >
                                <Badge
                                    variant="ghost"
                                    tooltip={Boolean(bar.tooltip)}
                                    tooltipText={bar.tooltip}
                                    tooltipPlacement="top"
                                    wrapperClassName="h-full w-full"
                                    tabIndex={0}
                                    role="img"
                                    aria-label={`${bar.label}: ${bar.tooltip ?? `${Math.round(height)}%`}`}
                                    data-testid={barTestId}
                                    data-highlighted={highlighted}
                                    data-height-percent={height}
                                    className={cn(
                                        'h-full w-full rounded-none rounded-t-full border-0 p-0 transition-colors duration-200',
                                        FOCUS_RING,
                                        highlighted
                                            ? 'bg-[var(--accent-color)]'
                                            : 'bg-[var(--bg-light-color)] hover:bg-[var(--text-muted-color)]/60 focus-visible:bg-[var(--text-muted-color)]/60',
                                    )}
                                >
                                    {highlighted && (
                                        <motion.span
                                            aria-hidden="true"
                                            data-testid="highlight-dot"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{
                                                duration: DURATION.base,
                                                ease: EASE,
                                                delay: 0.15 + DURATION.slow,
                                            }}
                                            className="absolute bottom-full left-1/2 -ml-1 mb-1.5 h-2 w-2 rounded-full bg-[var(--accent-color)]"
                                        />
                                    )}
                                </Badge>
                            </motion.div>
                        </div>
                    );
                })}
            </div>

            {marker && (
                <motion.div
                    aria-hidden="true"
                    data-testid="marker-line"
                    data-percent={clamp(marker.percent)}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{
                        scaleX: 1,
                        opacity: 1,
                        bottom: `${clamp(marker.percent)}%`,
                    }}
                    transition={{
                        duration: DURATION.slow,
                        ease: EASE,
                        delay: 0.3,
                    }}
                    style={{ transformOrigin: 'left' }}
                    className="pointer-events-none absolute inset-x-0 z-[5] border-t border-dashed border-[var(--text-gray-color)]"
                >
                    <span className="absolute right-full top-0 mr-1.5 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--text-color)] px-2 py-1 text-[10px] font-medium leading-none text-[var(--bg-color)]">
                        {marker.label}
                    </span>
                </motion.div>
            )}
        </div>

        <div className="ml-11 mt-3 flex sm:ml-12">
            {bars.map((bar) => (
                <span
                    key={bar.key}
                    title={bar.label}
                    className={cn(
                        'min-w-0 flex-1 px-0.5 text-center text-[11px]',
                        bar.key === highlightKey
                            ? 'font-semibold text-[var(--text-color)]'
                            : 'text-[var(--text-muted-color)]',
                    )}
                >
                    <span className="block truncate">{bar.label}</span>
                    {bar.caption && (
                        <span className="block text-[10px] tabular-nums text-[var(--text-gray-color)]">
                            {bar.caption}
                        </span>
                    )}
                </span>
            ))}
        </div>
    </div>
);

export default BarPlot;
