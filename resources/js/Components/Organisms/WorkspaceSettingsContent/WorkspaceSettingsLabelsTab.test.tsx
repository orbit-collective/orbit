import { AlertProvider } from '@/context/AlertContext';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsLabelsTab from './WorkspaceSettingsLabelsTab';

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params?: Array<string | number>) =>
            `/${name}/${(params ?? []).join('/')}`,
    ),
);

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({ props: { flash: {} } }),
        router: {
            ...actual.router,
            get: vi.fn(),
            post: vi.fn(),
            patch: vi.fn(),
            delete: vi.fn(),
        },
    };
});

const project: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };
const labels = [
    {
        id: 1,
        name: 'bug',
        color: '#f44336',
        description: null,
        isSystem: true,
    },
];

const renderTab = (
    props: Partial<Parameters<typeof WorkspaceSettingsLabelsTab>[0]>,
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsLabelsTab
                memberProjects={[project]}
                selectedProjectId={1}
                labels={labels}
                hasLabelsAccess
                {...props}
            />
        </AlertProvider>,
    );

describe('WorkspaceSettingsLabelsTab permission gating', () => {
    test('a user with no label capabilities sees neither create nor edit/delete controls', () => {
        renderTab({});

        expect(screen.queryByText('New label')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Edit label')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Delete label')).not.toBeInTheDocument();
    });

    test('a create-only user sees the "New label" button but no edit or delete controls', () => {
        renderTab({ canCreateLabels: true });

        expect(screen.getByText('New label')).toBeInTheDocument();
        expect(screen.queryByTitle('Edit label')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Delete label')).not.toBeInTheDocument();
    });

    test('an update-only user sees the edit control but not create or delete', () => {
        renderTab({ canUpdateLabels: true });

        expect(screen.queryByText('New label')).not.toBeInTheDocument();
        expect(screen.getByTitle('Edit label')).toBeInTheDocument();
        expect(screen.queryByTitle('Delete label')).not.toBeInTheDocument();
    });

    test('a delete-only user sees the delete control but not create or edit', () => {
        renderTab({ canDeleteLabels: true });

        expect(screen.queryByText('New label')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Edit label')).not.toBeInTheDocument();
        expect(screen.getByTitle('Delete label')).toBeInTheDocument();
    });

    test('a user with every label capability sees all controls', () => {
        renderTab({
            canCreateLabels: true,
            canUpdateLabels: true,
            canDeleteLabels: true,
        });

        expect(screen.getByText('New label')).toBeInTheDocument();
        expect(screen.getByTitle('Edit label')).toBeInTheDocument();
        expect(screen.getByTitle('Delete label')).toBeInTheDocument();
    });
});
