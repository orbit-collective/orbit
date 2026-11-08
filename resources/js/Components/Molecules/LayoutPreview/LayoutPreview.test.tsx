import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { makeWidget } from '@/tests/dashboardLayout';
import LayoutPreview from './LayoutPreview';

describe('LayoutPreview', () => {
    test('draws a block per visible widget with its size on the grid', () => {
        render(
            <LayoutPreview
                widgets={[
                    makeWidget('trend', { width: 80, height: 90 }),
                    makeWidget('completion', { width: 40, height: 85 }),
                    makeWidget('stat_projects', { visible: false }),
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
        render(<LayoutPreview widgets={[makeWidget('stat_projects')]} />);

        expect(screen.getByTestId('layout-preview-block')).toHaveClass(
            'min-h-0',
            'overflow-hidden',
        );
    });
});
