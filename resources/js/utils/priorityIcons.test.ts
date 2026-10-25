import { icons } from 'lucide-react';
import { describe, expect, test } from 'vitest';
import {
    DEFAULT_PRIORITY_ICON,
    PRIORITY_ICON_OPTIONS,
    resolvePriorityIcon,
} from './priorityIcons';

describe('priorityIcons', () => {
    test('every offered icon exists in lucide', () => {
        PRIORITY_ICON_OPTIONS.forEach((name) => {
            expect(icons[name]).toBeDefined();
        });
    });

    test('the offered icons are unique', () => {
        expect(new Set(PRIORITY_ICON_OPTIONS).size).toBe(
            PRIORITY_ICON_OPTIONS.length,
        );
    });

    test('the starter priorities use offered icons', () => {
        ['SignalHigh', 'SignalMedium', 'SignalLow'].forEach((name) => {
            expect(PRIORITY_ICON_OPTIONS).toContain(name);
        });
    });

    test('resolves a known icon to itself', () => {
        expect(resolvePriorityIcon('Flame')).toBe('Flame');
    });

    test('falls back to the default icon for an unknown name', () => {
        expect(resolvePriorityIcon('NotAnIcon')).toBe(DEFAULT_PRIORITY_ICON);
    });
});
