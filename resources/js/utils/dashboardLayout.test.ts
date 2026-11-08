import { describe, expect, test } from 'vitest';
import { DashboardCatalogEntry, DashboardWidget } from '@/types/Dashboard';
import {
    createWidget,
    defaultConfig,
    moveWidget,
    requiredProps,
    sameLayout,
    shiftWidget,
    spanClass,
    updateWidget,
} from './dashboardLayout';

const widget = (
    id: string,
    overrides: Partial<DashboardWidget> = {},
): DashboardWidget => ({
    id,
    type: 'trend',
    variant: 'default',
    span: 8,
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
    spans: [4, 6],
    defaultSpan: 4,
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
            span: 12,
        });

        expect(next[0]).toEqual(widget('a'));
        expect(next[1]).toMatchObject({ visible: false, span: 12 });
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
            span: 4,
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

test('spanClass maps a width to its classes and falls back to full width', () => {
    expect(spanClass(8)).toBe('col-span-12 lg:col-span-8');
    expect(spanClass(7)).toBe('col-span-12');
});

test('sameLayout compares widgets by value', () => {
    expect(sameLayout([widget('a')], [widget('a')])).toBe(true);
    expect(sameLayout([widget('a')], [widget('a', { span: 6 })])).toBe(false);
});
