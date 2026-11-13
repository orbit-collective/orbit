import { parseDateKey } from '@/utils/time';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How a due date stands against today, which sets the tone of its chip. */
export type DueTone = 'overdue' | 'today' | 'soon' | 'later';

export interface DueInfo {
    /** Days from today to the end date; negative when it is past. */
    days: number;
    tone: DueTone;
    /** What a chip says: "3d overdue", "Today", "Tomorrow", "in 4d", "Nov 20". */
    label: string;
    /** A sentence for assistive technology: "due in 4 days". */
    spoken: string;
}

const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** The whole days from `now` to an end date (`YYYY-MM-DD`), in local time. */
export const daysUntil = (endDate: string, now: Date = new Date()): number =>
    Math.round(
        (parseDateKey(endDate.slice(0, 10)).getTime() -
            startOfDay(now).getTime()) /
            DAY_MS,
    );

type Translate = (
    key: string,
    replacements?: Record<string, string | number>,
) => string;

/** "3d": the count with the day unit of the language. */
const short = (count: number, t: Translate) =>
    `${count}${t('util_due_date.unit_day')}`;

const plural = (count: number, t?: Translate) => {
    if (!t) return `${count} day${count === 1 ? '' : 's'}`;

    return count === 1
        ? t('util_due_date.day_one')
        : t('util_due_date.day_other', { count });
};

/**
 * Describes an end date for the dashboard: how far, how it is said, what tone.
 * Pass `t` (and the `locale` of the date) to translate; the English wording is
 * the default.
 */
export function dueInfo(
    endDate: string,
    now: Date = new Date(),
    t?: Translate,
    locale: string = 'en-US',
): DueInfo {
    const days = daysUntil(endDate, now);

    if (days < 0) {
        return {
            days,
            tone: 'overdue',
            label: t
                ? t('util_due_date.overdue', { days: short(-days, t) })
                : `${-days}d overdue`,
            spoken: t
                ? t('util_due_date.overdue_spoken', {
                      duration: plural(-days, t),
                  })
                : `${plural(-days)} overdue`,
        };
    }

    if (days === 0) {
        return {
            days,
            tone: 'today',
            label: t ? t('util_due_date.today') : 'Today',
            spoken: t ? t('util_due_date.due_today') : 'due today',
        };
    }

    if (days === 1) {
        return {
            days,
            tone: 'soon',
            label: t ? t('util_due_date.tomorrow') : 'Tomorrow',
            spoken: t ? t('util_due_date.due_tomorrow') : 'due tomorrow',
        };
    }

    if (days <= 7) {
        return {
            days,
            tone: 'soon',
            label: t
                ? t('util_due_date.in_days', { days: short(days, t) })
                : `in ${days}d`,
            spoken: t
                ? t('util_due_date.due_in_spoken', {
                      duration: plural(days, t),
                  })
                : `due in ${plural(days)}`,
        };
    }

    return {
        days,
        tone: 'later',
        label: parseDateKey(endDate.slice(0, 10)).toLocaleDateString(locale, {
            month: 'short',
            day: 'numeric',
        }),
        spoken: t
            ? t('util_due_date.due_in_spoken', { duration: plural(days, t) })
            : `due in ${plural(days)}`,
    };
}

/** The day `offset` calendar days from `now`; a clock change never shifts it. */
const dayAfter = (now: Date, offset: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);

/** "Mon", "Tue"... for the day `offset` days from `now`. */
export const weekdayOf = (
    offset: number,
    now: Date = new Date(),
    locale: string = 'en-US',
): string =>
    dayAfter(now, offset).toLocaleDateString(locale, { weekday: 'short' });

/** The `YYYY-MM-DD` of the day `offset` days from `now`, in local time. */
export function dateKeyOf(offset: number, now: Date = new Date()): string {
    const date = dayAfter(now, offset);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
