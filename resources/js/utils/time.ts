export function formatDate(dateString: string | number | undefined): string {
    const date = new Date(dateString || Date.now());
    const dayOfMonth = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${dayOfMonth}.${month} ${hours}:${minutes}`;
}
export function formatTimeAgo(dateString: string | number | undefined): string {
    const date = new Date(dateString || Date.now());
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
        return `${days}d`;
    } else if (hours > 0) {
        return `${hours}h`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return `${seconds}s`;
    }
}
export function formatShortDate(
    dateString: string | number | undefined,
): string {
    const date = new Date(dateString || Date.now());
    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
}
/** Parses a "YYYY-MM-DD" string as local-time date components, avoiding the
 * UTC-midnight-shifts-a-day-back pitfall of `new Date("YYYY-MM-DD")`. */
export function parseDateKey(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}
export const formattedDate = () => {
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };
    return new Date().toLocaleDateString('en-US', options);
};
