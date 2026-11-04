import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import React, { KeyboardEvent, useId, useRef, useState } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import TrendBadge from '@/Components/Atoms/TrendBadge/TrendBadge';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import Collapse from '@/Components/Molecules/Collapse/Collapse';
import { DayBreakdownCardProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { DURATION, EASE, SPRING, STAGGER } from '@/utils/motion';

const DayBreakdownCard: React.FC<DayBreakdownCardProps> = ({
    title,
    icon,
    days,
    initialDayKey,
    headline,
    headlineTrend,
    emptyText = 'No data for these days.',
    collapsed = false,
    onToggleCollapse,
    collapsedSummary,
    className,
}) => {
    const bodyId = useId();
    const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [selectedKey, setSelectedKey] = useState(
        initialDayKey ?? days[days.length - 1]?.key,
    );
    const selected = days.find((day) => day.key === selectedKey) ?? days.at(-1);
    const total = selected?.rows.reduce((sum, row) => sum + row.value, 0) ?? 0;

    const select = (key: string) => {
        setSelectedKey(key);
        tabs.current[key]?.focus();
    };

    // Arrow keys, Home and End move between days; TAB still visits every pill.
    const onKeyDown = (event: KeyboardEvent, index: number) => {
        const target = {
            ArrowRight: days[index + 1],
            ArrowLeft: days[index - 1],
            Home: days[0],
            End: days[days.length - 1],
        }[event.key];

        if (target) {
            event.preventDefault();
            select(target.key);
        }
    };

    return (
        <section
            className={cn(
                'rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4 sm:p-5',
                className,
            )}
        >
            <CardHeader
                icon={icon}
                title={title}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
                collapsedSummary={collapsedSummary}
                controls={bodyId}
            />

            <Collapse id={bodyId} open={!collapsed}>
                {days.length === 0 || !selected ? (
                    <p className="py-10 text-center text-sm text-[var(--text-gray-color)]">
                        {emptyText}
                    </p>
                ) : (
                    <>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.p
                                    key={headline(total)}
                                    data-testid="headline"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{
                                        duration: DURATION.fast,
                                        ease: EASE,
                                    }}
                                    className="text-2xl font-semibold tracking-tight text-[var(--text-color)]"
                                >
                                    {headline(total)}
                                </motion.p>
                            </AnimatePresence>
                            {headlineTrend && <TrendBadge {...headlineTrend} />}
                        </div>

                        <LayoutGroup id={bodyId}>
                            <div
                                role="tablist"
                                aria-label={`${title} days`}
                                className="mt-5 flex justify-between gap-1 sm:gap-2"
                            >
                                {days.map((day, index) => {
                                    const active = day.key === selected.key;
                                    const hasData = day.rows.some(
                                        (row) => row.value > 0,
                                    );

                                    return (
                                        <button
                                            key={day.key}
                                            ref={(el) => {
                                                tabs.current[day.key] = el;
                                            }}
                                            id={`${bodyId}-tab-${day.key}`}
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            aria-controls={`${bodyId}-panel`}
                                            onClick={() =>
                                                setSelectedKey(day.key)
                                            }
                                            onKeyDown={(event) =>
                                                onKeyDown(event, index)
                                            }
                                            className={cn(
                                                'relative flex h-[5.25rem] min-w-0 max-w-[3.25rem] flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-full border-0 px-0.5 text-[11px] transition-colors duration-200',
                                                FOCUS_RING,
                                                active
                                                    ? 'text-white'
                                                    : 'bg-[var(--bg-light-color)]/60 text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
                                            )}
                                        >
                                            {active && (
                                                <motion.span
                                                    layoutId="day-indicator"
                                                    transition={SPRING}
                                                    aria-hidden="true"
                                                    className="absolute inset-0 rounded-full bg-[var(--accent-color)]"
                                                />
                                            )}
                                            <span className="relative text-[10px] uppercase opacity-70">
                                                {day.label.slice(0, 2)}
                                            </span>
                                            <span className="relative text-sm font-semibold">
                                                {day.dayNumber}
                                            </span>
                                            <span
                                                aria-hidden="true"
                                                className={cn(
                                                    'relative h-1 w-1 rounded-full transition-colors duration-200',
                                                    hasData
                                                        ? active
                                                            ? 'bg-white'
                                                            : 'bg-[var(--accent-color)]'
                                                        : 'bg-transparent',
                                                )}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </LayoutGroup>

                        <div
                            role="tabpanel"
                            id={`${bodyId}-panel`}
                            aria-labelledby={`${bodyId}-tab-${selected.key}`}
                            className="mt-5"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.ul
                                    key={selected.key}
                                    initial="hidden"
                                    animate="show"
                                    exit="hidden"
                                    variants={{
                                        hidden: { opacity: 0 },
                                        show: {
                                            opacity: 1,
                                            transition: {
                                                staggerChildren: STAGGER / 2,
                                            },
                                        },
                                    }}
                                    transition={{ duration: DURATION.fast }}
                                    className="divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)]"
                                >
                                    {selected.rows.map((row) => (
                                        <motion.li
                                            key={row.key}
                                            variants={{
                                                hidden: { opacity: 0, x: -10 },
                                                show: {
                                                    opacity: 1,
                                                    x: 0,
                                                    transition: {
                                                        duration: DURATION.base,
                                                        ease: EASE,
                                                    },
                                                },
                                            }}
                                            className="flex items-center gap-3 px-3.5 py-2.5 text-sm"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                style={{
                                                    backgroundColor: row.color,
                                                }}
                                            />
                                            <span className="min-w-0 flex-1 truncate text-[var(--text-gray-color)]">
                                                <strong className="mr-1 font-semibold text-[var(--text-color)]">
                                                    <AnimatedNumber
                                                        value={row.value}
                                                    />
                                                </strong>
                                                {row.label}
                                            </span>
                                            {row.delta !== undefined && (
                                                <TrendBadge
                                                    value={row.delta}
                                                    positiveIsGood={false}
                                                />
                                            )}
                                        </motion.li>
                                    ))}
                                </motion.ul>
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </Collapse>
        </section>
    );
};

export default DayBreakdownCard;
