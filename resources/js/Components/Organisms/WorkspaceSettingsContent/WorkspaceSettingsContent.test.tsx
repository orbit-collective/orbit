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
    test('renders labels content', () => {
        render(<WorkspaceSettingsContent tabId="labels" />);

        expect(screen.getByText('Label taxonomy')).toBeInTheDocument();
        expect(screen.getByText('Governance')).toBeInTheDocument();
    });

    test('renders statuses content', () => {
        render(<WorkspaceSettingsContent tabId="statuses" />);

        expect(screen.getByText('Workflow statuses')).toBeInTheDocument();
        expect(screen.getByText('Status maintenance')).toBeInTheDocument();
    });

    test('renders priorities content', () => {
        render(<WorkspaceSettingsContent tabId="priorities" />);

        expect(screen.getByText('Priority framework')).toBeInTheDocument();
        expect(screen.getByText('Default policy')).toBeInTheDocument();
    });

    test('renders templates content', () => {
        render(<WorkspaceSettingsContent tabId="templates" />);

        expect(screen.getByText('Issue templates')).toBeInTheDocument();
        expect(screen.getByText('Quality controls')).toBeInTheDocument();
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
        expect(screen.getByText('Invite a teammate')).toBeInTheDocument();
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
