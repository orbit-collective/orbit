import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import SegmentedControl from './SegmentedControl';

const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
];

describe('SegmentedControl', () => {
    test('is a named group with the current choice pressed', () => {
        render(
            <SegmentedControl
                label="Style"
                value="b"
                options={options}
                onChange={vi.fn()}
            />,
        );

        expect(
            screen.getByRole('group', { name: 'Style' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Beta' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: 'Alpha' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });

    test('reports the choice that was clicked, with its own type', async () => {
        const onChange = vi.fn();
        render(
            <SegmentedControl
                label="Shown"
                value={3}
                options={[
                    { value: 3, label: '3' },
                    { value: 5, label: '5' },
                ]}
                onChange={onChange}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: '5' }));

        expect(onChange).toHaveBeenCalledWith(5);
    });

    test('can stretch over the row', () => {
        render(
            <SegmentedControl
                label="Tabs"
                value="a"
                options={options}
                onChange={vi.fn()}
                fullWidth
            />,
        );

        expect(screen.getByRole('group')).toHaveClass('w-full');
        expect(screen.getByRole('button', { name: 'Alpha' })).toHaveClass(
            'flex-1',
        );
    });
});
