import { describe, expect, test } from 'vitest';
import { areShortcutsSuspended, suspendShortcuts } from './shortcutSuspension';

describe('shortcutSuspension', () => {
    test('is active only while at least one suspension is held', () => {
        expect(areShortcutsSuspended()).toBe(false);

        const first = suspendShortcuts();
        const second = suspendShortcuts();
        first();
        expect(areShortcutsSuspended()).toBe(true);

        second();
        expect(areShortcutsSuspended()).toBe(false);
    });

    test('releasing twice does not release someone else', () => {
        const first = suspendShortcuts();
        const second = suspendShortcuts();

        first();
        first();
        expect(areShortcutsSuspended()).toBe(true);

        second();
        expect(areShortcutsSuspended()).toBe(false);
    });
});
