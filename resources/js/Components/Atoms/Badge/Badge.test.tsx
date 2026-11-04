import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Badge from './Badge';

describe('Badge Component', () => {
    test('renders its children', () => {
        render(<Badge>New</Badge>);

        expect(screen.getByText('New')).toBeInTheDocument();
    });

    test('applies the default variant classes when no variant is passed', () => {
        render(<Badge>Default</Badge>);

        expect(screen.getByText('Default')).toHaveClass(
            'bg-[var(--bg-light-color)]',
            'text-[var(--text-gray-color)]',
        );
    });

    test('applies the outline variant classes', () => {
        render(<Badge variant="outline">Outline</Badge>);

        const badge = screen.getByText('Outline');
        expect(badge).toHaveClass('bg-transparent', 'border');
        expect(badge).not.toHaveClass('bg-zinc-800');
    });

    test('applies color classes for a label color', () => {
        render(<Badge color="bug">bug</Badge>);

        expect(screen.getByText('bug')).toHaveClass(
            'text-[#f44336]',
            'bg-[#f44336]/10',
        );
    });

    test('merges an additional className with the variant classes', () => {
        render(<Badge className="rounded-full">Merged</Badge>);

        const badge = screen.getByText('Merged');
        expect(badge).toHaveClass('rounded-full', 'inline-flex');
    });

    test('forwards standard HTML span attributes', () => {
        render(<Badge title="A tooltip">Hover</Badge>);

        expect(screen.getByText('Hover')).toHaveAttribute('title', 'A tooltip');
    });

    test('the tooltip opens below by default and above on request', () => {
        const { rerender } = render(
            <Badge tooltip tooltipText="Below">
                x
            </Badge>,
        );
        expect(screen.getByText('Below').className).toContain(
            'top-[calc(100%+6px)]',
        );

        rerender(
            <Badge tooltip tooltipText="Above" tooltipPlacement="top">
                x
            </Badge>,
        );
        expect(screen.getByText('Above').className).toContain(
            'bottom-[calc(100%+6px)]',
        );
    });

    test('the tooltip also appears when the badge has keyboard focus', () => {
        render(
            <Badge tooltip tooltipText="Tip" tabIndex={0}>
                x
            </Badge>,
        );

        expect(screen.getByText('Tip').className).toContain(
            'group-focus-within:opacity-100',
        );
    });

    test('wrapperClassName reaches the outer element, not the badge', () => {
        render(
            <Badge wrapperClassName="w-full" className="inner-class">
                x
            </Badge>,
        );

        const badge = screen.getByText('x');
        expect(badge).toHaveClass('inner-class');
        expect(badge.parentElement).toHaveClass('w-full');
        expect(badge.parentElement).not.toHaveClass('w-fit');
    });
});
