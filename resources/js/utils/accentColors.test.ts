import { describe, expect, test } from 'vitest';
import {
    ACCENT_COLOR_OPTIONS,
    ACCENT_PALETTE,
    accentFromHex,
    DEFAULT_ACCENT_HEX,
    getAccentCssVariables,
    getAccentSwatch,
    isAccentColor,
    isHexColor,
} from './accentColors';

describe('accentColors', () => {
    describe('isAccentColor', () => {
        test.each(['default', 'blue', 'pink', '#3b82f6', '#ABCDEF'])(
            'accepts %s',
            (value) => expect(isAccentColor(value)).toBe(true),
        );

        test.each([
            [null],
            [''],
            ['mauve'],
            ['#fff'],
            ['3b82f6'],
            ['#3b82f6ff'],
            ['toString'],
        ])('rejects %s', (value) => expect(isAccentColor(value)).toBe(false));
    });

    test('isHexColor wants exactly six hex digits after the #', () => {
        expect(isHexColor('#00aa99')).toBe(true);
        expect(isHexColor('#00aa9')).toBe(false);
        expect(isHexColor('00aa99')).toBe(false);
    });

    describe('getAccentSwatch', () => {
        test('is the theme accent for default, the preset color for a name, the color itself for a hex', () => {
            expect(getAccentSwatch('default')).toBe(DEFAULT_ACCENT_HEX);
            expect(getAccentSwatch('blue')).toBe('#3b82f6');
            expect(getAccentSwatch('#00AA99')).toBe('#00aa99');
        });
    });

    describe('ACCENT_PALETTE', () => {
        test('lists the theme accent first, then every project color, as hex', () => {
            expect(ACCENT_PALETTE).toHaveLength(ACCENT_COLOR_OPTIONS.length);
            expect(ACCENT_PALETTE[0]).toBe(DEFAULT_ACCENT_HEX);
            expect(ACCENT_PALETTE).toContain('#3b82f6');
            ACCENT_PALETTE.forEach((color) =>
                expect(isHexColor(color)).toBe(true),
            );
        });
    });

    describe('accentFromHex', () => {
        test('the theme accent stays "default" so it keeps following the theme', () => {
            expect(accentFromHex('#8844DA')).toBe('default');
        });

        test('a preset color becomes its name', () => {
            expect(accentFromHex('#3b82f6')).toBe('blue');
            expect(accentFromHex('#EC4899')).toBe('pink');
        });

        test('any other color is kept as a lower-case hex', () => {
            expect(accentFromHex('#00AA99')).toBe('#00aa99');
        });
    });

    describe('getAccentCssVariables', () => {
        test('is null for default, so the theme value applies', () => {
            expect(getAccentCssVariables('default', 'dark')).toBeNull();
        });

        test('uses the preset base and light for a name', () => {
            expect(getAccentCssVariables('green', 'dark')).toEqual({
                accentColor: '#22c55e',
                accentLightColor: '#4ade80',
                accentColorOpacity: 'rgba(34, 197, 94, 0.2)',
            });
        });

        test('derives a lighter shade for a custom color', () => {
            expect(getAccentCssVariables('#000000', 'dark')).toEqual({
                accentColor: '#000000',
                accentLightColor: '#404040',
                accentColorOpacity: 'rgba(0, 0, 0, 0.2)',
            });
        });

        test('a custom color has a fainter wash in the light theme', () => {
            expect(
                getAccentCssVariables('#00aa99', 'light')?.accentColorOpacity,
            ).toBe('rgba(0, 170, 153, 0.12)');
        });

        test('a custom color is normalised to lower case', () => {
            expect(getAccentCssVariables('#00AA99', 'dark')?.accentColor).toBe(
                '#00aa99',
            );
        });
    });
});
