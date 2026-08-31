import { AccentProvider } from '@/context/AccentContext';
import { AlertProvider } from '@/context/AlertContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import SettingsIndex from './Index';

const pageState = vi.hoisted(() => ({ url: '/settings' }));

vi.mock('@/Components/Organisms/Sidebar/Sidebar', () => ({
    default: ({ projects }: { projects: unknown[] }) => (
        <div data-testid="sidebar" data-projects-count={projects.length} />
    ),
}));

const renderSettingsIndex = () =>
    render(
        <ThemeProvider>
            <AccentProvider>
                <AlertProvider>
                    <SettingsIndex />
                </AlertProvider>
            </AccentProvider>
        </ThemeProvider>,
    );

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
    usePage: () => ({
        url: pageState.url,
        props: { flash: {}, emailEnabled: true },
    }),
    router: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('Settings Index Page', () => {
    beforeEach(() => {
        pageState.url = '/settings';
    });

    test('renders heading for the default tab', () => {
        renderSettingsIndex();

        expect(
            screen.getByRole('heading', { name: 'Preferences' }),
        ).toBeInTheDocument();
    });

    test('renders the Sidebar with the provided projects', () => {
        renderSettingsIndex();

        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    test('falls back to the default tab when the requested tab is disabled', () => {
        pageState.url = '/settings?tab=export';
        renderSettingsIndex();

        expect(
            screen.getByRole('heading', { name: 'Preferences' }),
        ).toBeInTheDocument();
    });

    test('renders account tab content for the enabled preferences tab', () => {
        pageState.url = '/settings?tab=preferences';
        renderSettingsIndex();

        expect(screen.getByText('Default issue view')).toBeInTheDocument();
    });

    test('renders the members tab content for the now-enabled members tab', () => {
        pageState.url = '/settings?tab=members';
        renderSettingsIndex();

        expect(
            screen.getByRole('heading', { name: 'Members', level: 1 }),
        ).toBeInTheDocument();
        expect(
            screen.getByText("You're not part of any project yet"),
        ).toBeInTheDocument();
    });
});
