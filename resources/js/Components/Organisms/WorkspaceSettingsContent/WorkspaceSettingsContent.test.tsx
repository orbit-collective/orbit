import { AlertProvider } from '@/context/AlertContext';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsContent from './WorkspaceSettingsContent';

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({ props: { flash: {}, emailEnabled: true } }),
    };
});

describe('WorkspaceSettingsContent', () => {
    test('renders an empty state for labels when the user has no project', () => {
        render(
            <AlertProvider>
                <WorkspaceSettingsContent tabId="labels" />
            </AlertProvider>,
        );

        expect(screen.getByText('Label taxonomy')).toBeInTheDocument();
        expect(
            screen.getByText("You're not part of any project yet"),
        ).toBeInTheDocument();
    });

    test('renders labels content for the selected project', () => {
        render(
            <AlertProvider>
                <WorkspaceSettingsContent
                    tabId="labels"
                    memberProjects={[{ id: 1, name: 'Orbit', color: 'blue' }]}
                    selectedProjectId={1}
                    hasLabelsAccess
                    canCreateLabels
                    canUpdateLabels
                    canDeleteLabels
                    labels={[
                        {
                            id: 1,
                            name: 'bug',
                            color: '#f44336',
                            description: null,
                            isSystem: true,
                        },
                    ]}
                />
            </AlertProvider>,
        );

        expect(
            screen.getByText('Labels available for issues in Orbit.'),
        ).toBeInTheDocument();
        expect(screen.getByText('bug')).toBeInTheDocument();
    });

    test('renders issue types content for the selected project', () => {
        render(
            <AlertProvider>
                <WorkspaceSettingsContent
                    tabId="issue-types"
                    memberProjects={[{ id: 1, name: 'Orbit', color: 'blue' }]}
                    selectedProjectId={1}
                    hasIssueTypesAccess
                    issueTypes={[
                        {
                            id: 1,
                            name: 'Bug',
                            icon: 'Bug',
                            color: '#ef4444',
                            description: null,
                            isSystem: true,
                            allowsChildren: false,
                            isTopLevel: true,
                            requiredFields: [],
                            restrictedRoleTypes: [],
                        },
                    ]}
                />
            </AlertProvider>,
        );

        expect(
            screen.getByText('Issue types available for issues in Orbit.'),
        ).toBeInTheDocument();
        expect(screen.getByText('Bug')).toBeInTheDocument();
    });

    test('renders priorities content', () => {
        render(<WorkspaceSettingsContent tabId="priorities" />);

        expect(screen.getByText('Priority framework')).toBeInTheDocument();
        expect(screen.getByText('Default policy')).toBeInTheDocument();
    });

    test('renders documents content', () => {
        render(<WorkspaceSettingsContent tabId="documents" />);

        expect(screen.getByText('Documentation defaults')).toBeInTheDocument();
        expect(screen.getByText('Knowledge operations')).toBeInTheDocument();
    });

    test('renders members content', () => {
        render(
            <AlertProvider>
                <WorkspaceSettingsContent
                    tabId="members"
                    memberProjects={[{ id: 1, name: 'Orbit', color: 'blue' }]}
                    selectedProjectId={1}
                    viewerRole="admin"
                    members={[]}
                    pendingInvitations={[]}
                />
            </AlertProvider>,
        );

        expect(
            screen.getByText('People with access to "Orbit".'),
        ).toBeInTheDocument();
        expect(screen.getByText('Invite by email')).toBeInTheDocument();
    });

    test('renders an empty state when the user has no project', () => {
        render(
            <AlertProvider>
                <WorkspaceSettingsContent tabId="members" />
            </AlertProvider>,
        );

        expect(
            screen.getByText("You're not part of any project yet"),
        ).toBeInTheDocument();
    });

    test('renders an empty state for roles and permissions when the user has no project', () => {
        render(
            <AlertProvider>
                <WorkspaceSettingsContent tabId="roles-management" />
            </AlertProvider>,
        );

        expect(screen.getByText('Roles and permissions')).toBeInTheDocument();
        expect(
            screen.getByText("You're not part of any project yet"),
        ).toBeInTheDocument();
    });
});
