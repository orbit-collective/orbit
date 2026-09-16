import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import FilterButton from './FilterButton';

describe('FilterButton Component', () => {
    test('renders the label', () => {
        render(<FilterButton label="Status" />);

        expect(screen.getByText('Status')).toBeInTheDocument();
    });

    test('renders the value when one is provided', () => {
        render(<FilterButton label="Status" value="Open" />);

        expect(screen.getByText('Open')).toBeInTheDocument();
    });

    test('does not render a value span when no value is provided', () => {
        render(<FilterButton label="Status" />);

        // Only the label text is present besides the chevron icon.
        expect(screen.getByText('Status')).toBeInTheDocument();
    });

    test('renders a leading icon when the icon prop is provided', () => {
        const { container } = render(
            <FilterButton
                label="Filter"
                icon="ListFilter"
                onClick={() => {}}
            />,
        );

        // Leading icon + trailing chevron = 2 svgs.
        expect(container.querySelectorAll('svg')).toHaveLength(2);
    });

    test('renders only the trailing chevron when no icon prop is provided', () => {
        const { container } = render(
            <FilterButton label="Status" onClick={() => {}} />,
        );

        expect(container.querySelectorAll('svg')).toHaveLength(1);
    });

    test('does not render the trailing chevron when no onClick is provided', () => {
        const { container } = render(<FilterButton label="Status" />);

        expect(container.querySelectorAll('svg')).toHaveLength(0);
    });

    test('calls onClick when clicked', async () => {
        const handleClick = vi.fn();
        render(<FilterButton label="Status" onClick={handleClick} />);

        await userEvent.click(screen.getByRole('button'));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('applies active styling and colors when isActive is true', () => {
        const { container } = render(
            <FilterButton
                label="Status"
                value="Open"
                icon="ListFilter"
                isActive
                onClick={() => {}}
            />,
        );

        expect(screen.getByRole('button')).toHaveClass(
            'border-solid',
            'border-[var(--accent-color-opacity)]',
        );
        expect(screen.getByText('Open')).toHaveClass(
            'text-[var(--accent-color)]',
        );
        container.querySelectorAll('svg').forEach((svg) => {
            expect(svg).toHaveAttribute('stroke', 'var(--accent-color)');
        });
    });
});
