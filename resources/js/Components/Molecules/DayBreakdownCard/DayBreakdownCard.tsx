import React, { useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import TrendBadge from '@/Components/Atoms/TrendBadge/TrendBadge';
import { DayBreakdownCardProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const DayBreakdownCard: React.FC<DayBreakdownCardProps> = ({
    title,
    icon,
    days,
    initialDayKey,
    headline,
    headlineTrend,
    emptyText = 'No data for these days.',
    className,
}) => {
    const [selectedKey, setSelectedKey] = useState(
        initialDayKey ?? days[days.length - 1]?.key,
    );
    const selected = days.find((day) => day.key === selectedKey) ?? days.at(-1);
    const total = selected?.rows.reduce((sum, row) => sum + row.value, 0) ?? 0;

    return (
        <section
            className={cn(
                'rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4 sm:p-5',
                className,
            )}
        >
            <header className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                    <Icon name={icon} size={15} />
                </span>
                <h3 className="text-sm font-semibold text-[var(--text-color)]">
                    {title}
                </h3>
            </header>

            {days.length === 0 || !selected ? (
                <p className="py-10 text-center text-sm text-[var(--text-gray-color)]">
                    {emptyText}
                </p>
            ) : (
                <>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <p
                            data-testid="headline"
                            className="text-2xl font-semibold tracking-tight text-[var(--text-color)]"
                        >
                            {headline(total)}
                        </p>
                        {headlineTrend && <TrendBadge {...headlineTrend} />}
                    </div>

                    <div
                        role="tablist"
                        aria-label={`${title} days`}
                        className="mt-5 flex justify-between gap-1 sm:gap-2"
                    >
                        {days.map((day) => {
                            const active = day.key === selected.key;
                            const hasData = day.rows.some(
                                (row) => row.value > 0,
                            );

                            return (
                                <button
                                    key={day.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setSelectedKey(day.key)}
                                    className={cn(
                                        'flex h-[5.25rem] min-w-0 max-w-[3.25rem] flex-1 flex-col items-center justify-center gap-1.5 rounded-full border-0 px-0.5 text-[11px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-color)]',
                                        active
                                            ? 'bg-[var(--accent-color)] text-white'
                                            : 'bg-[var(--bg-light-color)]/60 text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)]',
                                    )}
                                >
                                    <span className="text-[10px] uppercase opacity-70">
                                        {day.label.slice(0, 2)}
                                    </span>
                                    <span className="text-sm font-semibold">
                                        {day.dayNumber}
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'h-1 w-1 rounded-full',
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

                    <ul className="mt-5 divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)]">
                        {selected.rows.map((row) => (
                            <li
                                key={row.key}
                                className="flex items-center gap-3 px-3.5 py-2.5 text-sm"
                            >
                                <span
                                    aria-hidden="true"
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: row.color }}
                                />
                                <span className="min-w-0 flex-1 truncate text-[var(--text-gray-color)]">
                                    <strong className="mr-1 font-semibold text-[var(--text-color)]">
                                        {row.value}
                                    </strong>
                                    {row.label}
                                </span>
                                {row.delta !== undefined && (
                                    <TrendBadge
                                        value={row.delta}
                                        positiveIsGood={false}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
};

export default DayBreakdownCard;
