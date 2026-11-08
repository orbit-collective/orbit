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
});
