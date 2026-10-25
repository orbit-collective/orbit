import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import ToggleChip from './ToggleChip';

describe('ToggleChip', () => {
    test('reports whether it is on through aria-pressed', () => {
        const { rerender } = render(
            <ToggleChip label="Labels" pressed={false} onClick={vi.fn()} />,
        );
        expect(screen.getByRole('button', { name: 'Labels' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );

        rerender(<ToggleChip label="Labels" pressed onClick={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'Labels' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    test('reports clicks', async () => {
        const onClick = vi.fn();
        render(<ToggleChip label="Labels" pressed={false} onClick={onClick} />);

        await userEvent.click(screen.getByRole('button', { name: 'Labels' }));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('ignores clicks while disabled', async () => {
        const onClick = vi.fn();
        render(
            <ToggleChip
                label="Labels"
                pressed={false}
                disabled
                onClick={onClick}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Labels' }));

        expect(onClick).not.toHaveBeenCalled();
    });
});
