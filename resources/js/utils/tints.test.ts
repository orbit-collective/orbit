import { describe, expect, test } from 'vitest';
import * as tints from './tints';

describe('tints', () => {
    test('are built from theme variables, never hardcoded hex', () => {
        Object.values(tints).forEach((value) => {
            expect(value).toContain('var(--');
            expect(value).not.toMatch(/#[0-9a-fA-F]{3,6}/);
            expect(value).toContain('color-mix');
        });
    });

    test('success and error are distinct', () => {
        expect(tints.SUCCESS_TINT).toContain('--success-color');
        expect(tints.ERROR_TINT).toContain('--error-color');
    });
});
