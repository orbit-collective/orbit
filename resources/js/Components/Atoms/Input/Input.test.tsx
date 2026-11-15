import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import Input from './Input';

describe('Input Component', () => {
    const noop = () => {};

    test('renders the current value', () => {
        render(<Input value="hello" onChange={noop} />);

        expect(screen.getByRole('textbox')).toHaveValue('hello');
    });

    test('renders the placeholder', () => {
        render(<Input value="" onChange={noop} placeholder="Search..." />);

        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    test('defaults the type attribute to "text"', () => {
        render(<Input value="" onChange={noop} />);

        expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    test('passes an accessible name through', () => {
        render(<Input value="" onChange={noop} aria-label="Webhook URL" />);

        expect(screen.getByLabelText('Webhook URL')).toBeInTheDocument();
    });

    test('honours a custom type', () => {
        render(<Input value="" onChange={noop} type="email" />);

        expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    test('calls onChange for each character typed', async () => {
        const handleChange = vi.fn();
        render(<Input value="" onChange={handleChange} />);

        await userEvent.type(screen.getByRole('textbox'), 'abc');

        expect(handleChange).toHaveBeenCalledTimes(3);
    });

    test('is disabled and rejects input when isDisabled is true', async () => {
        const handleChange = vi.fn();
        render(<Input value="" onChange={handleChange} isDisabled />);

        const input = screen.getByRole('textbox');
        expect(input).toBeDisabled();

        await userEvent.type(input, 'abc');
        expect(handleChange).not.toHaveBeenCalled();
    });
});
