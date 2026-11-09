import { describe, expect, test } from 'vitest';
import { dateKeyOf, daysUntil, dueInfo, weekdayOf } from './dueDate';

// Tuesday 10 November 2026, mid afternoon.
const NOW = new Date(2026, 10, 10, 15, 30);

describe('daysUntil', () => {
    test('counts whole days from today, whatever the time of day', () => {
        expect(daysUntil('2026-11-10', NOW)).toBe(0);
        expect(daysUntil('2026-11-13', NOW)).toBe(3);
        expect(daysUntil('2026-11-09', NOW)).toBe(-1);
        expect(daysUntil('2026-11-10', new Date(2026, 10, 10, 0, 1))).toBe(0);
        expect(daysUntil('2026-11-10', new Date(2026, 10, 10, 23, 59))).toBe(0);
    });

    test('reads the day of a date that carries a time', () => {
        expect(daysUntil('2026-11-12 00:00:00', NOW)).toBe(2);
    });

    test('crosses a month and a year', () => {
        expect(daysUntil('2027-01-01', NOW)).toBe(52);
    });
});

describe('dueInfo', () => {
    test.each([
        ['2026-11-07', 'overdue', '3d overdue', '3 days overdue'],
        ['2026-11-09', 'overdue', '1d overdue', '1 day overdue'],
        ['2026-11-10', 'today', 'Today', 'due today'],
        ['2026-11-11', 'soon', 'Tomorrow', 'due tomorrow'],
        ['2026-11-14', 'soon', 'in 4d', 'due in 4 days'],
        ['2026-11-17', 'soon', 'in 7d', 'due in 7 days'],
        ['2026-11-18', 'later', 'Nov 18', 'due in 8 days'],
    ])('%s is %s ("%s")', (date, tone, label, spoken) => {
        expect(dueInfo(date, NOW)).toMatchObject({ tone, label, spoken });
    });

    test('says how many days away it is', () => {
        expect(dueInfo('2026-11-14', NOW).days).toBe(4);
        expect(dueInfo('2026-11-08', NOW).days).toBe(-2);
    });
});

test('weekdayOf and dateKeyOf name the days from today on', () => {
    expect(weekdayOf(0, NOW)).toBe('Tue');
    expect(weekdayOf(3, NOW)).toBe('Fri');
    expect(weekdayOf(-2, NOW)).toBe('Sun');
    expect(dateKeyOf(0, NOW)).toBe('2026-11-10');
    expect(dateKeyOf(25, NOW)).toBe('2026-12-05');
    expect(dateKeyOf(-10, NOW)).toBe('2026-10-31');
});
