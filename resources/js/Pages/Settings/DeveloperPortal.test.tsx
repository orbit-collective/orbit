import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { paginated, portalTotals } from '@/stories/developerPortalFixtures';
import SettingsDeveloperPortal from './DeveloperPortal';

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

vi.mock('@/Components/Organisms/DeveloperPortal/DeveloperPortalTab', () => ({
    default: (props: Record<string, unknown>) => (
        <div
            data-testid="tab"
            data-keys={Object.keys(props).sort().join(',')}
        />
    ),
}));

describe('Settings DeveloperPortal page', () => {
    test('renders the portal tab inside the settings layout', () => {
        render(
            <SettingsDeveloperPortal
                projects={[{ id: 1 }] as never}
                totals={portalTotals}
                portalUsers={paginated([])}
                portalProjects={paginated([])}
            />,
        );

        const layout = screen.getByTestId('layout');
        expect(layout).toHaveAttribute('data-tab-id', 'dev-portal');
        expect(layout).toHaveAttribute('data-projects-count', '1');
        expect(screen.getByTestId('tab')).toHaveAttribute(
            'data-keys',
            'containers,errorLog,portalProjects,portalUsers,totals',
        );
    });

    test('defaults the sidebar projects to none', () => {
        render(
            <SettingsDeveloperPortal
                totals={portalTotals}
                portalUsers={paginated([])}
                portalProjects={paginated([])}
            />,
        );

        expect(screen.getByTestId('layout')).toHaveAttribute(
            'data-projects-count',
            '0',
        );
    });
});
