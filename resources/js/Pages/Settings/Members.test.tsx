import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import SettingsMembers from './Members';

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
    '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsMembersTab',
    () => ({
        default: (props: Record<string, unknown>) => (
            <div data-testid="tab" data-props={JSON.stringify(props)} />
        ),
    }),
);

describe('Settings SettingsMembers page', () => {
    test('renders its tab inside the settings layout', () => {
        render(
            <SettingsMembers
                projects={[{ id: 1 }] as never}
                members={[{ id: 7 }] as never}
                canAssignRoles
            />,
        );

        const layout = screen.getByTestId('layout');
        expect(layout).toHaveAttribute('data-tab-id', 'members');
        expect(layout).toHaveAttribute('data-projects-count', '1');

        const tabProps = JSON.parse(
            screen.getByTestId('tab').getAttribute('data-props') ?? '{}',
        );
        expect(tabProps.members).toEqual([{ id: 7 }]);
        expect(tabProps.canAssignRoles).toEqual(true);
    });
});
