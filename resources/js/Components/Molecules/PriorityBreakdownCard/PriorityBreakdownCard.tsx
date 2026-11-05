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

export const PriorityBreakdownCard: FC<PriorityBreakdownCardProps> = ({
    priorities,
    noPriority,
    total,
}) => {
    const items = [
        ...priorities.map((priority) => ({
            key: priority.name,
            label: priority.name,
            color: priority.color,
            count: priority.count,
        })),
        ...(noPriority > 0
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

    return (
        <VisualCard>
            <VisualCardHeader
                title="Priority Breakdown"
                description="Issues distribution by level of urgency"
            />
            <div className="flex flex-1 flex-col justify-center py-4">
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
                <div className="mt-5 flex flex-col gap-2.5">
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
                                <AnimatedNumber value={item.count} />{' '}
                                <span className="font-medium text-[var(--text-muted-color)]">
                                    <AnimatedNumber
                                        value={item.pct}
                                        format={(n) => `(${Math.round(n)}%)`}
                                    />
                                </span>
                            </span>
                        </RowReveal>
                    ))}
                </div>
            </div>
        </VisualCard>
    );
};
