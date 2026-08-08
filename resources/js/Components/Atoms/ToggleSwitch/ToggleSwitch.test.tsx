import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import ToggleSwitch from './ToggleSwitch';

describe('ToggleSwitch Component', () => {
    test('renders a button', () => {
        render(<ToggleSwitch checked={false} onChange={() => {}} />);

        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('applies the accent background and translated thumb when checked', () => {
        const { container } = render(
            <ToggleSwitch checked={true} onChange={() => {}} />,
        );

        expect(screen.getByRole('button')).toHaveClass(
            'bg-[var(--accent-color)]',
        );
        expect(container.querySelector('span')).toHaveClass('translate-x-4');
    });

    test('applies the muted background and resting thumb when unchecked', () => {
        const { container } = render(
            <ToggleSwitch checked={false} onChange={() => {}} />,
        );

        expect(screen.getByRole('button')).toHaveClass(
            'bg-[var(--bg-light-color)]',
        );
        expect(container.querySelector('span')).toHaveClass('translate-x-0');
    });

    test('calls onChange with the opposite value when clicked (unchecked -> true)', async () => {
        const onChange = vi.fn();
        render(<ToggleSwitch checked={false} onChange={onChange} />);

        await userEvent.click(screen.getByRole('button'));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(true);
    });

    test('calls onChange with the opposite value when clicked (checked -> false)', async () => {
        const onChange = vi.fn();
        render(<ToggleSwitch checked={true} onChange={onChange} />);

        await userEvent.click(screen.getByRole('button'));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(false);
    });
});
