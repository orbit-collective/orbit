import { motion } from 'framer-motion';
import { FC, useId } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { ProductivityTrendCardProps } from '@/types/Components';
import { smoothLinePath } from '@/utils/chart';
import { DASHBOARD_COLOR_VALUES } from '@/utils/dashboardColors';
import { DURATION, EASE, rowDelay } from '@/utils/motion';
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
    variant = 'bars',
    showHeader = true,
    showGrid = true,
    values = 'hover',
    highlightToday = true,
    color = 'accent',
}) => {
    const gradientId = useId();
    const tint = DASHBOARD_COLOR_VALUES[color];
    const currentDay = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
    });
    const maxCount = Math.max(...trendData.map((d) => d.count), 0);
    const hasActivity = maxCount > 0;
    const ticks = getNiceTicks(maxCount);
    const axisMax = ticks[0];
    const alwaysShown = values === 'always';
    const isLine = variant === 'line' || variant === 'area';
    const total = trendData.length;
    // Percent of the plot: a day sits in the middle of its column.
    const points = trendData.map((day, index) => ({
        x: ((index + 0.5) / total) * 100,
        y: axisMax === 0 ? 0 : (day.count / axisMax) * 100,
    }));
    // SVG y grows downward, the height of a point grows upward.
    const svgPoints = points.map((point) => ({ x: point.x, y: 100 - point.y }));
    const linePath = smoothLinePath(svgPoints);
    const areaPath = `${linePath} L${points.at(-1)?.x ?? 0},100 L${points[0]?.x ?? 0},100 Z`;

    return (
        <VisualCard className={className}>
            {showHeader && (
                <VisualCardHeader
                    title="Productivity Trend"
                    description="Daily issue updates and fixes from this week"
                />
            )}

            {hasActivity ? (
                <div
                    className={`flex min-h-0 flex-1 flex-col ${showHeader ? 'mt-6' : 'mt-1'}`}
                >
                    <div className="flex min-h-0 flex-1 gap-3">
                        <div className="flex w-6 shrink-0 flex-col justify-between text-right text-[10px] font-medium tabular-nums text-[var(--text-muted-color)]">
                            {ticks.map((tick) => (
                                <span key={tick}>{tick}</span>
                            ))}
                        </div>

                        <div className="relative flex-1">
                            {showGrid && (
                                <div className="absolute inset-0 flex flex-col justify-between">
                                    {ticks.map((tick) => (
                                        <div
                                            key={tick}
                                            className="border-t border-dashed border-[var(--border-color)]"
                                        />
                                    ))}
                                </div>
                            )}

                            {isLine ? (
                                <div
                                    data-testid="trend-line"
                                    className="absolute inset-0"
                                >
                                    <motion.div
                                        // The line is drawn from left to right.
                                        className="absolute inset-0"
                                        initial={{
                                            clipPath:
                                                'inset(-10% 100% -10% -2%)',
                                        }}
                                        animate={{
                                            clipPath:
                                                'inset(-10% -2% -10% -2%)',
                                        }}
                                        transition={{
                                            duration: DURATION.slow,
                                            ease: EASE,
                                            delay: 0.1,
                                        }}
                                    >
                                        <svg
                                            viewBox="0 0 100 100"
                                            preserveAspectRatio="none"
                                            className="absolute inset-0 h-full w-full overflow-visible"
                                            aria-hidden="true"
                                        >
                                            <defs>
                                                <linearGradient
                                                    id={gradientId}
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="0%"
                                                        stopColor={tint}
                                                        stopOpacity="0.35"
                                                    />
                                                    <stop
                                                        offset="100%"
                                                        stopColor={tint}
                                                        stopOpacity="0"
                                                    />
                                                </linearGradient>
                                            </defs>
                                            {variant === 'area' && (
                                                <path
                                                    data-testid="trend-area"
                                                    d={areaPath}
                                                    fill={`url(#${gradientId})`}
                                                />
                                            )}
                                            <path
                                                d={linePath}
                                                fill="none"
                                                stroke={tint}
                                                strokeWidth="2.5"
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        </svg>
                                    </motion.div>

                                    {trendData.map((day, idx) => {
                                        const isActive =
                                            highlightToday &&
                                            day.day === currentDay;

                                        return (
                                            <div
                                                key={idx}
                                                data-testid="trend-point"
                                                className="group absolute inset-y-0"
                                                style={{
                                                    left: `${(idx / total) * 100}%`,
                                                    width: `${100 / total}%`,
                                                }}
                                            >
                                                {/* A guide through the day under the pointer. */}
                                                <span
                                                    aria-hidden="true"
                                                    className="absolute inset-y-0 left-1/2 w-px bg-[var(--border-color-strong)] opacity-0 transition-opacity group-hover:opacity-100"
                                                />
                                                <motion.div
                                                    className="absolute left-1/2 flex -translate-x-1/2 translate-y-1/2 flex-col items-center"
                                                    style={{
                                                        bottom: `${points[idx].y}%`,
                                                    }}
                                                    initial={{
                                                        opacity: 0,
                                                        scale: 0,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        scale: 1,
                                                    }}
                                                    transition={{
                                                        duration: DURATION.base,
                                                        ease: EASE,
                                                        delay:
                                                            0.3 + rowDelay(idx),
                                                    }}
                                                >
                                                    <span
                                                        className={`absolute -top-7 z-20 whitespace-nowrap rounded border border-solid border-[var(--border-color-strong)] bg-[var(--surface-color)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--text-color)] transition-all ${alwaysShown ? 'scale-100' : 'scale-0 group-hover:scale-100'}`}
                                                    >
                                                        {day.count}
                                                    </span>
                                                    <span
                                                        data-active={isActive}
                                                        className="block h-2.5 w-2.5 rounded-full border-2 border-solid transition-transform duration-150 group-hover:scale-150"
                                                        style={{
                                                            borderColor: tint,
                                                            backgroundColor:
                                                                isActive
                                                                    ? tint
                                                                    : 'var(--surface-color)',
                                                        }}
                                                    />
                                                </motion.div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="relative flex h-full items-end justify-between gap-1.5 px-1 sm:gap-2 sm:px-2">
                                    {trendData.map((day, idx) => {
                                        const isActive =
                                            highlightToday &&
                                            day.day === currentDay;
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
                                                    <motion.div
                                                        data-testid="trend-column"
                                                        data-height={
                                                            isZero
                                                                ? '10px'
                                                                : `${heightPct}%`
                                                        }
                                                        className="relative flex w-full justify-center"
                                                        initial={{ height: 0 }}
                                                        animate={{
                                                            height: isZero
                                                                ? '10px'
                                                                : `${heightPct}%`,
                                                        }}
                                                        transition={{
                                                            duration:
                                                                DURATION.slow,
                                                            ease: EASE,
                                                            delay:
                                                                0.15 +
                                                                rowDelay(idx),
                                                        }}
                                                    >
                                                        <span
                                                            className={`absolute -top-7 z-20 whitespace-nowrap rounded border border-solid border-[var(--border-color-strong)] bg-[var(--surface-color)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--text-color)] transition-all ${alwaysShown ? 'scale-100' : 'scale-0 group-hover:scale-100'}`}
                                                        >
                                                            {day.count}
                                                        </span>
                                                        {isZero ? (
                                                            <div className="h-full w-full max-w-[16px] rounded-t-sm border border-dashed border-[var(--border-color-strong)] bg-[var(--bg-light-color)] transition-colors group-hover:border-[var(--text-muted-color)]" />
                                                        ) : (
                                                            <div
                                                                data-active={
                                                                    isActive
                                                                }
                                                                className={`h-full w-full max-w-[16px] rounded-t-sm transition-colors ${
                                                                    isActive
                                                                        ? ''
                                                                        : 'bg-[var(--bg-light-color)] group-hover:bg-[var(--bg-light-color-hover)]'
                                                                }`}
                                                                style={
                                                                    isActive
                                                                        ? {
                                                                              backgroundColor:
                                                                                  tint,
                                                                          }
                                                                        : undefined
                                                                }
                                                            />
                                                        )}
                                                    </motion.div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-2 flex gap-3">
                        <div className="w-6 shrink-0" />
                        <div
                            className={`flex flex-1 justify-between ${isLine ? '' : 'gap-1.5 px-1 sm:gap-2 sm:px-2'}`}
                        >
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
