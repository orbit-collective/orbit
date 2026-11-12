import { icons } from 'lucide-react';
import { describe, expect, test } from 'vitest';
import { iconRegistry } from '@/utils/iconRegistry';
import { isLucideIconName, lucideIconNames } from '@/utils/lucideIconNames';

describe('lucideIconNames', () => {
    test('lists exactly the icons the installed lucide-react exports', () => {
        // Fails after a lucide upgrade that adds, renames or removes icons:
        // regenerate utils/lucideIconNames.ts from Object.keys(icons).
        expect([...lucideIconNames()].sort()).toEqual(
            Object.keys(icons).sort(),
        );
    });

    test('knows a real icon and rejects an unknown name', () => {
        expect(isLucideIconName('Bell')).toBe(true);
        expect(isLucideIconName('NotARealIcon')).toBe(false);
    });

    test('every bundled registry icon is a real lucide icon', () => {
        for (const name of Object.keys(iconRegistry)) {
            expect(isLucideIconName(name)).toBe(true);
        }
    });
});
