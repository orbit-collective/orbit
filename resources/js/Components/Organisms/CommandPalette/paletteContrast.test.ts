import { describe, expect, test } from 'vitest';
import { composite, contrastRatio, parseColor, Rgb } from '@/utils/contrast';
import globalCss from '../../../../css/global.css?raw';

const sources = import.meta.glob(
    [
        '/resources/js/Components/Organisms/CommandPalette/CommandPalette.tsx',
        '/resources/js/Components/Molecules/CommandPaletteInput/CommandPaletteInput.tsx',
        '/resources/js/Components/Molecules/CommandPaletteGroup/CommandPaletteGroup.tsx',
        '/resources/js/Components/Molecules/CommandPaletteItem/CommandPaletteItem.tsx',
    ],
    { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

type Theme = 'dark' | 'light';

const tokens = (theme: Theme): Record<string, string> => {
    const block = new RegExp(
        `\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`,
    ).exec(globalCss);
    if (!block) throw new Error(`No ${theme} theme in global.css`);

    return Object.fromEntries(
        [...block[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [
            m[1],
            m[2],
        ]),
    );
};

const AA = 4.5;

describe.each(['dark', 'light'] as Theme[])(
    'palette contrast (%s)',
    (theme) => {
        const t = tokens(theme);
        const color = (name: string) => parseColor(t[name]);
        const solid = (name: string): Rgb => color(name).rgb;
        const page = solid('bg-color');
        const over = (name: string, base: Rgb): Rgb =>
            composite(color(name), base);

        const activeRow = over('bg-light-color-hover', page);
        const footer = solid('bg-dark-color');

        const cases: [string, Rgb, Rgb][] = [
            ['row title on the page', solid('text-color'), page],
            ['row title on the active row', solid('text-color'), activeRow],
            ['meta text on the page', solid('text-gray-color'), page],
            [
                'meta text on the active row',
                solid('text-gray-color'),
                activeRow,
            ],
            [
                'group label / placeholder on the page',
                solid('text-gray-color'),
                page,
            ],
            ['footer hints on the footer', solid('text-gray-color'), footer],
            [
                'match highlight on the page',
                solid('text-color'),
                over('accent-color-opacity', page),
            ],
            [
                'match highlight on the active row',
                solid('text-color'),
                over('accent-color-opacity', activeRow),
            ],
            [
                'shortcut chip (solid) on the active row',
                solid('text-gray-color'),
                page,
            ],
            [
                'shortcut chip (default) on the page',
                solid('text-gray-color'),
                over('bg-light-color', page),
            ],
            [
                'shortcut chip (default) on the footer',
                solid('text-gray-color'),
                over('bg-light-color', footer),
            ],
        ];

        test.each(cases)(
            '%s meets WCAG AA',
            (_label, foreground, background) => {
                expect(
                    contrastRatio(foreground, background),
                ).toBeGreaterThanOrEqual(AA);
            },
        );
    },
);

describe('palette markup', () => {
    test('uses no token that fails AA for text (--text-muted-color)', () => {
        const offenders = Object.entries(sources)
            .filter(([, source]) => source.includes('text-muted-color'))
            .map(([path]) => path);

        expect(Object.keys(sources).length).toBe(4);
        expect(offenders).toEqual([]);
    });

    test('--text-muted-color really is below AA, which is why it is avoided', () => {
        const dark = tokens('dark');
        const page = parseColor(dark['bg-color']).rgb;
        const muted = parseColor(dark['text-muted-color']).rgb;

        expect(contrastRatio(muted, page)).toBeLessThan(AA);
    });
});
