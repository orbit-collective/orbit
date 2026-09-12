import { describe, expect, test } from 'vitest';
import { hashLabelColor, LABEL_COLOR_PALETTE } from './labelColors';

describe('LABEL_COLOR_PALETTE', () => {
    test('every swatch is a hex color', () => {
        LABEL_COLOR_PALETTE.forEach((swatch) => {
            expect(swatch).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });
});

describe('hashLabelColor', () => {
    test('returns a color from the palette', () => {
        expect(LABEL_COLOR_PALETTE).toContain(hashLabelColor('bug'));
    });

    test('is deterministic for the same name', () => {
        expect(hashLabelColor('feature')).toBe(hashLabelColor('feature'));
    });

    test('assigns different names to different colors most of the time', () => {
        const names = [
            'bug',
            'feature',
            'performance',
            'design',
            'ux',
            'chore',
        ];
        const colors = new Set(names.map(hashLabelColor));

        expect(colors.size).toBeGreaterThan(1);
    });
});
