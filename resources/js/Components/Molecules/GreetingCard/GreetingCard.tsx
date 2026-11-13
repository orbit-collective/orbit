import { TargetAndTransition, motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FC } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/utils/cn';
import {
    DashboardColor,
    DASHBOARD_COLOR_VALUES,
} from '@/utils/dashboardColors';
import { dateKeyOf } from '@/utils/dueDate';
import { DayPeriod, firstName, greetingFor } from '@/utils/greeting';
import { DURATION, EASE, SPRING, rowDelay } from '@/utils/motion';

interface GreetingCardProps {
    /** `banner` is large with a glow, `compact` one row, `minimal` a line of text. */
    variant?: string;
    /** The user's name; the first word is used. */
    name?: string | null;
    showName?: boolean;
    showDate?: boolean;
    /** The day in numbers: how many issues are yours, late or due soon. */
    showSummary?: boolean;
    showIcon?: boolean;
    color?: DashboardColor;
    assigned?: number;
    overdue?: number;
    dueSoon?: number;
    /** Fixed time, for a story or a test; the clock by default. */
    now?: Date;
}

/** How the icon of the time of day moves: a sun turns, the rest drift. */
const ICON_MOTION: Record<
    DayPeriod,
    { animate: TargetAndTransition; duration: number }
> = {
    morning: { animate: { y: [0, -3, 0] }, duration: 4 },
    afternoon: { animate: { rotate: 360 }, duration: 40 },
    evening: { animate: { y: [0, 3, 0] }, duration: 4 },
    night: { animate: { y: [0, -3, 0], rotate: [-6, 6, -6] }, duration: 6 },
};

/** A greeting for the time of day, the date, and the day in numbers. */
const GreetingCard: FC<GreetingCardProps> = ({
    variant = 'banner',
    name,
    showName = true,
    showDate = true,
    showSummary = true,
    showIcon = true,
    color = 'accent',
    assigned = 0,
    overdue = 0,
    dueSoon = 0,
    now,
}) => {
    const { t, tChoice, currentLocale } = useLaravelReactI18n();
    const clock = useNow();
    const moment = now ?? clock;
    const greeting = greetingFor(moment);
    const who = showName ? firstName(name) : null;
    const tint = DASHBOARD_COLOR_VALUES[color];
    const date = moment.toLocaleDateString(
        currentLocale() === 'pl' ? 'pl-PL' : 'en-US',
        {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        },
    );
    const moving = ICON_MOTION[greeting.period];

    const chips = [
        {
            key: 'assigned',
            text: t('greeting_card.chips.assigned', { count: assigned }),
            hot: false,
        },
        {
            key: 'overdue',
            text: t('greeting_card.chips.overdue', { count: overdue }),
            hot: overdue > 0,
        },
        {
            key: 'soon',
            text: t('greeting_card.chips.soon', { count: dueSoon }),
            hot: false,
        },
    ];
    const sentence = `${tChoice('greeting_card.sentence.head', assigned)}${overdue > 0 ? t('greeting_card.sentence.overdue', { count: overdue }) : ''}${dueSoon > 0 ? t('greeting_card.sentence.soon', { count: dueSoon }) : ''}.`;
    const isBanner = variant === 'banner';

    return (
        <section
            aria-label={t('greeting_card.welcome')}
            className={cn(
                'relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-solid border-(--border-color) bg-(--surface-color)',
                variant === 'minimal'
                    ? 'items-center px-4 py-2'
                    : 'items-center p-4',
            )}
        >
            {isBanner && (
                <motion.span
                    aria-hidden="true"
                    data-testid="greeting-glow"
                    animate={{ opacity: [0.35, 0.6, 0.35] }}
                    transition={{
                        duration: 6,
                        ease: 'easeInOut',
                        repeat: Infinity,
                    }}
                    className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full blur-3xl"
                    style={{ backgroundColor: tint }}
                />
            )}

            <div
                className={cn(
                    'relative flex min-w-0 flex-1 items-center gap-4',
                    variant === 'minimal' && 'gap-3',
                )}
            >
                {showIcon && variant !== 'minimal' && (
                    <motion.span
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={SPRING}
                        className={cn(
                            'flex shrink-0 items-center justify-center rounded-2xl',
                            isBanner ? 'h-14 w-14' : 'h-10 w-10',
                        )}
                        style={{
                            backgroundColor: `color-mix(in srgb, ${tint} 16%, transparent)`,
                            color: tint,
                        }}
                    >
                        <motion.span
                            data-testid="greeting-icon"
                            data-period={greeting.period}
                            animate={moving.animate}
                            transition={{
                                duration: moving.duration,
                                ease: 'easeInOut',
                                repeat: Infinity,
                            }}
                            className="flex"
                        >
                            <Icon
                                name={greeting.icon}
                                size={isBanner ? 28 : 20}
                            />
                        </motion.span>
                    </motion.span>
                )}

                <div className="min-w-0 flex-1">
                    <motion.h2
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: DURATION.base,
                            ease: EASE,
                            delay: 0.05,
                        }}
                        className={cn(
                            'm-0 truncate font-semibold text-(--text-color)',
                            isBanner
                                ? 'text-2xl'
                                : variant === 'compact'
                                  ? 'text-lg'
                                  : 'text-sm',
                        )}
                    >
                        {t(`greeting_card.period.${greeting.period}`)}
                        {who && <span>, {who}</span>}
                        {variant === 'minimal' && (
                            <span className="font-normal text-(--text-gray-color)">
                                .
                            </span>
                        )}
                    </motion.h2>
                    {showDate && variant !== 'minimal' && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{
                                duration: DURATION.base,
                                delay: 0.15,
                            }}
                            className="m-0 mt-0.5 truncate text-xs text-(--text-muted-color)"
                        >
                            <time dateTime={dateKeyOf(0, moment)}>{date}</time>
                        </motion.p>
                    )}
                    {showSummary && variant === 'minimal' && (
                        <p className="m-0 truncate text-xs text-(--text-muted-color)">
                            {sentence}
                        </p>
                    )}
                </div>

                {showSummary && variant !== 'minimal' && (
                    <ul
                        aria-label={t('greeting_card.numbers')}
                        className="m-0 flex list-none flex-wrap justify-end gap-2 p-0"
                    >
                        {chips.map((chip, index) => (
                            <motion.li
                                key={chip.key}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    ...SPRING,
                                    delay: 0.2 + rowDelay(index),
                                }}
                                className={cn(
                                    'rounded-full border border-solid px-2.5 py-1 text-[11px] font-medium',
                                    variant === 'compact' && 'hidden md:block',
                                    chip.hot
                                        ? 'border-[color-mix(in_srgb,var(--error-color)_40%,transparent)] bg-[color-mix(in_srgb,var(--error-color)_12%,transparent)] text-(--error-color)'
                                        : 'border-(--border-color) bg-(--bg-color-hover) text-(--text-gray-color)',
                                )}
                            >
                                {chip.text}
                            </motion.li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
};

export default GreetingCard;
