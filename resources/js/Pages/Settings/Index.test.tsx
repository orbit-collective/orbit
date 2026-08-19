import { AccentProvider } from '@/context/AccentContext';
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
                <SettingsIndex />
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
        props: {},
    }),
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
        pageState.url = '/settings?tab=members';
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

    test('renders disabled tabs without a link and with a "Soon" badge', () => {
        renderSettingsIndex();

        expect(screen.getByText('Members').closest('a')).toBeNull();
        expect(screen.getAllByText('Soon').length).toBeGreaterThan(0);
    });
});
