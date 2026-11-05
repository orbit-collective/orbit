import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import CollapseAllButton from './CollapseAllButton';

describe('CollapseAllButton', () => {
    test('offers to collapse while something is open', () => {
        render(<CollapseAllButton allCollapsed={false} onToggle={vi.fn()} />);

        expect(
            screen.getByRole('button', { name: 'Collapse all' }),
        ).toBeInTheDocument();
    });

    test('offers to expand once everything is folded', async () => {
        const { rerender } = render(
            <CollapseAllButton allCollapsed={false} onToggle={vi.fn()} />,
        );

        rerender(<CollapseAllButton allCollapsed onToggle={vi.fn()} />);

        expect(
            await screen.findByRole('button', { name: 'Expand all' }),
        ).toBeInTheDocument();
    });

    test('calls back on click and shows the keyboard focus ring', () => {
        const onToggle = vi.fn();
        render(<CollapseAllButton allCollapsed={false} onToggle={onToggle} />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(button.className).toContain('focus-visible:ring-2');
    });
});
