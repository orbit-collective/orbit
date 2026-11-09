import { motion } from 'framer-motion';
import { FC } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import { PriorityBreakdownCardProps } from '@/types/Components';
import { DURATION, EASE, rowDelay } from '@/utils/motion';
import { VisualCard } from '../../Atoms/VisualCard/VisualCard';
import { VisualCardHeader } from '../VisualCardHeader/VisualCardHeader';

const NO_PRIORITY_COLOR = 'var(--text-muted-color)';

const percent = (part: number, total: number) =>
    total === 0 ? 0 : Math.round((part / total) * 100);

/** Radius of the donut in its 100 x 100 box, and what a full turn is. */
const DONUT_RADIUS = 38;
const DONUT_LENGTH = 2 * Math.PI * DONUT_RADIUS;

export const PriorityBreakdownCard: FC<PriorityBreakdownCardProps> = ({
    priorities,
    noPriority,
    total,
    variant = 'bar',
    showHeader = true,
    showNoPriority = true,
    showPercent = true,
    sort = 'priority',
    title = 'Priority Breakdown',
    description = 'Issues distribution by level of urgency',
}) => {
    const items = [
        ...priorities.map((priority) => ({
            key: priority.name,
            label: priority.name,
            color: priority.color,
            count: priority.count,
        })),
        ...(noPriority > 0 && showNoPriority
            ? [
                  {
                      key: '__none__',
                      label: 'No priority',
                      color: NO_PRIORITY_COLOR,
                      count: noPriority,
                  },
              ]
            : []),
    ].map((item) => ({ ...item, pct: percent(item.count, total) }));

    if (sort === 'count') {
        items.sort((a, b) => b.count - a.count);
    } else if (sort === 'name') {
        items.sort((a, b) => a.label.localeCompare(b.label));
    }

    const legend = (
        <div className="flex flex-col gap-2.5">
            {items.length === 0 && (
                <span className="text-xs text-[var(--text-muted-color)]">
                    No issues yet
                </span>
            )}
            {items.map((item, index) => (
                <RowReveal
                    key={item.key}
                    index={index}
                    className="flex items-center justify-between text-xs"
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate font-medium text-[var(--text-color)]">
                            {item.label}
                        </span>
                    </div>
                    <span className="shrink-0 pl-2 font-semibold text-[var(--text-color)]">
                        <AnimatedNumber value={item.count} />
                        {showPercent && (
                            <>
                                {' '}
                                <span className="font-medium text-[var(--text-muted-color)]">
                                    <AnimatedNumber
                                        value={item.pct}
                                        format={(n) => `(${Math.round(n)}%)`}
                                    />
                                </span>
                            </>
                        )}
                    </span>
                </RowReveal>
            ))}
        </div>
    );

    let cumulative = 0;

    return (
        <VisualCard>
            {showHeader && (
                <VisualCardHeader title={title} description={description} />
            )}
            <div className="flex min-h-0 flex-1 flex-col justify-center py-4">
                {variant === 'donut' ? (
                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
                        <div className="relative h-36 w-36 shrink-0">
                            <svg
                                viewBox="0 0 100 100"
                                className="h-full w-full -rotate-90"
                                aria-hidden="true"
                            >
                                <circle
                                    cx="50"
                                    cy="50"
                                    r={DONUT_RADIUS}
                                    fill="none"
                                    stroke="var(--bg-light-color)"
                                    strokeWidth="12"
                                />
                                {items
                                    .filter((item) => item.count > 0)
                                    .map((item, index) => {
                                        const length =
                                            (item.count / (total || 1)) *
                                            DONUT_LENGTH;
                                        const offset = -cumulative;
                                        cumulative += length;

                                        return (
                                            <motion.circle
                                                key={item.key}
                                                data-testid="priority-arc"
                                                cx="50"
                                                cy="50"
                                                r={DONUT_RADIUS}
                                                fill="none"
                                                stroke={item.color}
                                                strokeWidth="12"
                                                strokeDashoffset={offset}
                                                initial={{
                                                    strokeDasharray: `0 ${DONUT_LENGTH}`,
                                                }}
                                                animate={{
                                                    strokeDasharray: `${length} ${DONUT_LENGTH - length}`,
                                                }}
                                                transition={{
                                                    duration: DURATION.slow,
                                                    ease: EASE,
                                                    delay:
                                                        0.15 + rowDelay(index),
                                                }}
                                            />
                                        );
                                    })}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold tabular-nums text-[var(--text-color)]">
                                    <AnimatedNumber value={total} />
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-color)]">
                                    issues
                                </span>
                            </div>
                        </div>
                        <div className="min-w-[160px] flex-1">{legend}</div>
                    </div>
                ) : variant === 'list' ? (
                    <div className="flex flex-col gap-4">
                        {items.length === 0 && (
                            <span className="text-xs text-[var(--text-muted-color)]">
                                No issues yet
                            </span>
                        )}
                        {items.map((item, index) => (
                            <RowReveal
                                key={item.key}
                                index={index}
                                className="flex flex-col gap-1.5"
                            >
                                <div className="flex items-center justify-between text-xs">
                                    <span className="truncate font-medium text-[var(--text-color)]">
                                        {item.label}
                                    </span>
                                    <span className="shrink-0 pl-2 font-semibold text-[var(--text-color)]">
                                        <AnimatedNumber value={item.count} />
                                        {showPercent && (
                                            <span className="pl-1 font-medium text-[var(--text-muted-color)]">
                                                <AnimatedNumber
                                                    value={item.pct}
                                                    format={(n) =>
                                                        `(${Math.round(n)}%)`
                                                    }
                                                />
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-light-color)]">
                                    <motion.div
                                        data-testid="priority-row-bar"
                                        data-width-percent={item.pct}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: item.color }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${item.pct}%` }}
                                        transition={{
                                            duration: DURATION.slow,
                                            ease: EASE,
                                            delay: 0.15 + rowDelay(index),
                                        }}
                                    />
                                </div>
                            </RowReveal>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--bg-light-color)]">
                            {items.map((item, index) => (
                                <motion.div
                                    key={item.key}
                                    data-testid="priority-segment"
                                    data-width-percent={item.pct}
                                    style={{ backgroundColor: item.color }}
                                    className="h-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.pct}%` }}
                                    transition={{
                                        duration: DURATION.slow,
                                        ease: EASE,
                                        delay: 0.15 + rowDelay(index),
                                    }}
                                    title={`${item.label}: ${item.pct}%`}
                                />
                            ))}
                        </div>
                        <div className="mt-5">{legend}</div>
                    </>
                )}
            </div>
        </VisualCard>
    );
};
