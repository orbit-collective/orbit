import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import DropdownItem from './DropdownItem';

describe('DropdownItem Component', () => {
    test('renders the provided label', () => {
        render(<DropdownItem label="Archive" />);

        expect(
            screen.getByRole('button', { name: /archive/i }),
        ).toBeInTheDocument();
    });

    test('renders a ReactNode label', () => {
        render(<DropdownItem label={<span>Custom node</span>} />);

        expect(screen.getByText('Custom node')).toBeInTheDocument();
    });

    test('has an explicit type of "button" to avoid submitting forms', () => {
        render(<DropdownItem label="Delete" />);

        expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    test('calls onClick when clicked', async () => {
        const handleClick = vi.fn();
        render(<DropdownItem label="Rename" onClick={handleClick} />);

        await userEvent.click(screen.getByRole('button'));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('applies active classes when isActive is true', () => {
        render(<DropdownItem label="Active" isActive />);

        expect(screen.getByRole('button')).toHaveClass(
            'text-[var(--text-color)]',
            'bg-[var(--accent-color)]/10',
        );
    });

    test('does not apply active classes when isActive is false', () => {
        render(<DropdownItem label="Inactive" isActive={false} />);

        expect(screen.getByRole('button')).not.toHaveClass(
            'bg-[var(--accent-color)]/10',
        );
    });

    test('renders trailing content when provided', () => {
        render(<DropdownItem label="High" trailing={<span>2</span>} />);

        expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('renders no trailing content when omitted', () => {
        const { container } = render(<DropdownItem label="High" />);

        expect(
            container.querySelector('span.text-zinc-500'),
        ).not.toBeInTheDocument();
    });
});
