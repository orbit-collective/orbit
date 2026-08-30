import { AVAILABLE_COLORS, ProjectColors } from '@/types/Projects';
import { describe, expect, test } from 'vitest';
import { getColorTheme } from './colors';

describe('getColorTheme', () => {
    test('returns the theme matching a known color name', () => {
        expect(getColorTheme('red').accent).toBe('bg-red-500');
        expect(getColorTheme('blue').accent).toBe('bg-blue-500');
    });

    test('falls back to the purple theme for an unknown color', () => {
        // Cast an invalid value to exercise the `|| colors.purple` fallback.
        expect(getColorTheme('turquoise' as ProjectColors)).toEqual(
            getColorTheme('purple'),
        );
    });

    test('falls back to the purple theme for an empty/undefined color', () => {
        expect(getColorTheme(undefined as unknown as ProjectColors)).toEqual(
            getColorTheme('purple'),
        );
    });

    test.each(AVAILABLE_COLORS)(
        'returns a complete, color-matched theme for "%s"',
        (color) => {
            const theme = getColorTheme(color);

            expect(theme).toEqual({
                badgeBg: `bg-${color}-500/10 text-${color}-400`,
                border: `hover:border-${color}-500/30 shadow-${color}-500/5`,
                gradient: `from-${color}-500/5 to-transparent`,
                accent: `bg-${color}-500`,
                textGroupHover: `group-hover:text-${color}-500`,
                iconText: `text-${color}-400`,
                ring: `stroke-${color}-500`,
            });
        },
    );
});
