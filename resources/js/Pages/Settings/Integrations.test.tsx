import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import SettingsIntegrations from './Integrations';

vi.mock('@/Components/Organisms/SettingsLayout/SettingsLayout', () => ({
    default: ({
        tabId,
        projects = [],
        children,
    }: {
        tabId: string;
        projects?: unknown[];
        children: React.ReactNode;
    }) => (
        <div
            data-testid="layout"
            data-tab-id={tabId}
            data-projects-count={projects.length}
        >
            {children}
        </div>
    ),
}));

vi.mock(
    '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationsTab',
    () => ({
        default: (props: Record<string, unknown>) => (
            <div data-testid="tab" data-props={JSON.stringify(props)} />
        ),
    }),
);

describe('Settings SettingsIntegrations page', () => {
    test('renders its tab inside the settings layout', () => {
        render(
            <SettingsIntegrations
                projects={[{ id: 1 }] as never}
                integrationStatuses={{ discord: true }}
                canUpdateIntegrations
            />,
        );

        const layout = screen.getByTestId('layout');
        expect(layout).toHaveAttribute('data-tab-id', 'integrations');
        expect(layout).toHaveAttribute('data-projects-count', '1');

        const tabProps = JSON.parse(
            screen.getByTestId('tab').getAttribute('data-props') ?? '{}',
        );
        expect(tabProps.integrationStatuses).toEqual({ discord: true });
        expect(tabProps.canUpdateIntegrations).toEqual(true);
    });
});
