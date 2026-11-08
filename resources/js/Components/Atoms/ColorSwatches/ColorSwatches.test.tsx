import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import ColorSwatches from './ColorSwatches';

const options = [
    { value: 'accent', label: 'Accent', color: 'red' },
    { value: 'success', label: 'Success', color: 'green' },
];

describe('ColorSwatches', () => {
    test('is a named group with a swatch per color', () => {
        render(
            <ColorSwatches
                label="Color"
                value="accent"
                options={options}
                onChange={vi.fn()}
            />,
        );

        expect(
            screen.getByRole('group', { name: 'Color' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(2);
        expect(
            screen
                .getByRole('button', { name: 'Success' })
                .getAttribute('style'),
        ).toContain('green');
    });

    test('marks the picked one, with a ring and a check', () => {
        render(
            <ColorSwatches
                label="Color"
                value="success"
                options={options}
                onChange={vi.fn()}
            />,
        );

        const picked = screen.getByRole('button', { name: 'Success' });
        expect(picked).toHaveAttribute('aria-pressed', 'true');
        expect(picked.querySelector('svg')).not.toBeNull();
        expect(screen.getAllByTestId('swatch-ring')).toHaveLength(1);

        const other = screen.getByRole('button', { name: 'Accent' });
        expect(other).toHaveAttribute('aria-pressed', 'false');
        expect(other.querySelector('svg')).toBeNull();
    });

    test('reports the swatch that was clicked', async () => {
        const onChange = vi.fn();
        render(
            <ColorSwatches
                label="Color"
                value="accent"
                options={options}
                onChange={onChange}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Success' }));

        expect(onChange).toHaveBeenCalledWith('success');
    });
});
