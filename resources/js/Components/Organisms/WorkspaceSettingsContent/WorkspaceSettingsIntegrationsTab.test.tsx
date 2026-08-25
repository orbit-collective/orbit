import { AlertProvider } from '@/context/AlertContext';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsIntegrationsTab from './WorkspaceSettingsIntegrationsTab';

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params?: Array<string | number>) =>
            `/${name}/${(params ?? []).join('/')}`,
    ),
);

type VisitOptions = {
    onSuccess?: () => void;
    onError?: (errors: Record<string, string>) => void;
};

const { mockRouterPatch, mockRouterGet } = vi.hoisted(() => ({
    mockRouterPatch: vi.fn(
        (_url: string, _data?: unknown, opts?: VisitOptions) => {
            opts?.onSuccess?.();
        },
    ),
    mockRouterGet: vi.fn(),
}));

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
            patch: mockRouterPatch,
            get: mockRouterGet,
        },
    };
});

const renderTab = (
    props: Parameters<typeof WorkspaceSettingsIntegrationsTab>[0],
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsIntegrationsTab {...props} />
        </AlertProvider>,
    );

const projectA: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };
const projectB: MemberProjectSummary = {
    id: 2,
    name: 'Marketing',
    color: 'green',
};

describe('WorkspaceSettingsIntegrationsTab', () => {
    test('shows a message when the user has no project', () => {
        renderTab({ memberProjects: [], selectedProjectId: null });

        expect(
            screen.getByText("You're not part of any project yet"),
        ).toBeInTheDocument();
    });

    test('shows a message when the user lacks integrations access on the selected project', () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: false,
        });

        expect(
            screen.getByText(
                "You don't have access to this project's integrations",
            ),
        ).toBeInTheDocument();
    });

    test('renders a card for every integration with its stored status', () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
            integrationStatuses: { discord: true },
        });

        expect(
            screen.getByRole('heading', { name: 'Discord' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Google Calendar' }),
        ).toBeInTheDocument();
    });

    test('shows the project picker and switches project via a GET request when there is more than one project', async () => {
        renderTab({
            memberProjects: [projectA, projectB],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        await userEvent.click(screen.getByText('Marketing'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/settings?tab=integrations&project=2',
            {},
            { preserveScroll: true, preserveState: true },
        );
    });

    test('shows a read-only notice and disables toggles when the viewer cannot update integrations', () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: false,
        });

        expect(screen.getByText('Read-only access')).toBeInTheDocument();
    });

    test('toggling an integration sends a PATCH request scoped to the selected project', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
            integrationStatuses: { discord: false },
        });

        const toggles = screen.getAllByRole('button', { name: '' });
        await userEvent.click(toggles[0]);

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects.integrations.update/1/discord',
            { enabled: true },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('opens and closes the detail modal', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        await userEvent.click(screen.getByRole('heading', { name: 'Discord' }));
        expect(screen.getByText('Overview')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    });

    test('filters the grid down to the selected category', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        await userEvent.click(screen.getByRole('button', { name: /^Storage/ }));

        expect(
            screen.getByRole('heading', { name: 'Google Drive' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Discord' }),
        ).not.toBeInTheDocument();
    });
});
