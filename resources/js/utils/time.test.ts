import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { formatDate, formatTimeAgo, formattedDate, parseDateKey } from './time';

const NOW = new Date('2026-07-08T12:00:00.000Z').getTime();
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('formatTimeAgo', () => {
    test('returns days when the difference is a day or more', () => {
        expect(formatTimeAgo(NOW - 2 * DAY)).toBe('2d');
    });

    test('returns hours when the difference is under a day', () => {
        expect(formatTimeAgo(NOW - 3 * HOUR)).toBe('3h');
    });

    test('returns minutes when the difference is under an hour', () => {
        expect(formatTimeAgo(NOW - 5 * MINUTE)).toBe('5m');
    });

    test('returns seconds when the difference is under a minute', () => {
        expect(formatTimeAgo(NOW - 10 * SECOND)).toBe('10s');
    });

    test('falls back to "now" when no timestamp is given', () => {
        expect(formatTimeAgo(undefined)).toBe('0s');
    });

    test('returns "0s" for the exact current instant', () => {
        expect(formatTimeAgo(NOW)).toBe('0s');
    });

    test('rounds down to whole units instead of the next one up', () => {
        expect(formatTimeAgo(NOW - (DAY - SECOND))).toBe('23h');
        expect(formatTimeAgo(NOW - (HOUR - SECOND))).toBe('59m');
        expect(formatTimeAgo(NOW - (MINUTE - SECOND))).toBe('59s');
    });
});

describe('formatDate', () => {
    test('formats a timestamp as "DD.MM HH:mm"', () => {
        expect(formatDate(NOW)).toMatch(/^\d{2}\.\d{2} \d{2}:\d{2}$/);
    });

    test('falls back to the current time when no timestamp is given', () => {
        expect(formatDate(undefined)).toMatch(/^\d{2}\.\d{2} \d{2}:\d{2}$/);
    });

    test('zero-pads single-digit day, month, hour and minute', () => {
        // Built from local date parts (not a UTC ISO string) so the
        // expectation matches regardless of the test runner's timezone.
        const earlyMorning = new Date(2026, 0, 5, 3, 7).getTime();
        expect(formatDate(earlyMorning)).toBe('05.01 03:07');
    });
});

describe('formattedDate', () => {
    test('returns a long, human-readable date for today', () => {
        const result = formattedDate();
        expect(result).toContain('2026');
        expect(result).toContain('July');
    });

    test('reflects the current system date when it changes', () => {
        vi.setSystemTime(new Date('2027-03-15T00:00:00.000Z').getTime());
        const result = formattedDate();
        expect(result).toContain('2027');
        expect(result).toContain('March');
    });
});

describe('parseDateKey', () => {
    test('parses a "YYYY-MM-DD" string into the matching local date', () => {
        const date = parseDateKey('2026-08-15');

        expect(date.getFullYear()).toBe(2026);
        expect(date.getMonth()).toBe(7); // August is month index 7
        expect(date.getDate()).toBe(15);
    });

    test('does not shift the date backward the way new Date("YYYY-MM-DD") can in western timezones', () => {
        const date = parseDateKey('2026-01-01');

        expect(date.getDate()).toBe(1);
        expect(date.getMonth()).toBe(0);
    });
});
