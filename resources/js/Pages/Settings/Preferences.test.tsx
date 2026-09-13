import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import SettingsPreferences from './Preferences';

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
    '@/Components/Organisms/AccountSettingsContent/AccountSettingsPreferencesTab',
    () => ({
        default: (props: Record<string, unknown>) => (
            <div data-testid="tab" data-props={JSON.stringify(props)} />
        ),
    }),
);

describe('Settings SettingsPreferences page', () => {
    test('renders its tab inside the settings layout', () => {
        render(<SettingsPreferences projects={[{ id: 1 }] as never} />);

        const layout = screen.getByTestId('layout');
        expect(layout).toHaveAttribute('data-tab-id', 'preferences');
        expect(layout).toHaveAttribute('data-projects-count', '1');

        const tabProps = JSON.parse(
            screen.getByTestId('tab').getAttribute('data-props') ?? '{}',
        );
    });
});
