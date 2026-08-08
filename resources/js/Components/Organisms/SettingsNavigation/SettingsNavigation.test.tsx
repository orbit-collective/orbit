import { SettingsTab } from '@/types/Settings';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import SettingsNavigation from './SettingsNavigation';

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

const accountTabs: SettingsTab[] = [
    {
        id: 'preferences',
        label: 'Preferences',
        icon: 'SlidersHorizontal',
        section: 'account',
        description: 'Control personal experience defaults.',
        enabled: true,
    },
    {
        id: 'integrations',
        label: 'Integrations',
        icon: 'Plug',
        section: 'account',
        description: 'Connect third-party tools.',
        enabled: false,
    },
];

const workspaceTabs: SettingsTab[] = [
    {
        id: 'templates',
        label: 'Templates',
        icon: 'FileText',
        section: 'workspace',
        description: 'Create reusable issue templates.',
        enabled: false,
    },
    {
        id: 'members',
        label: 'Members',
        icon: 'Users',
        section: 'workspace',
        description: 'Manage workspace access.',
        enabled: false,
    },
];

describe('SettingsNavigation', () => {
    test('renders account and workspace tabs plus back link', () => {
        render(
            <SettingsNavigation
                activeTab="preferences"
                activeTabConfig={accountTabs[0]}
                accountTabs={accountTabs}
                workspaceTabs={workspaceTabs}
                isDesktopNavigationHidden={false}
                onDesktopNavigationToggle={() => {}}
            />,
        );

        expect(screen.getByText('Back to app').closest('a')).toHaveAttribute(
            'href',
            '/',
        );
        expect(screen.getByText('Account')).toBeInTheDocument();
        expect(screen.getByText('Workspace')).toBeInTheDocument();
        expect(screen.getAllByText('Preferences').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Members').length).toBeGreaterThan(0);
    });

    test('shows spotlight card for active tab', () => {
        render(
            <SettingsNavigation
                activeTab="integrations"
                activeTabConfig={accountTabs[1]}
                accountTabs={accountTabs}
                workspaceTabs={workspaceTabs}
                isDesktopNavigationHidden={false}
                onDesktopNavigationToggle={() => {}}
            />,
        );

        expect(screen.getByText('Spotlight')).toBeInTheDocument();
        expect(
            screen.getAllByText('Connect third-party tools.').length,
        ).toBeGreaterThan(0);
    });

    test('shows desktop navigation toggle', () => {
        render(
            <SettingsNavigation
                activeTab="preferences"
                activeTabConfig={accountTabs[0]}
                accountTabs={accountTabs}
                workspaceTabs={workspaceTabs}
                isDesktopNavigationHidden
                onDesktopNavigationToggle={() => {}}
            />,
        );

        expect(screen.getByText('Show navigation')).toBeInTheDocument();
    });
});
