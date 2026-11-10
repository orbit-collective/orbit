import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import FormField from './FormField';

describe('FormField Component', () => {
    const noop = () => {};

    test('renders the label and links it to the input', () => {
        render(<FormField id="email" label="Email" value="" onChange={noop} />);

        expect(screen.getByLabelText('Email')).toBe(
            screen.getByRole('textbox'),
        );
    });

    test('renders a required indicator', () => {
        render(
            <FormField
                id="email"
                label="Email"
                value=""
                onChange={noop}
                required
            />,
        );

        expect(screen.getByText('*')).toBeInTheDocument();
    });

    test('renders the current value and placeholder', () => {
        render(
            <FormField
                id="email"
                label="Email"
                value="hello@example.com"
                onChange={noop}
                placeholder="you@example.com"
            />,
        );

        expect(screen.getByRole('textbox')).toHaveValue('hello@example.com');
        expect(
            screen.getByPlaceholderText('you@example.com'),
        ).toBeInTheDocument();
    });

    test('calls onChange when typing', async () => {
        const handleChange = vi.fn();
        render(
            <FormField
                id="email"
                label="Email"
                value=""
                onChange={handleChange}
            />,
        );

        await userEvent.type(screen.getByRole('textbox'), 'a');

        expect(handleChange).toHaveBeenCalledTimes(1);
    });

    test('renders the error message when provided', () => {
        render(
            <FormField
                id="email"
                label="Email"
                value=""
                onChange={noop}
                error="This field is required."
            />,
        );

        expect(screen.getByText('This field is required.')).toBeInTheDocument();
    });

    test('does not render an error message when not provided', () => {
        const { container } = render(
            <FormField id="email" label="Email" value="" onChange={noop} />,
        );

        expect(container.querySelectorAll('span').length).toBe(0);
    });

    test('renders a leading icon and combines it with the error styling', () => {
        const { container } = render(
            <FormField
                id="email"
                label="Email"
                value=""
                onChange={noop}
                icon="Mail"
                error="This field is required."
            />,
        );

        expect(container.querySelector('svg')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveClass(
            'pl-9',
            'border-(--error-color)',
        );
    });
});
