import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import NavItem from './NavItem';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        onClick,
        className,
    }: {
        children: React.ReactNode;
        href?: string;
        onClick?: () => void;
        className?: string;
    }) => (
        <a href={href} onClick={onClick} className={className}>
            {children}
        </a>
    ),
}));

describe('NavItem Component', () => {
    test('renders the label', () => {
        render(<NavItem icon="Inbox" label="Inbox" />);

        expect(screen.getByText('Inbox')).toBeInTheDocument();
    });

    test('renders a link pointing at the provided link href', () => {
        render(<NavItem icon="Inbox" label="Inbox" link="/inbox" />);

        expect(screen.getByRole('link')).toHaveAttribute('href', '/inbox');
    });

    test('renders a badge when a badge value is provided', () => {
        render(<NavItem icon="Inbox" label="Inbox" badge={3} />);

        expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('renders a badge even when the badge value is zero', () => {
        render(<NavItem icon="Inbox" label="Inbox" badge={0} />);

        expect(screen.getByText('0')).toBeInTheDocument();
    });

    test('does not render a badge when none is provided', () => {
        const { container } = render(<NavItem icon="Inbox" label="Inbox" />);

        expect(container.querySelector('kbd')).not.toBeInTheDocument();
    });

    test('applies active styling when isActive is true', () => {
        render(<NavItem icon="Inbox" label="Inbox" link="/inbox" isActive />);

        expect(screen.getByRole('link')).toHaveClass(
            'text-[var(--text-color)]',
        );
    });

    test('applies inactive styling when isActive is false', () => {
        render(
            <NavItem
                icon="Inbox"
                label="Inbox"
                link="/inbox"
                isActive={false}
            />,
        );

        expect(screen.getByRole('link')).toHaveClass(
            'text-[var(--text-gray-color)]',
        );
    });

    test('calls onClick when clicked', async () => {
        const handleClick = vi.fn();
        render(
            <NavItem
                icon="Inbox"
                label="Inbox"
                link="/inbox"
                onClick={handleClick}
            />,
        );

        await userEvent.click(screen.getByRole('link'));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});
