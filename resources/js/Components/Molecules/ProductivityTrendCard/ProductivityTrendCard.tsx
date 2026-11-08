import { motion } from 'framer-motion';
import { FC } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { ProductivityTrendCardProps } from '@/types/Components';
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

/** Where the point of a day sits on a line or area chart, in percent. */
const pointOf = (
    index: number,
    count: number,
    total: number,
    axisMax: number,
) => ({
    x: ((index + 0.5) / total) * 100,
    y: axisMax === 0 ? 0 : (count / axisMax) * 100,
});

export const ProductivityTrendCard: FC<ProductivityTrendCardProps> = ({
    trendData,
    className = '',
    variant = 'bars',
    showHeader = true,
    showGrid = true,
    values = 'hover',
    highlightToday = true,
}) => {
    const currentDay = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
    });
    const maxCount = Math.max(...trendData.map((d) => d.count), 0);
    const hasActivity = maxCount > 0;
    const ticks = getNiceTicks(maxCount);
    const axisMax = ticks[0];
    const alwaysShown = values === 'always';
    const isLine = variant === 'line' || variant === 'area';
    const points = trendData.map((day, index) =>
        pointOf(index, day.count, trendData.length, axisMax),
    );
    // SVG y grows downward, a point's height grows upward.
    const linePath = points
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'}${point.x},${100 - point.y}`,
        )
        .join(' ');
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
                                    className="absolute inset-0 px-1 sm:px-2"
                                >
                                    <div className="relative h-full w-full">
                                        <svg
                                            viewBox="0 0 100 100"
                                            preserveAspectRatio="none"
                                            className="absolute inset-0 h-full w-full overflow-visible"
                                            aria-hidden="true"
                                        >
                                            <defs>
                                                <linearGradient
                                                    id="trend-area"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="0%"
                                                        stopColor="var(--accent-color)"
                                                        stopOpacity="0.35"
                                                    />
                                                    <stop
                                                        offset="100%"
                                                        stopColor="var(--accent-color)"
                                                        stopOpacity="0"
                                                    />
                                                </linearGradient>
                                            </defs>
                                            {variant === 'area' && (
                                                <motion.path
                                                    d={areaPath}
                                                    fill="url(#trend-area)"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{
                                                        duration: DURATION.slow,
                                                        ease: EASE,
                                                        delay: 0.3,
                                                    }}
                                                />
                                            )}
                                            <motion.path
                                                d={linePath}
                                                fill="none"
                                                stroke="var(--accent-color)"
                                                strokeWidth="2"
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                                vectorEffect="non-scaling-stroke"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{
                                                    duration: DURATION.slow,
                                                    ease: EASE,
                                                    delay: 0.15,
                                                }}
                                            />
                                        </svg>
                                        {trendData.map((day, idx) => {
                                            const isActive =
                                                highlightToday &&
                                                day.day === currentDay;

                                            return (
                                                <motion.div
                                                    key={idx}
                                                    data-testid="trend-point"
                                                    className="group absolute flex -translate-x-1/2 translate-y-1/2 flex-col items-center"
                                                    style={{
                                                        left: `${points[idx].x}%`,
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
                                                        className={`absolute -top-6 whitespace-nowrap rounded border border-solid border-[var(--border-color-strong)] bg-[var(--surface-color)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--text-color)] transition-all ${alwaysShown ? 'scale-100' : 'scale-0 group-hover:scale-100'}`}
                                                    >
                                                        {day.count}
                                                    </span>
                                                    <span
                                                        className={`block h-2.5 w-2.5 rounded-full border-2 border-solid border-[var(--surface-color)] ${isActive ? 'bg-[var(--accent-color)]' : 'bg-[var(--text-gray-color)]'}`}
                                                    />
                                                </motion.div>
                                            );
                                        })}
                                    </div>
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
                                                                className={`h-full w-full max-w-[16px] rounded-t-sm transition-colors ${
                                                                    isActive
                                                                        ? 'bg-[var(--accent-color)]'
                                                                        : 'bg-[var(--bg-light-color)] group-hover:bg-[var(--bg-light-color-hover)]'
                                                                }`}
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
