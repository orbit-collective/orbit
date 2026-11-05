import { motion } from 'framer-motion';
import { FC } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import { CompletionRatioCardProps } from '@/types/Components';
import { DURATION, EASE, SPRING, rowDelay } from '@/utils/motion';
import { VisualCard } from '../../Atoms/VisualCard/VisualCard';
import { VisualCardHeader } from '../VisualCardHeader/VisualCardHeader';

const tierFor = (donePct: number) => {
    if (donePct >= 75) {
        return { label: 'Excellent', colorClass: 'bg-[var(--success-color)]' };
    }

    if (donePct >= 40) {
        return { label: 'On track', colorClass: 'bg-[var(--accent-color)]' };
    }

    return {
        label: 'Needs attention',
        colorClass: 'bg-[var(--warning-color)]',
    };
};

export const CompletionRatioCard: FC<CompletionRatioCardProps> = ({
    todo,
    inProgress,
    done,
    total,
    donePct,
}) => {
    const bars = [
        { label: 'To Do', value: todo, colorClass: 'bg-[var(--info-color)]' },
        {
            label: 'In Progress',
            value: inProgress,
            colorClass: 'bg-[var(--accent-color)]',
        },
        {
            label: 'Done',
            value: done,
            colorClass: 'bg-[var(--success-color)]',
        },
    ];
    const maxValue = Math.max(1, todo, inProgress, done);
    const tier = tierFor(donePct);

    return (
        <VisualCard>
            <div>
                <div className="flex items-start justify-between gap-2">
                    <VisualCardHeader
                        title="Completion Ratio"
                        description="Resolution status of all logged tasks"
                    />
                    {total > 0 && (
                        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                            <motion.span
                                // A new tier pops its dot in again.
                                key={tier.label}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={SPRING}
                                className={`h-1.5 w-1.5 rounded-full ${tier.colorClass}`}
                            />
                            <span className="text-xs font-medium text-[var(--text-gray-color)]">
                                {tier.label}
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-5">
                    <div className="flex flex-col">
                        <span className="text-6xl font-bold tabular-nums leading-none tracking-tight text-[var(--text-color)]">
                            <AnimatedNumber
                                value={donePct}
                                format={(n) => `${Math.round(n)}%`}
                            />
                        </span>
                        <span className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted-color)]">
                            Resolved
                        </span>
                        <span className="mt-1 text-xs text-[var(--text-gray-color)]">
                            <AnimatedNumber
                                value={done}
                                format={(n) =>
                                    `${Math.round(n)} of ${total} issues`
                                }
                            />
                        </span>
                    </div>

                    <div className="flex h-32 items-end gap-4 border-l border-solid border-[var(--border-color-strong)] pl-6">
                        {bars.map((bar, index) => (
                            <div
                                key={bar.label}
                                className="flex flex-col items-center gap-2"
                            >
                                <span className="text-xs font-semibold tabular-nums text-[var(--text-color)]">
                                    <AnimatedNumber value={bar.value} />
                                </span>
                                <div className="flex h-20 w-6 items-end overflow-hidden rounded-md bg-[var(--bg-light-color)]">
                                    <motion.div
                                        data-testid="completion-bar"
                                        data-height-percent={
                                            (bar.value / maxValue) * 100
                                        }
                                        className={`w-full rounded-md ${bar.colorClass}`}
                                        initial={{ height: 0 }}
                                        animate={{
                                            height: `${(bar.value / maxValue) * 100}%`,
                                        }}
                                        transition={{
                                            duration: DURATION.slow,
                                            ease: EASE,
                                            delay: 0.2 + rowDelay(index),
                                        }}
                                        title={`${bar.label}: ${bar.value}`}
                                    />
                                </div>
                                <span className="whitespace-nowrap text-[10px] font-medium text-[var(--text-muted-color)]">
                                    {bar.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </VisualCard>
    );
};
