import { motion } from 'framer-motion';
import React from 'react';
import Badge, { BADGE_TOOLTIP_LOOK } from '@/Components/Atoms/Badge/Badge';
import { BarPlotProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { DURATION, EASE, rowDelay } from '@/utils/motion';
import { useRefreshEpoch } from '@/utils/refreshEpoch';

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/** The narrowest a bar's column gets; more bars than fit make the plot scroll. */
const COLUMN_REM = 3.25;

/** Room for the first and last bar's tooltip inside the scroller. */
const EDGE_REM = 1;

const PLOT_HEIGHT = 'h-48 sm:h-56';
const AXIS_WIDTH = 'w-11 sm:w-12';

/**
 * The plot shared by the chart cards: dotted grid lines with a fixed axis,
 * pill shaped bars, the highlighted bar in the accent colour with a dot on
 * top, and an optional dashed marker line with a tag. Bars never squeeze
 * below a readable width: when there are more than fit they scroll sideways
 * and snap into place (the same `snap-x snap-mandatory` the mobile board uses)
 * while the axis stays put. Bars grow into place one after another and glide
 * to their new height when the data changes. Each bar is a focusable Badge
 * whose tooltip opens on hover and on keyboard focus (focusing a bar also
 * scrolls it into view). Plain CSS plus framer-motion, no chart library.
 */
const BarPlot: React.FC<BarPlotProps> = ({
    bars,
    ticks,
    highlightKey,
    marker,
    ariaLabel,
    barTestId = 'bar',
    className,
}) => {
    // A refresh redraws the bars (the scroll position is on the scroller, which stays).
    const epoch = useRefreshEpoch();

    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className={cn('flex min-w-0', className)}
        >
            <div
                aria-hidden="true"
                data-testid="plot-axis"
                className={cn('relative shrink-0', AXIS_WIDTH, PLOT_HEIGHT)}
            >
                {ticks.map((tick) => (
                    <span
                        key={tick.percent}
                        className="absolute right-2.5 translate-y-1/2 text-[11px] leading-none text-(--text-muted-color) sm:right-3"
                        style={{ bottom: `${clamp(tick.percent)}%` }}
                    >
                        {tick.label}
                    </span>
                ))}
                {marker && (
                    <span
                        className={cn(
                            'absolute right-1.5 z-10 translate-y-1/2 leading-none',
                            BADGE_TOOLTIP_LOOK,
                        )}
                        style={{ bottom: `${clamp(marker.percent)}%` }}
                    >
                        {marker.label}
                    </span>
                )}
            </div>

            {/* Extra top padding (undone by the negative margin) keeps tooltips and the dot of a tall bar inside the scroll box. */}
            <div
                data-testid="plot-scroller"
                className="no-scrollbar -mt-8 min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto pt-8"
            >
                <div
                    key={epoch}
                    data-testid="plot-content"
                    className="w-full px-4"
                    style={{
                        minWidth: `${bars.length * COLUMN_REM + EDGE_REM * 2}rem`,
                        boxSizing: 'border-box',
                    }}
                >
                    <div className={cn('relative', PLOT_HEIGHT)}>
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
                                className="absolute -inset-x-4 border-t border-dotted border-(--border-color-strong)"
                                style={{ bottom: `${clamp(tick.percent)}%` }}
                            />
                        ))}

                        <div className="absolute inset-0 flex">
                            {bars.map((bar, index) => {
                                const highlighted = bar.key === highlightKey;
                                const height = clamp(bar.heightPercent);

                                return (
                                    <div
                                        key={bar.key}
                                        data-testid="plot-column"
                                        className="relative flex h-full min-w-13 flex-1 snap-center items-end justify-center px-0.5 sm:px-1"
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
                                                minHeight:
                                                    height > 0 ? '0.75rem' : 0,
                                            }}
                                        >
                                            <Badge
                                                variant="ghost"
                                                tooltip={Boolean(bar.tooltip)}
                                                tooltipText={bar.tooltip}
                                                tooltipPlacement="top"
                                                wrapperClassName="absolute inset-0 h-full w-full"
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
                                                        ? 'bg-(--accent-color)'
                                                        : 'bg-(--bg-light-color) hover:bg-[color-mix(in_srgb,var(--text-muted-color)_60%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--text-muted-color)_60%,transparent)]',
                                                )}
                                            >
                                                {highlighted && (
                                                    <motion.span
                                                        aria-hidden="true"
                                                        data-testid="highlight-dot"
                                                        initial={{
                                                            scale: 0,
                                                            opacity: 0,
                                                        }}
                                                        animate={{
                                                            scale: 1,
                                                            opacity: 1,
                                                        }}
                                                        transition={{
                                                            duration:
                                                                DURATION.base,
                                                            ease: EASE,
                                                            delay:
                                                                0.15 +
                                                                DURATION.slow,
                                                        }}
                                                        className="absolute bottom-full left-1/2 mb-1.5 -ml-1 h-2 w-2 rounded-full bg-(--accent-color)"
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
                                initial={{
                                    scaleX: 0,
                                    opacity: 0,
                                    // Born at its final height: it draws across, never climbs.
                                    bottom: `${clamp(marker.percent)}%`,
                                }}
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
                                className="pointer-events-none absolute -inset-x-4 z-5 border-t border-dashed border-(--text-gray-color)"
                            />
                        )}
                    </div>

                    <div className="mt-3 flex">
                        {bars.map((bar) => (
                            <span
                                key={bar.key}
                                title={bar.label}
                                className={cn(
                                    'min-w-13 flex-1 px-0.5 text-center text-[11px]',
                                    bar.key === highlightKey
                                        ? 'font-semibold text-(--text-color)'
                                        : 'text-(--text-muted-color)',
                                )}
                            >
                                <span className="block truncate">
                                    {bar.label}
                                </span>
                                {bar.caption && (
                                    <span className="block text-[10px] text-(--text-gray-color) tabular-nums">
                                        {bar.caption}
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarPlot;
