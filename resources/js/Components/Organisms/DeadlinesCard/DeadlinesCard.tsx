import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { FC } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import DashboardIssueRow from '@/Components/Molecules/DashboardIssueRow/DashboardIssueRow';
import { useElementWidth } from '@/hooks/useElementWidth';
import { DashboardIssueRow as Row } from '@/types/Dashboard';
import { cn } from '@/utils/cn';
import { getColorTheme } from '@/utils/colors';
import {
    DeadlineFilter,
    filterDeadlines,
    groupDeadlines,
} from '@/utils/dashboardIssues';
import { DueTone, daysUntil, weekdayOf } from '@/utils/dueDate';
import { FOCUS_RING_INSET } from '@/utils/focusRing';
import { DURATION, EASE, SPRING, rowDelay } from '@/utils/motion';

interface DeadlinesCardProps {
    issues: Row[];
    /** `list` rows, a `timeline` grouped by day, or the next seven days as a `week`. */
    variant?: string;
    scope?: DeadlineFilter['scope'];
    /** Whose issues `mine` means. */
    userId?: number;
    range?: number;
    overdue?: boolean;
    limit?: number;
    showHeader?: boolean;
    now?: Date;
}

const DOT_TONES: Record<DueTone, string> = {
    overdue: 'bg-[var(--error-color)]',
    today: 'bg-[var(--warning-color)]',
    soon: 'bg-[var(--accent-color)]',
    later: 'bg-[var(--text-muted-color)]',
};

const WEEK_DAYS = 7;

/** Below this width the days of a week are a row to scroll, not seven columns. */
const WEEK_COLUMNS_FROM = 520;

const Empty: FC<{ scope: string }> = ({ scope }) => (
    <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION.base, ease: EASE }}
        className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center"
    >
        <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-light-color)] text-[var(--success-color)]"
        >
            <Icon name="CalendarCheck" size={20} />
        </motion.span>
        <p className="m-0 text-sm font-semibold text-[var(--text-color)]">
            No deadlines ahead
        </p>
        <p className="m-0 max-w-[16rem] text-xs text-[var(--text-muted-color)]">
            {scope === 'mine'
                ? 'Nothing assigned to you is due in this time.'
                : 'Nothing in your projects is due in this time.'}
        </p>
    </motion.div>
);

/** What is due next, and what is late: as rows, a timeline or the days of the week. */
const DeadlinesCard: FC<DeadlinesCardProps> = ({
    issues,
    variant = 'list',
    scope = 'mine',
    userId,
    range = 14,
    overdue = true,
    limit = 10,
    showHeader = true,
    now,
}) => {
    const [ref, width] = useElementWidth<HTMLDivElement>();
    const today = now ?? new Date();
    const filter = { scope, userId, range, overdue, limit, now: today };
    // The week looks at its seven days, whatever the range is, and keeps the
    // overdue ones in a column of their own.
    const shown = filterDeadlines(
        issues,
        variant === 'week'
            ? { ...filter, range: WEEK_DAYS, limit: Number.MAX_SAFE_INTEGER }
            : filter,
    );
    const lateCount = shown.filter(
        (row) => row.endDate && daysUntil(row.endDate, today) < 0,
    ).length;
    const narrow = width > 0 && width < 360;

    let body;

    if (shown.length === 0) {
        body = <Empty scope={scope} />;
    } else if (variant === 'timeline') {
        const groups = groupDeadlines(shown, today);

        body = (
            <div className="min-h-0 flex-1 overflow-y-auto">
                <ol
                    aria-label="Deadlines by day"
                    className="relative m-0 flex list-none flex-col gap-4 p-0 pl-6"
                >
                    <motion.span
                        aria-hidden="true"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: DURATION.slow, ease: EASE }}
                        style={{ originY: 0 }}
                        className="absolute bottom-0 left-[7px] top-1 w-px bg-[var(--border-color-strong)]"
                    />
                    {groups.map((group, index) => (
                        <motion.li
                            key={group.key}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                                duration: DURATION.base,
                                ease: EASE,
                                delay: 0.1 + rowDelay(index),
                            }}
                            className="relative"
                        >
                            <motion.span
                                aria-hidden="true"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    ...SPRING,
                                    delay: 0.15 + rowDelay(index),
                                }}
                                className={cn(
                                    'absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-solid border-[var(--surface-color)]',
                                    DOT_TONES[group.tone],
                                )}
                            />
                            <h4 className="m-0 mb-1 flex items-center gap-2 text-xs font-semibold text-[var(--text-color)]">
                                {group.label}
                                <span className="rounded-full bg-[var(--bg-light-color)] px-1.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                    {group.rows.length}
                                    <span className="sr-only">
                                        {group.rows.length === 1
                                            ? ' issue'
                                            : ' issues'}
                                    </span>
                                </span>
                            </h4>
                            <ul
                                role="list"
                                className="m-0 flex list-none flex-col gap-0.5 p-0"
                            >
                                {group.rows.map((row) => (
                                    <li key={row.id} className="min-w-0">
                                        <DashboardIssueRow
                                            issue={row}
                                            density="compact"
                                            show={{
                                                due: group.key === 'overdue',
                                                priority: false,
                                            }}
                                            narrow={narrow}
                                            now={today}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </motion.li>
                    ))}
                </ol>
            </div>
        );
    } else if (variant === 'week') {
        const columns = Array.from({ length: WEEK_DAYS }, (_, offset) => ({
            offset,
            rows: shown.filter(
                (row) =>
                    row.endDate && daysUntil(row.endDate, today) === offset,
            ),
        }));
        const spread = width >= WEEK_COLUMNS_FROM;
        const late = overdue && lateCount > 0;

        body = (
            <ol
                aria-label="The next seven days"
                className={cn(
                    'm-0 flex min-h-0 flex-1 list-none gap-2 p-0 pb-1',
                    spread
                        ? 'overflow-y-auto'
                        : 'snap-x snap-mandatory overflow-x-auto',
                )}
            >
                {late && (
                    <WeekColumn
                        key="overdue"
                        title="Late"
                        sub=""
                        tone="overdue"
                        rows={shown.filter(
                            (row) =>
                                row.endDate &&
                                daysUntil(row.endDate, today) < 0,
                        )}
                        spread={spread}
                        index={0}
                    />
                )}
                {columns.map(({ offset, rows }, index) => (
                    <WeekColumn
                        key={offset}
                        title={
                            offset === 0 ? 'Today' : weekdayOf(offset, today)
                        }
                        sub={String(
                            new Date(
                                today.getFullYear(),
                                today.getMonth(),
                                today.getDate() + offset,
                            ).getDate(),
                        )}
                        tone={offset === 0 ? 'today' : 'later'}
                        rows={rows}
                        spread={spread}
                        index={index + (late ? 1 : 0)}
                    />
                ))}
            </ol>
        );
    } else {
        body = (
            <ul
                role="list"
                aria-label="Upcoming deadlines"
                className="m-0 flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-y-auto p-0"
            >
                {shown.map((row, index) => (
                    <motion.li
                        key={row.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: DURATION.base,
                            ease: EASE,
                            delay: rowDelay(index),
                        }}
                        className="min-w-0"
                    >
                        <DashboardIssueRow
                            issue={row}
                            show={{ priority: false }}
                            narrow={narrow}
                            now={today}
                        />
                    </motion.li>
                ))}
            </ul>
        );
    }

    return (
        <div
            ref={ref}
            className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)] p-4"
        >
            {showHeader && (
                <div className="flex items-center justify-between gap-2">
                    <h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                        Upcoming Deadlines
                    </h3>
                    <span className="text-[10px] font-medium text-[var(--text-muted-color)]">
                        {lateCount > 0
                            ? `${lateCount} overdue`
                            : `Next ${variant === 'week' ? WEEK_DAYS : range} days`}
                    </span>
                </div>
            )}
            {body}
        </div>
    );
};

interface WeekColumnProps {
    title: string;
    sub: string;
    tone: DueTone;
    rows: Row[];
    spread: boolean;
    index: number;
}

/** One day of the week view: its name, how many issues are due and the first few. */
const WeekColumn: FC<WeekColumnProps> = ({
    title,
    sub,
    tone,
    rows,
    spread,
    index,
}) => {
    const label = `${title}${sub ? ` ${sub}` : ''}, ${rows.length === 0 ? 'nothing due' : `${rows.length} due`}`;

    return (
        <motion.li
            aria-label={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: DURATION.base,
                ease: EASE,
                delay: rowDelay(index),
            }}
            className={cn(
                'flex min-w-[6.5rem] snap-start flex-col gap-1.5 rounded-lg border border-solid p-2',
                spread ? 'min-w-0 flex-1' : 'flex-none basis-[7.5rem]',
                tone === 'today'
                    ? 'border-[var(--accent-color)] bg-[color-mix(in_srgb,var(--accent-color)_8%,transparent)]'
                    : tone === 'overdue'
                      ? 'border-[color-mix(in_srgb,var(--error-color)_45%,transparent)] bg-[color-mix(in_srgb,var(--error-color)_6%,transparent)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-color-hover)]',
            )}
        >
            <div className="flex items-baseline justify-between gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-gray-color)]">
                    {title}
                </span>
                {sub && (
                    <span className="text-xs font-semibold tabular-nums text-[var(--text-color)]">
                        {sub}
                    </span>
                )}
            </div>
            {rows.length === 0 ? (
                <span
                    aria-hidden="true"
                    className="text-[11px] text-[var(--text-muted-color)]"
                >
                    Free
                </span>
            ) : (
                <ul
                    role="list"
                    className="m-0 flex list-none flex-col gap-1 p-0"
                >
                    {rows.slice(0, 3).map((row) => {
                        const theme = row.projectColor
                            ? getColorTheme(row.projectColor as never)
                            : null;

                        return (
                            <li key={row.id} className="min-w-0">
                                <Link
                                    href={`/projects/${row.projectId}/issues/${row.id}`}
                                    aria-label={`#${row.number} ${row.title}`}
                                    className={cn(
                                        'flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-[11px] text-[var(--text-color)] no-underline hover:bg-[var(--bg-light-color)]',
                                        FOCUS_RING_INSET,
                                    )}
                                >
                                    {theme && (
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'h-1.5 w-1.5 shrink-0 rounded-sm',
                                                theme.accent,
                                            )}
                                        />
                                    )}
                                    <span className="truncate">
                                        {row.title}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                    {rows.length > 3 && (
                        <li className="px-1 text-[10px] font-medium text-[var(--text-muted-color)]">
                            +{rows.length - 3} more
                        </li>
                    )}
                </ul>
            )}
        </motion.li>
    );
};

export default DeadlinesCard;
