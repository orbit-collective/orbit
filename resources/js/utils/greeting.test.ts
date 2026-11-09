import { describe, expect, test } from 'vitest';
import { firstName, greetingFor } from './greeting';

const at = (hour: number) => new Date(2026, 10, 10, hour, 0);

describe('greetingFor', () => {
    test.each([
        [5, 'morning', 'Good morning', 'Sunrise'],
        [11, 'morning', 'Good morning', 'Sunrise'],
        [12, 'afternoon', 'Good afternoon', 'Sun'],
        [17, 'afternoon', 'Good afternoon', 'Sun'],
        [18, 'evening', 'Good evening', 'Sunset'],
        [21, 'evening', 'Good evening', 'Sunset'],
        [22, 'night', 'Good night', 'Moon'],
        [0, 'night', 'Good night', 'Moon'],
        [4, 'night', 'Good night', 'Moon'],
    ])('at %i:00 it is %s', (hour, period, text, icon) => {
        expect(greetingFor(at(hour))).toEqual({ period, text, icon });
    });
});

describe('firstName', () => {
    test('takes the first word', () => {
        expect(firstName('Jane Cooper')).toBe('Jane');
        expect(firstName('  Jane   Cooper ')).toBe('Jane');
    });

    test('is null without a name', () => {
        expect(firstName('')).toBeNull();
        expect(firstName('   ')).toBeNull();
        expect(firstName(undefined)).toBeNull();
        expect(firstName(null)).toBeNull();
    });
});
