import { describe, expect, test } from 'vitest';
import { composite, contrastRatio, parseColor } from './contrast';

describe('contrast helpers', () => {
    test('parses hex and both rgb() syntaxes', () => {
        expect(parseColor('#8a8f98')).toEqual({
            rgb: [138, 143, 152],
            alpha: 1,
        });
        expect(parseColor('rgb(255 255 255 / 0.08)')).toEqual({
            rgb: [255, 255, 255],
            alpha: 0.08,
        });
        expect(parseColor('rgba(136, 68, 218, 0.2)')).toEqual({
            rgb: [136, 68, 218],
            alpha: 0.2,
        });
        expect(parseColor('rgb(1, 2, 3)').alpha).toBe(1);
    });

    test('rejects a color it cannot read', () => {
        expect(() => parseColor('hsl(0 0% 0%)')).toThrow('Unsupported color');
    });

    test('composites a translucent color over a background', () => {
        expect(
            composite({ rgb: [255, 255, 255], alpha: 0.5 }, [0, 0, 0]),
        ).toEqual([128, 128, 128]);
    });

    test('matches the WCAG reference ratios', () => {
        expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
        expect(contrastRatio([255, 255, 255], [255, 255, 255])).toBeCloseTo(
            1,
            5,
        );
        // order does not matter
        expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
    });
});
