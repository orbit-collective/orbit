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

const plural = (count: number, word: string) =>
    `${count} ${word}${count === 1 ? '' : 's'}`;

/** Describes an end date for the dashboard: how far, how it is said, what tone. */
export function dueInfo(endDate: string, now: Date = new Date()): DueInfo {
    const days = daysUntil(endDate, now);

    if (days < 0) {
        return {
            days,
            tone: 'overdue',
            label: `${-days}d overdue`,
            spoken: `${plural(-days, 'day')} overdue`,
        };
    }

    if (days === 0) {
        return { days, tone: 'today', label: 'Today', spoken: 'due today' };
    }

    if (days === 1) {
        return {
            days,
            tone: 'soon',
            label: 'Tomorrow',
            spoken: 'due tomorrow',
        };
    }

    if (days <= 7) {
        return {
            days,
            tone: 'soon',
            label: `in ${days}d`,
            spoken: `due in ${plural(days, 'day')}`,
        };
    }

    return {
        days,
        tone: 'later',
        label: parseDateKey(endDate.slice(0, 10)).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        }),
        spoken: `due in ${plural(days, 'day')}`,
    };
}

/** The day `offset` calendar days from `now`; a clock change never shifts it. */
const dayAfter = (now: Date, offset: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);

/** "Mon", "Tue"... for the day `offset` days from `now`. */
export const weekdayOf = (offset: number, now: Date = new Date()): string =>
    dayAfter(now, offset).toLocaleDateString('en-US', { weekday: 'short' });

/** The `YYYY-MM-DD` of the day `offset` days from `now`, in local time. */
export function dateKeyOf(offset: number, now: Date = new Date()): string {
    const date = dayAfter(now, offset);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
