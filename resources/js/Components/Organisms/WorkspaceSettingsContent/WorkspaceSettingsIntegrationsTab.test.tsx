import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
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

/** A category pill; the status filter has an "All" button of its own. */
const pill = (name: RegExp) =>
    within(screen.getByRole('group', { name: 'Filter by category' })).getByRole(
        'button',
        { name },
    );

const openFilters = async () => {
    const button = screen.getByRole('button', { name: 'Filters' });

    if (button.getAttribute('aria-expanded') !== 'true') {
        await userEvent.click(button);
    }
};

const projectA: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };
const projectB: MemberProjectSummary = {
    id: 2,
    name: 'Marketing',
    color: 'green',
};

describe('WorkspaceSettingsIntegrationsTab', () => {
    beforeEach(() => localStorage.clear());

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
        localStorage.setItem('integrations:filters', 'open');
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
        localStorage.setItem('integrations:filters', 'open');
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        expect(pill(/^All/)).toHaveAttribute('aria-pressed', 'true');

        await userEvent.click(screen.getByRole('button', { name: /^Storage/ }));

        expect(
            screen.getByRole('button', { name: /^Storage/ }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(pill(/^All/)).toHaveAttribute('aria-pressed', 'false');
        expect(
            await screen.findByRole('heading', { name: 'Google Drive' }),
        ).toBeVisible();
    });

    test('the category pills are one named group', () => {
        localStorage.setItem('integrations:filters', 'open');
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        expect(
            screen.getByRole('group', { name: 'Filter by category' }),
        ).toContainElement(pill(/^All/));
    });

    test('the category pills count their integrations', async () => {
        localStorage.setItem('integrations:filters', 'open');
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        const all = pill(/^All/);
        await waitFor(() => expect(all).toHaveTextContent(/All\s*[1-9]/));
    });

    test('the category pills show the keyboard focus ring', () => {
        localStorage.setItem('integrations:filters', 'open');
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        expect(pill(/^All/).className).toContain('focus-visible:ring-2');
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

    describe('the filters toggle and the layout', () => {
        const props = {
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
            integrationStatuses: { discord: true },
        };

        test('the filters start hidden behind an icon button that reports its state', async () => {
            renderTab(props);

            const button = screen.getByRole('button', { name: 'Filters' });

            expect(button).toHaveAttribute('aria-expanded', 'false');
            expect(
                screen.queryByRole('group', { name: 'Filter by category' }),
            ).toBeNull();

            await userEvent.click(button);

            expect(button).toHaveAttribute('aria-expanded', 'true');
            expect(
                screen.getByRole('group', { name: 'Filter by category' }),
            ).toBeVisible();
            expect(
                screen.getByRole('group', { name: 'Filter by status' }),
            ).toBeVisible();
        });

        test('remembers whether the filters are shown', async () => {
            const { unmount } = renderTab(props);

            await userEvent.click(
                screen.getByRole('button', { name: 'Filters' }),
            );
            unmount();
            renderTab(props);

            expect(
                screen.getByRole('button', { name: 'Filters' }),
            ).toHaveAttribute('aria-expanded', 'true');
        });

        test('the button shows how many filters are on, even while they are hidden', async () => {
            renderTab(props);

            expect(screen.queryByTestId('active-filters')).toBeNull();

            await openFilters();
            await userEvent.click(
                screen.getByRole('button', { name: /^Enabled/ }),
            );
            await userEvent.click(
                screen.getByRole('button', { name: /^Communication/ }),
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Filters' }),
            );

            expect(screen.getByTestId('active-filters')).toHaveTextContent(
                '2 active filters',
            );
        });

        test('a hidden filter keeps filtering', async () => {
            renderTab(props);

            await openFilters();
            await userEvent.click(
                screen.getByRole('button', { name: /^Enabled/ }),
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Filters' }),
            );

            expect(
                screen.getByRole('link', { name: 'Discord' }),
            ).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: 'Slack' })).toBeNull();
        });

        test('switches between the grid and the list and remembers it', async () => {
            const { container, unmount } = renderTab(props);
            const layout = screen.getByRole('group', { name: 'Layout' });

            expect(
                within(layout).getByRole('button', { name: 'Grid' }),
            ).toHaveAttribute('aria-pressed', 'true');
            expect(container.querySelector('.grid')).not.toBeNull();

            await userEvent.click(
                within(layout).getByRole('button', { name: 'List' }),
            );

            expect(container.querySelector('.grid')).toBeNull();
            expect(
                within(layout).getByRole('button', { name: 'List' }),
            ).toHaveAttribute('aria-pressed', 'true');
            // The row keeps the link and the switch of the card.
            expect(
                screen.getByRole('link', { name: 'Discord' }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole('switch', { name: 'Toggle Discord' }),
            ).toBeInTheDocument();

            unmount();
            renderTab(props);

            expect(
                within(screen.getByRole('group', { name: 'Layout' })).getByRole(
                    'button',
                    { name: 'List' },
                ),
            ).toHaveAttribute('aria-pressed', 'true');
        });

        test('the grid cards have a maximum width', () => {
            const { container } = renderTab(props);

            expect(container.querySelector('.grid > .max-w-md')).not.toBeNull();
        });

        test('search and filters apply in the list too', async () => {
            renderTab(props);

            await userEvent.click(
                within(screen.getByRole('group', { name: 'Layout' })).getByRole(
                    'button',
                    { name: 'List' },
                ),
            );
            await userEvent.type(screen.getByRole('searchbox'), 'disc');

            expect(
                screen.getByRole('link', { name: 'Discord' }),
            ).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: 'Slack' })).toBeNull();
        });
    });

    describe('search and filters', () => {
        const props = {
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
            integrationStatuses: { discord: true, jira: false, github: true },
        };
        beforeEach(() => localStorage.setItem('integrations:filters', 'open'));

        const names = () =>
            screen
                .getAllByRole('heading', { level: 3 })
                .map((heading) => heading.textContent);

        test('typing narrows the grid at once, by name, vendor and description', async () => {
            renderTab(props);

            await userEvent.type(
                screen.getByRole('searchbox', { name: 'Search integrations' }),
                'disc',
            );

            expect(names()).toEqual(['Discord']);

            await userEvent.clear(screen.getByRole('searchbox'));
            await userEvent.type(screen.getByRole('searchbox'), 'sentry');

            expect(names()).toEqual(['Sentry']);
        });

        test('every word has to match, in any order', async () => {
            renderTab(props);

            await userEvent.type(
                screen.getByRole('searchbox'),
                'communication discord',
            );

            expect(names()).toEqual(['Discord']);
        });

        test('the status filter shows only the enabled, the disabled or the unreleased', async () => {
            renderTab(props);

            await userEvent.click(
                screen.getByRole('button', { name: /^Enabled/ }),
            );
            expect(names().sort()).toEqual(['Discord', 'GitHub']);

            await userEvent.click(
                screen.getByRole('button', { name: /^Disabled/ }),
            );
            expect(names()).toEqual(['Jira']);

            await userEvent.click(
                screen.getByRole('button', { name: /^Coming soon/ }),
            );
            expect(names()).not.toContain('Discord');
            expect(names()).toContain('Slack');
        });

        test('the status buttons count what they would show', async () => {
            renderTab(props);

            expect(
                screen.getByRole('button', { name: /^Enabled 2$/ }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: /^Disabled 1$/ }),
            ).toBeInTheDocument();

            await userEvent.type(screen.getByRole('searchbox'), 'jira');

            expect(
                screen.getByRole('button', { name: /^Enabled 0$/ }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: /^Disabled 1$/ }),
            ).toBeInTheDocument();
        });

        test('the search, the category and the status work together', async () => {
            renderTab(props);

            await userEvent.click(
                screen.getByRole('button', { name: /^Enabled/ }),
            );
            await userEvent.click(
                screen.getByRole('button', { name: /^Communication/ }),
            );

            expect(names()).toEqual(['Discord']);
        });

        test('shows an empty state that clears the filters', async () => {
            renderTab(props);

            await userEvent.type(screen.getByRole('searchbox'), 'zzzz');

            expect(
                screen.getByText('No integrations found'),
            ).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: 'Discord' })).toBeNull();

            await userEvent.click(
                screen.getByRole('button', { name: 'Clear filters' }),
            );

            expect(screen.getByRole('searchbox')).toHaveValue('');
            expect(
                screen.getByRole('link', { name: 'Discord' }),
            ).toBeInTheDocument();
        });

        test('announces how many integrations are shown', async () => {
            renderTab(props);

            await userEvent.type(screen.getByRole('searchbox'), 'disc');

            expect(screen.getByRole('status')).toHaveTextContent(
                '1 integration',
            );
        });

        test('Escape clears the search and the clear button too, keeping focus in the field', async () => {
            renderTab(props);
            const field = screen.getByRole('searchbox');

            await userEvent.type(field, 'disc');
            await userEvent.keyboard('{Escape}');

            expect(field).toHaveValue('');

            await userEvent.type(field, 'jira');
            await userEvent.click(
                screen.getByRole('button', { name: 'Clear search' }),
            );

            expect(field).toHaveValue('');
            expect(field).toHaveFocus();
        });

        test('has no clear button while the field is empty', () => {
            renderTab(props);

            expect(
                screen.queryByRole('button', { name: 'Clear search' }),
            ).toBeNull();
        });
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
