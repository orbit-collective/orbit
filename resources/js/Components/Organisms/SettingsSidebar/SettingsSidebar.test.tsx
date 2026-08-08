import { SettingsTab } from '@/types/Settings';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import SettingsSidebar from './SettingsSidebar';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        className,
        onClick,
    }: {
        children: React.ReactNode;
        href?: string;
        className?: string;
        onClick?: () => void;
    }) => (
        <a href={href} className={className} onClick={onClick}>
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
        enabled: true,
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

describe('SettingsSidebar', () => {
    test('renders account and workspace tabs plus back link', () => {
        render(
            <SettingsSidebar
                activeTab="preferences"
                accountTabs={accountTabs}
                workspaceTabs={workspaceTabs}
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

    test('marks the active tab', () => {
        render(
            <SettingsSidebar
                activeTab="integrations"
                accountTabs={accountTabs}
                workspaceTabs={workspaceTabs}
            />,
        );

        expect(screen.getByText('Integrations').closest('a')).toHaveClass(
            'text-[var(--text-color)]',
        );
    });

    test('renders disabled tabs as non-navigable with a "Soon" badge', () => {
        render(
            <SettingsSidebar
                activeTab="preferences"
                accountTabs={accountTabs}
                workspaceTabs={workspaceTabs}
            />,
        );

        expect(screen.getByText('Members').closest('a')).toBeNull();
        expect(screen.getAllByText('Soon').length).toBe(2);
    });
});
