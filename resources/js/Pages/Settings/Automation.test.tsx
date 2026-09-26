import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import SettingsAutomation from './Automation';

vi.mock('@/Components/Organisms/SettingsLayout/SettingsLayout', () => ({
    default: ({
        tabId,
        projects = [],
        children,
        fullBleed,
    }: {
        tabId: string;
        projects?: unknown[];
        children: React.ReactNode;
        fullBleed?: boolean;
    }) => (
        <div
            data-testid="layout"
            data-tab-id={tabId}
            data-projects-count={projects.length}
            data-full-bleed={String(!!fullBleed)}
        >
            {children}
        </div>
    ),
}));

vi.mock(
    '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsAutomationTab',
    () => ({
        default: (props: Record<string, unknown>) => (
            <div data-testid="tab" data-props={JSON.stringify(props)} />
        ),
    }),
);

describe('Settings SettingsAutomation page', () => {
    test('renders its tab inside the settings layout', () => {
        render(
            <SettingsAutomation
                projects={[{ id: 1 }] as never}
                automationRules={[
                    {
                        id: 1,
                        name: 'Merge to done',
                        triggerType: 'github.pull_request.merged',
                        conditions: [],
                        enabled: true,
                        actions: [],
                    },
                ]}
                canUpdateAutomation
            />,
        );

        const layout = screen.getByTestId('layout');
        expect(layout).toHaveAttribute('data-tab-id', 'automation');
        expect(layout).toHaveAttribute('data-projects-count', '1');
        expect(layout).toHaveAttribute('data-full-bleed', 'true');

        const tabProps = JSON.parse(
            screen.getByTestId('tab').getAttribute('data-props') ?? '{}',
        );
        expect(tabProps.automationRules).toHaveLength(1);
        expect(tabProps.canUpdateAutomation).toEqual(true);
    });
});
