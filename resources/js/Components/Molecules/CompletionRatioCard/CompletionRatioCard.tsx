import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FC } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import { CompletionRatioCardProps } from '@/types/Components';
import { DURATION, EASE, SPRING, rowDelay } from '@/utils/motion';
import ProgressRing from '../../Atoms/ProgressRing/ProgressRing';
import { VisualCard } from '../../Atoms/VisualCard/VisualCard';
import { VisualCardHeader } from '../VisualCardHeader/VisualCardHeader';

const tierFor = (donePct: number) => {
    if (donePct >= 75) {
        return {
            label: 'completion_ratio_card.tier.excellent',
            colorClass: 'bg-(--success-color)',
            ringClass: 'stroke-(--success-color)',
        };
    }

    if (donePct >= 40) {
        return {
            label: 'completion_ratio_card.tier.on_track',
            colorClass: 'bg-(--accent-color)',
            ringClass: 'stroke-(--accent-color)',
        };
    }

    return {
        label: 'completion_ratio_card.tier.needs_attention',
        colorClass: 'bg-(--warning-color)',
        ringClass: 'stroke-(--warning-color)',
    };
};

export const CompletionRatioCard: FC<CompletionRatioCardProps> = ({
    todo,
    inProgress,
    done,
    total,
    donePct,
    variant = 'bars',
    showHeader = true,
    showTier = true,
}) => {
    const { t } = useLaravelReactI18n();
    const bars = [
        {
            label: t('completion_ratio_card.bars.todo'),
            value: todo,
            colorClass: 'bg-(--info-color)',
        },
        {
            label: t('completion_ratio_card.bars.in_progress'),
            value: inProgress,
            colorClass: 'bg-(--accent-color)',
        },
        {
            label: t('completion_ratio_card.bars.done'),
            value: done,
            colorClass: 'bg-(--success-color)',
        },
    ];
    const maxValue = Math.max(1, todo, inProgress, done);
    const tier = tierFor(donePct);

    return (
        <VisualCard>
            <div>
                {(showHeader || (showTier && total > 0)) && (
                    <div className="flex items-start justify-between gap-2">
                        {showHeader ? (
                            <VisualCardHeader
                                title={t('completion_ratio_card.title')}
                                description={t(
                                    'completion_ratio_card.description',
                                )}
                            />
                        ) : (
                            <span />
                        )}
                        {showTier && total > 0 && (
                            <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                                <motion.span
                                    // A new tier pops its dot in again.
                                    key={tier.colorClass}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={SPRING}
                                    className={`h-1.5 w-1.5 rounded-full ${tier.colorClass}`}
                                />
                                <span className="text-xs font-medium text-(--text-gray-color)">
                                    {t(tier.label)}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {variant === 'stacked' ? (
                    <div className="mt-6 flex flex-col gap-5">
                        <div className="flex items-end justify-between gap-3">
                            <span className="text-5xl leading-none font-bold tracking-tight text-(--text-color) tabular-nums">
                                <AnimatedNumber
                                    value={donePct}
                                    format={(n) => `${Math.round(n)}%`}
                                />
                            </span>
                            <span className="pb-1 text-xs text-(--text-gray-color)">
                                <AnimatedNumber
                                    value={done}
                                    format={(n) =>
                                        t('completion_ratio_card.resolved_of', {
                                            done: Math.round(n),
                                            total,
                                        })
                                    }
                                />
                            </span>
                        </div>
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-(--bg-light-color)">
                            {bars.map((bar, index) => (
                                <motion.div
                                    key={bar.label}
                                    data-testid="completion-segment"
                                    className={`h-full ${bar.colorClass}`}
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${total === 0 ? 0 : (bar.value / total) * 100}%`,
                                    }}
                                    transition={{
                                        duration: DURATION.slow,
                                        ease: EASE,
                                        delay: 0.15 + rowDelay(index),
                                    }}
                                    title={`${bar.label}: ${bar.value}`}
                                />
                            ))}
                        </div>
                        <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
                            {bars.map((bar) => (
                                <li
                                    key={bar.label}
                                    className="flex flex-col gap-0.5"
                                >
                                    <span className="flex items-center gap-1.5 text-[11px] text-(--text-gray-color)">
                                        <span
                                            className={`h-2 w-2 rounded-xs ${bar.colorClass}`}
                                        />
                                        {bar.label}
                                    </span>
                                    <span className="text-sm font-semibold text-(--text-color) tabular-nums">
                                        <AnimatedNumber value={bar.value} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : variant === 'ring' ? (
                    <div className="mt-6 flex flex-wrap items-center gap-6">
                        <div className="relative flex shrink-0 items-center justify-center">
                            <ProgressRing
                                radius={56}
                                stroke={5}
                                progress={donePct}
                                colorClass={tier.ringClass}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-(--text-color) tabular-nums">
                                <AnimatedNumber
                                    value={donePct}
                                    format={(n) => `${Math.round(n)}%`}
                                />
                            </span>
                        </div>
                        <ul className="m-0 flex list-none flex-col gap-2 p-0">
                            {bars.map((bar) => (
                                <li
                                    key={bar.label}
                                    className="flex items-center gap-2 text-xs text-(--text-gray-color)"
                                >
                                    <span
                                        className={`h-2 w-2 rounded-xs ${bar.colorClass}`}
                                    />
                                    <span>{bar.label}</span>
                                    <span className="font-semibold text-(--text-color) tabular-nums">
                                        <AnimatedNumber value={bar.value} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-5">
                        <div className="flex flex-col">
                            <span className="text-6xl leading-none font-bold tracking-tight text-(--text-color) tabular-nums">
                                <AnimatedNumber
                                    value={donePct}
                                    format={(n) => `${Math.round(n)}%`}
                                />
                            </span>
                            <span className="mt-3 text-[10px] font-semibold tracking-widest text-(--text-muted-color) uppercase">
                                {t('completion_ratio_card.resolved')}
                            </span>
                            <span className="mt-1 text-xs text-(--text-gray-color)">
                                <AnimatedNumber
                                    value={done}
                                    format={(n) =>
                                        t('completion_ratio_card.issues_of', {
                                            done: Math.round(n),
                                            total,
                                        })
                                    }
                                />
                            </span>
                        </div>

                        <div className="flex h-32 items-end gap-4 border-l border-(--border-color-strong) pl-6">
                            {bars.map((bar, index) => (
                                <div
                                    key={bar.label}
                                    className="flex flex-col items-center gap-2"
                                >
                                    <span className="text-xs font-semibold text-(--text-color) tabular-nums">
                                        <AnimatedNumber value={bar.value} />
                                    </span>
                                    <div className="flex h-20 w-6 items-end overflow-hidden rounded-md bg-(--bg-light-color)">
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
                                    <span className="text-[10px] font-medium whitespace-nowrap text-(--text-muted-color)">
                                        {bar.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </VisualCard>
    );
};
