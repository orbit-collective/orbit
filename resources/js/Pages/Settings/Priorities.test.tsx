import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import SettingsPriorities from './Priorities';

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
    '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsPrioritiesTab',
    () => ({
        default: (props: Record<string, unknown>) => (
            <div data-testid="tab" data-props={JSON.stringify(props)} />
        ),
    }),
);

describe('Settings SettingsPriorities page', () => {
    test('renders its tab inside the settings layout', () => {
        render(
            <SettingsPriorities
                projects={[{ id: 1 }] as never}
                priorities={[{ id: 1 }] as never}
                canCreatePriorities
            />,
        );

        const layout = screen.getByTestId('layout');
        expect(layout).toHaveAttribute('data-tab-id', 'priorities');
        expect(layout).toHaveAttribute('data-projects-count', '1');

        const tabProps = JSON.parse(
            screen.getByTestId('tab').getAttribute('data-props') ?? '{}',
        );
        expect(tabProps.priorities).toEqual([{ id: 1 }]);
        expect(tabProps.canCreatePriorities).toEqual(true);
        expect(tabProps.canDeletePriorities).toEqual(false);
    });
});
