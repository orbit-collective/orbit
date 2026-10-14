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

    test('disables the button and does not call onChange when clicked while disabled', async () => {
        const onChange = vi.fn();
        render(<ToggleSwitch checked={false} onChange={onChange} disabled />);

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();

        await userEvent.click(button);

        expect(onChange).not.toHaveBeenCalled();
    });

    test('with a label it is a named switch exposing its checked state', () => {
        const { rerender } = render(
            <ToggleSwitch
                label="Run clean-up automatically"
                checked={false}
                onChange={() => {}}
            />,
        );

        const toggle = screen.getByRole('switch', {
            name: 'Run clean-up automatically',
        });
        expect(toggle).toHaveAttribute('aria-checked', 'false');

        rerender(
            <ToggleSwitch
                label="Run clean-up automatically"
                checked
                onChange={() => {}}
            />,
        );

        expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    test('without a label it stays a plain button', () => {
        render(<ToggleSwitch checked onChange={() => {}} />);

        expect(screen.getByRole('button')).not.toHaveAttribute('aria-checked');
        expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });
});
