import { describe, expect, test } from 'vitest';
import { DashboardCatalogEntry, DashboardWidget } from '@/types/Dashboard';
import {
    createWidget,
    defaultConfig,
    moveWidget,
    requiredProps,
    sameLayout,
    shiftWidget,
    sizeAfterResize,
    gridItemStyle,
    updateWidget,
    visibleOptions,
    widgetLabel,
} from './dashboardLayout';

const widget = (
    id: string,
    overrides: Partial<DashboardWidget> = {},
): DashboardWidget => ({
    id,
    type: 'trend',
    variant: 'default',
    width: 80,
    height: 85,
    visible: true,
    config: {},
    ...overrides,
});

const entry = (
    type: DashboardCatalogEntry['type'],
    props: string[],
    overrides: Partial<DashboardCatalogEntry> = {},
): DashboardCatalogEntry => ({
    type,
    label: type,
    description: '',
    icon: 'Activity',
    variants: ['cards', 'compact'],
    minWidth: 30,
    defaultWidth: 40,
    minHeight: 40,
    defaultHeight: 85,
    options: [],
    props,
    ...overrides,
});

describe('moveWidget', () => {
    const list = [widget('a'), widget('b'), widget('c')];

    test('moves a widget forward to the place of another', () => {
        expect(moveWidget(list, 'a', 'c').map((w) => w.id)).toEqual([
            'b',
            'c',
            'a',
        ]);
    });

    test('moves a widget backward', () => {
        expect(moveWidget(list, 'c', 'a').map((w) => w.id)).toEqual([
            'c',
            'a',
            'b',
        ]);
    });

    test('keeps the list when nothing moves or an id is unknown', () => {
        expect(moveWidget(list, 'a', 'a')).toBe(list);
        expect(moveWidget(list, 'a', 'zzz')).toBe(list);
        expect(moveWidget(list, 'zzz', 'a')).toBe(list);
    });
});

describe('shiftWidget', () => {
    const list = [widget('a'), widget('b'), widget('c')];

    test('moves one place later and earlier', () => {
        expect(shiftWidget(list, 'a', 1).map((w) => w.id)).toEqual([
            'b',
            'a',
            'c',
        ]);
        expect(shiftWidget(list, 'c', -1).map((w) => w.id)).toEqual([
            'a',
            'c',
            'b',
        ]);
    });

    test('does nothing at the ends', () => {
        expect(shiftWidget(list, 'a', -1)).toBe(list);
        expect(shiftWidget(list, 'c', 1)).toBe(list);
        expect(shiftWidget(list, 'zzz', 1)).toBe(list);
    });
});

describe('updateWidget', () => {
    test('patches only the widget with that id', () => {
        const next = updateWidget([widget('a'), widget('b')], 'b', {
            visible: false,
            width: 120,
        });

        expect(next[0]).toEqual(widget('a'));
        expect(next[1]).toMatchObject({ visible: false, width: 120 });
    });
});

describe('createWidget', () => {
    test('starts visible with the defaults of the type', () => {
        const created = createWidget(
            entry('projects', ['projects'], {
                options: [
                    {
                        key: 'limit',
                        label: 'Shown',
                        options: [3, 5],
                        default: 3,
                    },
                ],
            }),
        );

        expect(created).toMatchObject({
            type: 'projects',
            variant: 'cards',
            width: 40,
            height: 85,
            visible: true,
            config: { limit: 3 },
        });
        expect(created.id).toMatch(/^projects-[a-z0-9]+$/);
    });

    test('gives each widget its own id', () => {
        const e = entry('trend', []);

        expect(createWidget(e).id).not.toBe(createWidget(e).id);
    });
});

test('defaultConfig is empty for a type without options', () => {
    expect(defaultConfig(entry('trend', []))).toEqual({});
});

describe('requiredProps', () => {
    const catalog = [
        entry('trend', ['productivity_trend']),
        entry('activity', ['activityLogs', 'users']),
        entry('completion', ['issueStats']),
    ];

    test('lists the props of the visible widgets once', () => {
        expect(
            requiredProps(
                [
                    widget('a', { type: 'completion' }),
                    widget('b', { type: 'completion' }),
                    widget('c', { type: 'activity' }),
                    widget('d', { type: 'trend', visible: false }),
                ],
                catalog,
            ),
        ).toEqual(['issueStats', 'activityLogs', 'users']);
    });

    test('ignores a widget type missing from the catalog', () => {
        expect(
            requiredProps([widget('a', { type: 'projects' })], catalog),
        ).toEqual([]);
    });
});

test('gridItemStyle passes the size to the cell as CSS variables', () => {
    expect(gridItemStyle(widget('a', { width: 33, height: 91 }))).toEqual({
        '--widget-width': 33,
        '--widget-height': 91,
    });
});

describe('sizeAfterResize', () => {
    const entry = { minWidth: 30, minHeight: 40 };
    const start = { width: 60, height: 80 };

    test('without snap every column and row counts', () => {
        expect(
            sizeAfterResize(start, { columns: 3.4, rows: -7.6 }, entry, false),
        ).toEqual({ width: 63, height: 72 });
    });

    test('with snap it lands on a twelfth of the width and on 40 pixels', () => {
        expect(
            sizeAfterResize(start, { columns: 4, rows: 4 }, entry, true),
        ).toEqual({ width: 60, height: 80 });
        expect(
            sizeAfterResize(start, { columns: 6, rows: 6 }, entry, true),
        ).toEqual({ width: 70, height: 90 });
    });

    test('never gets smaller than the type allows', () => {
        expect(
            sizeAfterResize(start, { columns: -500, rows: -500 }, entry, false),
        ).toEqual({ width: 30, height: 40 });
        expect(
            sizeAfterResize(start, { columns: -500, rows: -500 }, entry, true),
        ).toEqual({ width: 30, height: 40 });
    });

    test('a dimension that was not dragged is left exactly as it was', () => {
        const odd = { width: 77, height: 83 };

        expect(
            sizeAfterResize(odd, { columns: 14, rows: 0 }, entry, true),
        ).toEqual({ width: 90, height: 83 });
        expect(
            sizeAfterResize(odd, { columns: 0, rows: 14 }, entry, true),
        ).toEqual({ width: 77, height: 100 });
        expect(
            sizeAfterResize(odd, { columns: 0, rows: 0 }, entry, true),
        ).toEqual(odd);
    });

    test('a dimension that was not dragged is not pulled up to the minimum either (the dragged one is)', () => {
        expect(
            sizeAfterResize(
                { width: 10, height: 10 },
                { columns: 0, rows: 5 },
                entry,
                false,
            ),
        ).toEqual({ width: 10, height: 40 });
    });

    test('never gets wider than the dashboard or taller than the maximum', () => {
        expect(
            sizeAfterResize(start, { columns: 500, rows: 5000 }, entry, false),
        ).toEqual({ width: 120, height: 400 });
    });
});

test('sameLayout compares widgets by value', () => {
    expect(sameLayout([widget('a')], [widget('a')])).toBe(true);
    expect(sameLayout([widget('a')], [widget('a', { width: 60 })])).toBe(false);
});

describe('visibleOptions', () => {
    const statEntry = {
        options: [
            {
                key: 'metric',
                label: 'Shows',
                options: ['projects', 'open_issues'],
                default: 'open_issues',
            },
            {
                key: 'count',
                label: 'Count',
                options: ['open', 'done'],
                default: 'open',
                when: { metric: ['open_issues'] },
            },
            {
                key: 'show',
                label: 'As',
                options: ['value', 'percent'],
                default: 'value',
                when: { metric: ['open_issues'] },
            },
            {
                key: 'icon',
                label: 'Icon',
                options: ['on', 'off'],
                default: 'on',
            },
        ],
    };

    const keys = (config: DashboardWidget['config']) =>
        visibleOptions(statEntry, config).map((option) => option.key);

    test('keeps the options that apply to what the widget shows', () => {
        expect(keys({ metric: 'open_issues' })).toEqual([
            'metric',
            'count',
            'show',
            'icon',
        ]);
    });

    test('hides the options that apply to something else', () => {
        expect(keys({ metric: 'projects' })).toEqual(['metric', 'icon']);
    });

    test('judges a missing value by its default', () => {
        expect(keys({})).toContain('count');
    });
});

describe('widgetLabel', () => {
    test('names a statistic by the number it shows', () => {
        expect(
            widgetLabel(
                widget('s', { type: 'stat', config: { metric: 'overdue' } }),
                { label: 'Statistic' },
            ),
        ).toBe('Overdue Issues');
    });

    test('names the others by their kind', () => {
        expect(widgetLabel(widget('t'), { label: 'Productivity Trend' })).toBe(
            'Productivity Trend',
        );
        expect(widgetLabel(widget('t'))).toBe('trend');
    });
});
