import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FC, useId } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import { ProductivityTrendProps } from '@/types/Issues';
import { smoothLinePath } from '@/utils/chart';
import { cn } from '@/utils/cn';
import {
    DashboardColor,
    DASHBOARD_COLOR_VALUES,
} from '@/utils/dashboardColors';
import { summarizeWeek } from '@/utils/dashboardIssues';
import { DURATION, EASE, rowDelay } from '@/utils/motion';
import { localizedWeekday } from '@/utils/time';

interface WeekSummaryCardProps {
    trend: ProductivityTrendProps[];
    /** `numbers`, a `sparkline` under the total, or `bars` of the days. */
    variant?: string;
    showHeader?: boolean;
    showAverage?: boolean;
    showBest?: boolean;
    color?: DashboardColor;
    /** The weekday that is today ("Tue"); the real one by default. */
    todayName?: string;
}

const TOOLTIP =
    'pointer-events-none absolute z-20 whitespace-nowrap rounded-sm border border-solid border-(--border-color-strong) bg-(--surface-color) px-1.5 py-0.5 text-[10px] font-semibold text-(--text-color) opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100';

/** The label a day gets on hover: "Mon: 2 updates". */
const dayTip = (
    day: ProductivityTrendProps,
    tChoice: (
        key: string,
        count: number,
        replacements?: Record<string, string | number>,
    ) => string,
    weekday: (key: string) => string,
) =>
    tChoice('week_summary_card.day_tip', day.count, {
        day: weekday(day.day),
    });

/** The speech for a chart that is a picture: every day with its count. */
const describeDays = (
    days: ProductivityTrendProps[],
    weekday: (key: string) => string,
) => days.map((day) => `${weekday(day.day)} ${day.count}`).join(', ');

/** This week at a glance, from the trend of the week: a total, a good day and a shape. */
const WeekSummaryCard: FC<WeekSummaryCardProps> = ({
    trend,
    variant = 'numbers',
    showHeader = true,
    showAverage = true,
    showBest = true,
    color = 'accent',
    todayName,
}) => {
    const { t, tChoice, currentLocale } = useLaravelReactI18n();
    const weekday = (key: string) => localizedWeekday(key, currentLocale());
    const gradientId = useId();
    const tint = DASHBOARD_COLOR_VALUES[color];
    const todayLabel =
        todayName ??
        new Date().toLocaleDateString('en-US', { weekday: 'short' });
    const week = summarizeWeek(trend, todayLabel);
    const max = Math.max(...trend.map((day) => day.count), 1);
    const points = trend.map((day, index) => ({
        x: trend.length < 2 ? 50 : (index / (trend.length - 1)) * 100,
        y: 28 - (day.count / max) * 26,
    }));
    const line = smoothLinePath(points);

    const stats = [
        { label: t('week_summary_card.total'), value: week.total, show: true },
        {
            label: t('week_summary_card.today'),
            value: week.today,
            show: variant === 'numbers',
        },
        {
            label: t('week_summary_card.average'),
            value: week.average,
            show: showAverage,
            decimals: true,
        },
        {
            label: t('week_summary_card.best'),
            value: week.best?.count ?? 0,
            show: showBest,
            note: week.best ? weekday(week.best.day) : t('common.none'),
        },
    ].filter((stat) => stat.show);

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-solid border-(--border-color) bg-(--surface-color) p-4">
            {showHeader && (
                <div>
                    <h3 className="m-0 text-xs font-semibold tracking-wider text-(--text-gray-color) uppercase">
                        {t('week_summary_card.title')}
                    </h3>
                    <p className="m-0 mt-1 text-xs text-(--text-muted-color)">
                        {t('week_summary_card.description')}
                    </p>
                </div>
            )}

            {variant === 'numbers' ? (
                <dl
                    className="m-0 grid min-h-0 flex-1 content-center gap-x-4 gap-y-3"
                    style={{
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(5.5rem, 1fr))',
                    }}
                >
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: DURATION.base,
                                ease: EASE,
                                delay: rowDelay(index),
                            }}
                            className="min-w-0"
                        >
                            <dt className="text-[10px] font-semibold tracking-wider text-(--text-muted-color) uppercase">
                                {stat.label}
                            </dt>
                            <dd className="m-0 mt-0.5 flex items-baseline gap-1.5">
                                <span
                                    className="text-2xl leading-none font-bold text-(--text-color) tabular-nums"
                                    style={
                                        index === 0
                                            ? { color: tint }
                                            : undefined
                                    }
                                >
                                    <AnimatedNumber
                                        value={stat.value}
                                        format={(n) =>
                                            stat.decimals
                                                ? n.toFixed(1)
                                                : String(Math.round(n))
                                        }
                                    />
                                </span>
                                {stat.note && (
                                    <span className="text-xs font-medium text-(--text-gray-color)">
                                        {stat.note}
                                    </span>
                                )}
                            </dd>
                        </motion.div>
                    ))}
                </dl>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <span className="block text-[10px] font-semibold tracking-wider text-(--text-muted-color) uppercase">
                                {t('week_summary_card.total')}
                            </span>
                            <span
                                className="text-3xl leading-none font-bold tabular-nums"
                                style={{ color: tint }}
                            >
                                <AnimatedNumber value={week.total} />
                            </span>
                        </div>
                        <ul className="m-0 flex list-none flex-col items-end gap-0.5 p-0 text-[11px] text-(--text-gray-color)">
                            {showAverage && (
                                <li>
                                    {t('week_summary_card.a_day', {
                                        average: week.average.toFixed(1),
                                    })}
                                </li>
                            )}
                            {showBest && week.best && (
                                <li>
                                    {t('week_summary_card.best_day', {
                                        day: weekday(week.best.day),
                                        count: week.best.count,
                                    })}
                                </li>
                            )}
                        </ul>
                    </div>

                    {variant === 'sparkline' ? (
                        <div className="relative h-12 min-h-0 w-full shrink">
                            <motion.svg
                                role="img"
                                aria-label={t('week_summary_card.per_day', {
                                    days: describeDays(trend, weekday),
                                })}
                                viewBox="0 0 100 30"
                                preserveAspectRatio="none"
                                className="h-full w-full overflow-visible"
                                initial={{
                                    clipPath: 'inset(-10% 100% -10% -2%)',
                                }}
                                animate={{
                                    clipPath: 'inset(-10% -2% -10% -2%)',
                                }}
                                transition={{
                                    duration: DURATION.slow,
                                    ease: EASE,
                                }}
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
                                            stopOpacity="0.3"
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor={tint}
                                            stopOpacity="0"
                                        />
                                    </linearGradient>
                                </defs>
                                {points.length > 1 && (
                                    <path
                                        d={`${line} L100,30 L0,30 Z`}
                                        fill={`url(#${gradientId})`}
                                    />
                                )}
                                <path
                                    d={line}
                                    fill="none"
                                    stroke={tint}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </motion.svg>
                            <div
                                aria-hidden="true"
                                className="absolute inset-0 flex"
                            >
                                {trend.map((day, index) => (
                                    <div
                                        key={day.day}
                                        data-testid="week-hover"
                                        className="group h-full min-w-0 flex-1"
                                    >
                                        {/* Placed at the point of the line, not in the middle of the cell. */}
                                        <span
                                            className="absolute inset-y-0 w-px bg-(--border-color-strong) opacity-0 transition-opacity group-hover:opacity-100"
                                            style={{
                                                left: `${points[index].x}%`,
                                            }}
                                        />
                                        <span
                                            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full transition-transform group-hover:scale-100"
                                            style={{
                                                backgroundColor: tint,
                                                left: `${points[index].x}%`,
                                                top: `${(points[index].y / 30) * 100}%`,
                                            }}
                                        />
                                        <span
                                            className={cn(TOOLTIP, '-top-7')}
                                            style={{
                                                left: `${points[index].x}%`,
                                                // The first label starts at the left edge, the last ends at the right one.
                                                transform: `translateX(-${points[index].x}%)`,
                                            }}
                                        >
                                            {dayTip(day, tChoice, weekday)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <ul
                            aria-label={t('week_summary_card.per_day', {
                                days: describeDays(trend, weekday),
                            })}
                            className="m-0 flex h-14 min-h-0 list-none items-end gap-1.5 p-0"
                        >
                            {trend.map((day, index) => {
                                const isToday = day.day === todayLabel;
                                const isBest =
                                    showBest && week.best?.day === day.day;

                                return (
                                    <li
                                        key={day.day}
                                        className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                TOOLTIP,
                                                'left-1/2 top-0 -translate-x-1/2 -translate-y-full',
                                            )}
                                        >
                                            {dayTip(day, tChoice, weekday)}
                                        </span>
                                        <motion.span
                                            data-testid="week-bar"
                                            data-count={day.count}
                                            initial={{ height: 0 }}
                                            animate={{
                                                height: `${Math.max((day.count / max) * 100, 6)}%`,
                                            }}
                                            transition={{
                                                duration: DURATION.slow,
                                                ease: EASE,
                                                delay: 0.1 + rowDelay(index),
                                            }}
                                            className={cn(
                                                'block w-full max-w-4 rounded-t-sm',
                                                !isToday &&
                                                    !isBest &&
                                                    'bg-(--bg-light-color)',
                                            )}
                                            style={
                                                isToday || isBest
                                                    ? {
                                                          backgroundColor: tint,
                                                          opacity: isToday
                                                              ? 1
                                                              : 0.6,
                                                      }
                                                    : undefined
                                            }
                                        />
                                        <span className="text-[9px] font-semibold text-(--text-muted-color)">
                                            {weekday(day.day).charAt(0)}
                                            <span className="sr-only">
                                                {weekday(day.day).slice(1)}
                                            </span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default WeekSummaryCard;
