import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import SettingsProfile from './Profile';

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
    '@/Components/Organisms/AccountSettingsContent/AccountSettingsProfileTab',
    () => ({
        default: (props: Record<string, unknown>) => (
            <div data-testid="tab" data-props={JSON.stringify(props)} />
        ),
    }),
);

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: { auth: { user: { name: 'Ada', avatar: '/a.png' } } },
    }),
}));

describe('Settings SettingsProfile page', () => {
    test('renders its tab inside the settings layout', () => {
        render(<SettingsProfile projects={[{ id: 1 }] as never} />);

        const layout = screen.getByTestId('layout');
        expect(layout).toHaveAttribute('data-tab-id', 'profile');
        expect(layout).toHaveAttribute('data-projects-count', '1');

        const tabProps = JSON.parse(
            screen.getByTestId('tab').getAttribute('data-props') ?? '{}',
        );
        expect(tabProps.userName).toEqual('Ada');
        expect(tabProps.userAvatar).toEqual('/a.png');
    });
});
