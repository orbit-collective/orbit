export function formatDate(dateString: string | number | undefined): string {
    const date = new Date(dateString || Date.now());
    const dayOfMonth = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${dayOfMonth}.${month} ${hours}:${minutes}`;
}
export function formatTimeAgo(
    dateString: string | number | undefined,
    t?: (key: string) => string,
): string {
    const date = new Date(dateString || Date.now());
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const unit = (name: string, count: number, english: string) =>
        t ? `${count}${t(`util_time.${name}`)}` : `${count}${english}`;
    if (days > 0) {
        return unit('days', days, 'd');
    } else if (hours > 0) {
        return unit('hours', hours, 'h');
    } else if (minutes > 0) {
        return unit('minutes', minutes, 'm');
    } else {
        return unit('seconds', seconds, 's');
    }
}
export function formatShortDate(
    dateString: string | number | undefined,
    locale: string = 'en-US',
): string {
    const date = new Date(dateString || Date.now());
    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    };
    return date.toLocaleDateString(locale, options);
}
/** Parses a "YYYY-MM-DD" string as local-time date components, avoiding the
 * UTC-midnight-shifts-a-day-back pitfall of `new Date("YYYY-MM-DD")`. */
export function parseDateKey(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}
/** Formats a "YYYY-MM-DD" string as e.g. "Sun, 11 Oct 2026". */
export function formatWeekdayDate(
    dateString: string,
    locale: string = 'en-US',
): string {
    const date = parseDateKey(dateString.slice(0, 10));
    const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
    const month = date.toLocaleDateString(locale, { month: 'short' });

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
}
export const formattedDate = (locale: string = 'en-US') => {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };
    return new Date().toLocaleDateString(locale, options);
};

/** The BCP 47 tag `Intl` and `toLocale*String` want for an app locale ('pl' -> 'pl-PL'). */
export const intlLocale = (locale: string | undefined): string =>
    locale === 'pl' ? 'pl-PL' : 'en-US';

const WEEKDAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Short weekday in the app language for a weekday id the server sends
 * ("Mon".."Sun", English). The id stays the key; unknown ids pass through.
 */
export const localizedWeekday = (
    key: string,
    locale: string | undefined,
): string => {
    const index = WEEKDAY_KEYS.indexOf(key);
    if (index === -1) return key;

    // 5 January 2026 is a Monday.
    return new Date(2026, 0, 5 + index).toLocaleDateString(intlLocale(locale), {
        weekday: 'short',
    });
};
