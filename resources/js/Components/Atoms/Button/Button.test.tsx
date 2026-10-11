import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import Button from './Button';

describe('Button Component', () => {
    test('renders correctly with the provided text (children)', () => {
        render(<Button>Save changes</Button>);

        const button = screen.getByRole('button', { name: /save changes/i });
        expect(button).toBeInTheDocument();
    });

    test('calls onClick function when clicked by the user', async () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click me</Button>);

        const button = screen.getByRole('button');
        await userEvent.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('is disabled and does not respond to clicks when isDisabled is true', async () => {
        const handleClick = vi.fn();
        render(
            <Button isDisabled onClick={handleClick}>
                Disabled
            </Button>,
        );

        const button = screen.getByRole('button');

        expect(button).toBeDisabled();

        await userEvent.click(button);
        expect(handleClick).not.toHaveBeenCalled();
    });

    test('applies default style classes when isBox is false or omitted', () => {
        render(<Button>Default</Button>);

        const button = screen.getByRole('button');

        expect(button).toHaveClass(
            'py-1.5',
            'px-3',
            'bg-[var(--accent-color)]',
        );
        expect(button).not.toHaveClass('p-0', 'bg-[var(--bg-light-color)]');
    });

    test('applies box variant classes when isBox is true', () => {
        render(<Button isBox={true}>Box Button</Button>);

        const button = screen.getByRole('button');

        expect(button).toHaveClass('p-0', 'bg-[var(--bg-light-color)]');
        expect(button).not.toHaveClass('py-1.5', 'px-3');
    });

    test('correctly merges default classes with an additional class passed in props', () => {
        render(<Button className="extra-class mt-4">With classes</Button>);

        const button = screen.getByRole('button');

        expect(button).toHaveClass('font-medium', 'mt-4', 'extra-class');
    });

    test('forwards additional standard HTML attributes to the button element', () => {
        render(
            <Button type="submit" aria-label="Shipping form">
                Send
            </Button>,
        );

        const button = screen.getByRole('button', {
            name: /shipping form/i,
        });

        expect(button).toHaveAttribute('type', 'submit');
    });

    test('applies the danger variant styling', () => {
        render(<Button variant="danger">Delete</Button>);

        expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass(
            'bg-[var(--error-color)]',
        );
    });
});
