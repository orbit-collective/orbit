import { AccentProvider } from '@/context/AccentContext';
import { AlertProvider } from '@/context/AlertContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import SettingsIndex from './Index';

const pageState = vi.hoisted(() => ({ url: '/settings' }));

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

    test('renders account and workspace sections with tabs', () => {
        renderSettingsIndex();

        expect(screen.getByText('Account')).toBeInTheDocument();
        expect(screen.getByText('Workspace')).toBeInTheDocument();
        const preferencesLink = screen
            .getAllByText('Preferences')
            .find((node) => node.closest('a'));
        expect(preferencesLink?.closest('a')).toHaveAttribute(
            'href',
            '/settings?tab=preferences',
        );
        expect(screen.getByText('Roles & management')).toBeInTheDocument();
    });

    test('renders heading and back link', () => {
        renderSettingsIndex();

        expect(
            screen.getByRole('heading', { name: 'Preferences' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Back to app').closest('a')).toHaveAttribute(
            'href',
            '/',
        );
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

    test('renders disabled tabs without a link and with a "Soon" badge', () => {
        renderSettingsIndex();

        expect(screen.getByText('Export').closest('a')).toBeNull();
        expect(screen.getAllByText('Soon').length).toBeGreaterThan(0);
    });
});
