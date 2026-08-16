import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import Breadcrumb from './Breadcrumb';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        className,
    }: {
        children: React.ReactNode;
        href?: string;
        className?: string;
    }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

describe('Breadcrumb', () => {
    test('renders every item label', () => {
        render(
            <Breadcrumb
                items={[{ label: 'Settings' }, { label: 'Preferences' }]}
            />,
        );

        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    test('renders a chevron separator between items but not before the first', () => {
        const { container } = render(
            <Breadcrumb
                items={[
                    { label: 'Projects' },
                    { label: 'Orbit' },
                    { label: 'Issue #12' },
                ]}
            />,
        );

        expect(container.querySelectorAll('svg').length).toBe(2);
    });

    test('renders earlier items with an href as links, never the last item', () => {
        render(
            <Breadcrumb
                items={[
                    { label: 'Projects', href: '/projects' },
                    { label: 'Orbit', href: '/projects/1' },
                    { label: 'Issue #12', href: '/issues/12' },
                ]}
            />,
        );

        expect(screen.getByText('Projects').closest('a')).toHaveAttribute(
            'href',
            '/projects',
        );
        expect(screen.getByText('Orbit').closest('a')).toHaveAttribute(
            'href',
            '/projects/1',
        );
        expect(screen.getByText('Issue #12').closest('a')).toBeNull();
    });

    test('renders items without an href as plain, non-navigable text', () => {
        render(
            <Breadcrumb
                items={[{ label: 'Settings' }, { label: 'Preferences' }]}
            />,
        );

        expect(screen.getByText('Settings').closest('a')).toBeNull();
    });
});
