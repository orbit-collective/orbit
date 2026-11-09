import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { makeWidget, makeStat } from '@/tests/dashboardLayout';
import LayoutPreview from './LayoutPreview';

describe('LayoutPreview', () => {
    test('draws a block per visible widget with its size on the grid', () => {
        render(
            <LayoutPreview
                widgets={[
                    makeWidget('trend', { width: 80, height: 90 }),
                    makeWidget('completion', { width: 40, height: 85 }),
                    makeStat('projects', { visible: false }),
                ]}
            />,
        );

        const blocks = screen.getAllByTestId('layout-preview-block');
        expect(blocks).toHaveLength(2);
        expect(blocks[0]).toHaveStyle({
            gridColumn: 'span 80',
            gridRow: 'span 90',
        });
        expect(blocks[1]).toHaveStyle({ gridColumn: 'span 40' });
    });

    test('says so when nothing is visible', () => {
        render(
            <LayoutPreview
                widgets={[makeWidget('trend', { visible: false })]}
            />,
        );

        expect(screen.getByText('Empty')).toBeInTheDocument();
        expect(
            screen.queryByTestId('layout-preview-block'),
        ).not.toBeInTheDocument();
    });

    test('is a picture, hidden from assistive technology', () => {
        render(<LayoutPreview widgets={[]} />);

        expect(screen.getByTestId('layout-preview')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
    });

    test('each block is drawn as the widget it stands for', () => {
        render(
            <LayoutPreview
                widgets={[
                    makeWidget('trend', { variant: 'line' }),
                    makeWidget('priority_breakdown', { variant: 'donut' }),
                ]}
            />,
        );

        const glyphs = screen.getAllByTestId('widget-glyph');
        expect(glyphs.map((glyph) => glyph.getAttribute('data-type'))).toEqual([
            'trend',
            'priority_breakdown',
        ]);
        expect(
            glyphs.map((glyph) => glyph.getAttribute('data-variant')),
        ).toEqual(['line', 'donut']);
    });

    test('two layouts with different styles are not drawn alike', () => {
        const a = render(
            <LayoutPreview
                widgets={[makeWidget('trend', { variant: 'bars' })]}
            />,
        );
        const first = a.container.innerHTML;
        a.unmount();
        const b = render(
            <LayoutPreview
                widgets={[makeWidget('trend', { variant: 'area' })]}
            />,
        );

        expect(b.container.innerHTML).not.toBe(first);
    });

    test('a block cannot make the grid grow with its content', () => {
        render(<LayoutPreview widgets={[makeStat('projects')]} />);

        expect(screen.getByTestId('layout-preview-block')).toHaveClass(
            'min-h-0',
            'overflow-hidden',
        );
    });

    describe('sizing by the measured width', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        const gridOf = () => screen.getByTestId('layout-preview-grid');

        test('hands a hundredth of the width to the drawings and sizes a row by it', () => {
            // 264px wide with 14px of frame: 250px of picture.
            vi.spyOn(
                HTMLElement.prototype,
                'clientWidth',
                'get',
            ).mockReturnValue(264);

            render(<LayoutPreview widgets={[makeWidget('trend')]} />);

            expect(gridOf().style.getPropertyValue('--u')).toBe('2.5px');
            expect(gridOf().style.gridAutoRows).toBe(`${2.5 / 3}px`);
        });

        test('uses a width of its own until it is measured', () => {
            render(<LayoutPreview widgets={[makeWidget('trend')]} />);

            // 240px less the frame.
            expect(gridOf().style.getPropertyValue('--u')).toBe('2.26px');
        });

        test('does not rely on container queries, which the stylesheet does not have', () => {
            const { container } = render(
                <LayoutPreview widgets={[makeWidget('trend')]} />,
            );

            expect(container.innerHTML).not.toMatch(/cqw|@container/);
        });
    });
});
