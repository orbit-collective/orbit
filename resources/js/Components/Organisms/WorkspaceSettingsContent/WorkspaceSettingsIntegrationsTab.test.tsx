import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { AlertProvider } from '@/context/AlertContext';
import { expectPanelsToFold, inSettingsPage } from '@/tests/settingsPanels';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import WorkspaceSettingsIntegrationsTab from './WorkspaceSettingsIntegrationsTab';

vi.mock('@/hooks/useCommands', () => ({ useCommands: vi.fn() }));

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
        Link: ({
            children,
            href,
            className,
        }: {
            children: React.ReactNode;
            href: string;
            className?: string;
        }) => (
            <a href={href} className={className}>
                {children}
            </a>
        ),
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
            '/settings/integrations?project=2',
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

        await userEvent.click(
            screen.getByRole('switch', { name: 'Toggle Discord' }),
        );

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects.integrations.update/1/discord',
            { enabled: true },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('shows an error alert when the PATCH request fails', async () => {
        mockRouterPatch.mockImplementationOnce(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onError?.({ enabled: 'Something went wrong.' });
            },
        );
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        await userEvent.click(
            screen.getByRole('switch', { name: 'Toggle Discord' }),
        );

        expect(
            await screen.findByText('Failed to update the integration.'),
        ).toBeInTheDocument();
    });

    test('every card links to its integration page scoped to the project', () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        expect(screen.getByRole('link', { name: 'Discord' })).toHaveAttribute(
            'href',
            '/settings/integrations/discord?project=1',
        );
        expect(
            screen.getByRole('link', { name: 'Microsoft Teams' }),
        ).toHaveAttribute(
            'href',
            '/settings/integrations/microsoft-teams?project=1',
        );
    });

    test('GitHub is an installation flow, so its card has no quick switch', () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
            integrationStatuses: { github: true },
        });

        expect(
            screen.queryByRole('switch', { name: 'Toggle GitHub' }),
        ).toBeNull();
        expect(
            screen.getByRole('link', { name: 'GitHub' }),
        ).toBeInTheDocument();
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

    test('the category pills report which one is on, and the grid follows', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        expect(screen.getByRole('button', { name: /^All/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );

        await userEvent.click(screen.getByRole('button', { name: /^Storage/ }));

        expect(
            screen.getByRole('button', { name: /^Storage/ }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /^All/ })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
        expect(
            await screen.findByRole('heading', { name: 'Google Drive' }),
        ).toBeVisible();
    });

    test('the category pills count their integrations', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        const all = screen.getByRole('button', { name: /^All/ });
        await waitFor(() => expect(all).toHaveTextContent(/All\s*[1-9]/));
    });

    test('the category pills show the keyboard focus ring', () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        expect(
            screen.getByRole('button', { name: /^All/ }).className,
        ).toContain('focus-visible:ring-2');
    });

    test('the integration cards rise in and end up visible', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        expect(
            await screen.findByRole('heading', { name: 'Discord' }),
        ).toBeVisible();
    });

    test('the read-only and no-access panels fold', () => {
        const { unmount } = render(
            inSettingsPage(
                <AlertProvider>
                    <WorkspaceSettingsIntegrationsTab
                        memberProjects={[projectA]}
                        selectedProjectId={projectA.id}
                        hasIntegrationsAccess
                        canUpdateIntegrations={false}
                    />
                </AlertProvider>,
                'integrations',
            ),
        );
        expectPanelsToFold([/Read-only access/]);
        unmount();

        render(
            inSettingsPage(
                <AlertProvider>
                    <WorkspaceSettingsIntegrationsTab
                        memberProjects={[]}
                        selectedProjectId={null}
                    />
                </AlertProvider>,
                'integrations',
            ),
        );
        expectPanelsToFold([/^Integrations/]);
    });
});
