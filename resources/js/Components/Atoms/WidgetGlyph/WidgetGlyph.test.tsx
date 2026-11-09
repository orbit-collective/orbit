import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { makeWidget } from '@/tests/dashboardLayout';
import { DashboardWidgetType } from '@/types/Dashboard';
import WidgetGlyph from './WidgetGlyph';

const TYPES: DashboardWidgetType[] = [
    'stat_projects',
    'stat_open_issues',
    'stat_critical',
    'stat_resolution',
    'trend',
    'completion',
    'priority_breakdown',
    'activity',
    'projects',
    'stat_overdue',
    'stat_assigned',
    'stat_due_soon',
    'my_issues',
    'deadlines',
    'types_breakdown',
    'week_summary',
    'quick_actions',
    'greeting',
];

describe('WidgetGlyph', () => {
    test.each(TYPES)('draws a %s widget', (type) => {
        render(<WidgetGlyph widget={makeWidget(type)} />);

        const glyph = screen.getByTestId('widget-glyph');
        expect(glyph).toHaveAttribute('data-type', type);
        expect(glyph.children.length).toBeGreaterThan(0);
    });

    test('says which style it draws', () => {
        render(
            <WidgetGlyph widget={makeWidget('trend', { variant: 'area' })} />,
        );

        expect(screen.getByTestId('widget-glyph')).toHaveAttribute(
            'data-variant',
            'area',
        );
    });

    test('every style of every kind draws something different from its neighbours', () => {
        const drawings = new Map<string, string>();
        const variants: Partial<Record<DashboardWidgetType, string[]>> = {
            stat_projects: ['default', 'vivid', 'accent', 'glass', 'outline'],
            trend: ['bars', 'line', 'area'],
            completion: ['bars', 'ring', 'stacked'],
            priority_breakdown: ['bar', 'list', 'donut'],
            activity: ['feed', 'compact'],
            projects: ['cards', 'grid', 'compact'],
            my_issues: ['list', 'compact', 'cards'],
            deadlines: ['list', 'timeline', 'week'],
            types_breakdown: ['bar', 'list', 'donut'],
            week_summary: ['numbers', 'sparkline', 'bars'],
            quick_actions: ['grid', 'list', 'bar'],
            greeting: ['banner', 'compact', 'minimal'],
        };

        for (const [type, styles] of Object.entries(variants)) {
            for (const variant of styles!) {
                const { container, unmount } = render(
                    <WidgetGlyph
                        widget={makeWidget(type as DashboardWidgetType, {
                            variant,
                        })}
                    />,
                );
                drawings.set(`${type}/${variant}`, container.innerHTML);
                unmount();
            }

            const own = styles!.map((variant) =>
                drawings.get(`${type}/${variant}`),
            );
            expect(new Set(own).size).toBe(styles!.length);
        }
    });

    test('the trend draws bars, a line or an area', () => {
        const { container, rerender } = render(
            <WidgetGlyph widget={makeWidget('trend')} />,
        );
        expect(container.querySelector('svg')).toBeNull();

        rerender(
            <WidgetGlyph widget={makeWidget('trend', { variant: 'line' })} />,
        );
        expect(container.querySelectorAll('path')).toHaveLength(1);

        rerender(
            <WidgetGlyph widget={makeWidget('trend', { variant: 'area' })} />,
        );
        expect(container.querySelectorAll('path')).toHaveLength(2);
    });

    test('a preview is gray: no kind, style or option brings a color in', () => {
        const colored = /(accent|success|warning|error|info)-color/;
        const variants: Partial<Record<DashboardWidgetType, string[]>> = {
            stat_projects: ['default', 'vivid', 'accent', 'glass', 'outline'],
            stat_critical: ['accent'],
            trend: ['bars', 'line', 'area'],
            completion: ['bars', 'ring', 'stacked'],
            priority_breakdown: ['bar', 'list', 'donut'],
            activity: ['feed', 'compact'],
            projects: ['cards', 'grid', 'compact'],
            my_issues: ['list', 'compact', 'cards'],
            deadlines: ['list', 'timeline', 'week'],
            types_breakdown: ['bar', 'list', 'donut'],
            week_summary: ['numbers', 'sparkline', 'bars'],
            quick_actions: ['grid', 'list', 'bar'],
            greeting: ['banner', 'compact', 'minimal'],
        };

        for (const [type, styles] of Object.entries(variants)) {
            for (const variant of styles!) {
                const { container, unmount } = render(
                    <WidgetGlyph
                        widget={makeWidget(type as DashboardWidgetType, {
                            variant,
                            config: { color: 'success' },
                        })}
                    />,
                );

                expect(container.innerHTML).not.toMatch(colored);
                unmount();
            }
        }
    });

    test('the color a widget was given does not change how it is drawn', () => {
        const a = render(
            <WidgetGlyph
                widget={makeWidget('trend', {
                    variant: 'line',
                    config: { color: 'success' },
                })}
            />,
        );
        const first = a.container.innerHTML;
        a.unmount();
        const b = render(
            <WidgetGlyph
                widget={makeWidget('trend', {
                    variant: 'line',
                    config: { color: 'error' },
                })}
            />,
        );

        expect(b.container.innerHTML).toBe(first);
    });

    test('hiding the grid leaves no dashed lines', () => {
        const withGrid = render(<WidgetGlyph widget={makeWidget('trend')} />);
        const lines =
            withGrid.container.querySelectorAll('.border-dashed').length;
        withGrid.unmount();

        const { container } = render(
            <WidgetGlyph
                widget={makeWidget('trend', {
                    config: {
                        grid: 'off',
                        header: 'on',
                        values: 'hover',
                        today: 'on',
                        color: 'accent',
                    },
                })}
            />,
        );

        expect(lines).toBeGreaterThan(0);
        expect(container.querySelectorAll('.border-dashed')).toHaveLength(0);
    });

    test('a widget that hides its title is drawn without one', () => {
        const shown = render(<WidgetGlyph widget={makeWidget('completion')} />);
        const withTitle = shown.container.querySelectorAll('span').length;
        shown.unmount();

        const { container } = render(
            <WidgetGlyph
                widget={makeWidget('completion', {
                    config: { header: 'off', tier: 'off' },
                })}
            />,
        );

        expect(container.querySelectorAll('span').length).toBeLessThan(
            withTitle,
        );
    });

    test('the pagination of the feed is drawn only when it is on', () => {
        const on = render(<WidgetGlyph widget={makeWidget('activity')} />);
        const withPaging = on.container.querySelectorAll('.border-t').length;
        on.unmount();
        const off = render(
            <WidgetGlyph
                widget={makeWidget('activity', {
                    config: { header: 'on', pagination: 'off' },
                })}
            />,
        );

        expect(withPaging).toBe(1);
        expect(off.container.querySelectorAll('.border-t')).toHaveLength(0);
    });

    test('a statistic can leave its icon out', () => {
        const withIcon = render(
            <WidgetGlyph
                widget={makeWidget('stat_projects', { variant: 'vivid' })}
            />,
        );
        const count = withIcon.container.querySelectorAll('span').length;
        withIcon.unmount();

        const { container } = render(
            <WidgetGlyph
                widget={makeWidget('stat_projects', {
                    variant: 'vivid',
                    config: { icon: 'off' },
                })}
            />,
        );

        expect(container.querySelectorAll('span').length).toBeLessThan(count);
    });
});
