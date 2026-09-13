import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import SettingsLayout from './SettingsLayout';

vi.mock('@/Components/Organisms/Sidebar/Sidebar', () => ({
    default: ({ projects }: { projects: unknown[] }) => (
        <div data-testid="sidebar" data-projects-count={projects.length} />
    ),
}));

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
    }: {
        children: React.ReactNode;
        href?: string;
    }) => <a href={href}>{children}</a>,
}));

describe('SettingsLayout', () => {
    test('renders the heading and description of the given tab', () => {
        render(
            <SettingsLayout tabId="labels">
                <p>Tab body</p>
            </SettingsLayout>,
        );

        expect(
            screen.getByRole('heading', { name: 'Labels', level: 1 }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Define label taxonomy used across issues and projects.',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText('Tab body')).toBeInTheDocument();
    });

    test('passes the projects through to the sidebar', () => {
        render(
            <SettingsLayout
                tabId="preferences"
                projects={[{ id: 1 }, { id: 2 }] as never}
            >
                <p>Tab body</p>
            </SettingsLayout>,
        );

        expect(screen.getByTestId('sidebar')).toHaveAttribute(
            'data-projects-count',
            '2',
        );
    });
});
