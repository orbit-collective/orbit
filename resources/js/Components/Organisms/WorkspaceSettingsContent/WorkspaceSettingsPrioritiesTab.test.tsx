import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AlertProvider } from '@/context/AlertContext';
import { priorities } from '@/stories/fixtures';
import { SettingsPriority } from '@/types/Priorities';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import WorkspaceSettingsPrioritiesTab from './WorkspaceSettingsPrioritiesTab';

const mockRouter = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
}));
const mockRouterGet = mockRouter.get;

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
        router: { ...actual.router, ...mockRouter },
    };
});

const project: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };
const settingsPriorities: SettingsPriority[] = priorities.map(
    (priority, index) => ({ ...priority, issueCount: [4, 9, 1][index] }),
);

const renderTab = (
    props: Partial<Parameters<typeof WorkspaceSettingsPrioritiesTab>[0]> = {},
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsPrioritiesTab
                memberProjects={[project]}
                selectedProjectId={1}
                priorities={settingsPriorities}
                hasPrioritiesAccess
                {...props}
            />
        </AlertProvider>,
    );

beforeEach(() => {
    mockRouter.get.mockClear();
    mockRouter.post.mockClear();
    mockRouter.patch.mockClear();
    mockRouter.delete.mockClear();
});

describe('WorkspaceSettingsPrioritiesTab', () => {
    test('lists the project priorities in order with their issue counts', () => {
        renderTab();

        // One row per priority, most important first (High, Medium, Low).
        expect(
            screen
                .getAllByText(/^\d+ issues?$/)
                .map((node) => node.textContent),
        ).toEqual(['4 issues', '9 issues', '1 issue']);
        expect(screen.getByText('High')).toBeInTheDocument();
        expect(screen.getByText('Low')).toBeInTheDocument();
    });

    test('marks the default priority', () => {
        renderTab();

        expect(screen.getAllByText('Default')).toHaveLength(1);
    });

    test('summarises the scale in the stat cards', () => {
        renderTab();

        expect(screen.getByText('Priority levels')).toBeInTheDocument();
        expect(screen.getByText('Default for new issues')).toBeInTheDocument();
        expect(screen.getByText('14')).toBeInTheDocument();
    });

    test('shows "None" as the default when the project flags no default', () => {
        renderTab({
            priorities: settingsPriorities.map((priority) => ({
                ...priority,
                isDefault: false,
            })),
        });

        expect(screen.getByText('None')).toBeInTheDocument();
    });

    test("switching project loads that project's priorities", async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project, { id: 2, name: 'Mobile', color: 'red' }],
        });

        await user.click(screen.getByText('Mobile'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/settings/priorities?project=2',
            {},
            { preserveScroll: true, preserveState: true },
        );
    });

    test('explains when the user is not in any project', () => {
        renderTab({ memberProjects: [], selectedProjectId: null });

        expect(
            screen.getByText("You're not part of any project yet"),
        ).toBeInTheDocument();
    });

    test('explains when the user lacks the view permission', () => {
        renderTab({ hasPrioritiesAccess: false, priorities: [] });

        expect(
            screen.getByText(
                "You don't have access to this project's priorities",
            ),
        ).toBeInTheDocument();
        expect(screen.queryByText('Priority levels')).not.toBeInTheDocument();
    });

    describe('creating and editing', () => {
        test('a user with no priority capabilities sees neither New priority nor edit controls', () => {
            renderTab();

            expect(screen.queryByText('New priority')).not.toBeInTheDocument();
            expect(
                screen.queryByTitle('Edit priority'),
            ).not.toBeInTheDocument();
        });

        test('a create-only user sees New priority but no edit controls', () => {
            renderTab({ canCreatePriorities: true });

            expect(screen.getByText('New priority')).toBeInTheDocument();
            expect(
                screen.queryByTitle('Edit priority'),
            ).not.toBeInTheDocument();
        });

        test('an update-only user sees an edit control per row but cannot create', () => {
            renderTab({ canUpdatePriorities: true });

            expect(screen.queryByText('New priority')).not.toBeInTheDocument();
            expect(screen.getAllByTitle('Edit priority')).toHaveLength(3);
        });

        test('creating a priority posts it to the project', async () => {
            const user = userEvent.setup();
            renderTab({ canCreatePriorities: true });

            await user.click(screen.getByText('New priority'));
            await user.type(
                screen.getByPlaceholderText('Priority name'),
                'Blocker',
            );
            await user.click(
                screen.getByRole('button', { name: 'Create priority' }),
            );

            expect(mockRouter.post).toHaveBeenCalledWith(
                '/projects.priorities.store/1',
                expect.objectContaining({ name: 'Blocker', is_default: false }),
                expect.objectContaining({ preserveScroll: true }),
            );
        });

        test('editing a priority patches that priority', async () => {
            const user = userEvent.setup();
            renderTab({ canUpdatePriorities: true });

            await user.click(screen.getAllByTitle('Edit priority')[0]);
            const input = screen.getByPlaceholderText('Priority name');
            await user.clear(input);
            await user.type(input, 'Critical');
            await user.click(
                screen.getByRole('button', { name: 'Save changes' }),
            );

            expect(mockRouter.patch).toHaveBeenCalledWith(
                '/projects.priorities.update/1/1',
                expect.objectContaining({ name: 'Critical' }),
                expect.objectContaining({ preserveScroll: true }),
            );
        });

        test('only one editor is open at a time and cancel closes it', async () => {
            const user = userEvent.setup();
            renderTab({ canCreatePriorities: true, canUpdatePriorities: true });

            await user.click(screen.getByText('New priority'));
            expect(
                screen.getByText('New priority', { selector: 'div' }),
            ).toBeInTheDocument();
            await user.click(screen.getAllByTitle('Edit priority')[0]);

            expect(screen.getByText('Editing priority')).toBeInTheDocument();
            expect(
                screen.queryByRole('button', { name: 'Create priority' }),
            ).not.toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(
                screen.queryByText('Editing priority'),
            ).not.toBeInTheDocument();
        });

        test('a server error keeps the editor open and shows it under the name', async () => {
            const user = userEvent.setup();
            mockRouter.post.mockImplementation(
                (
                    _url: string,
                    _data: unknown,
                    options: { onError: (e: Record<string, string>) => void },
                ) => options.onError({ name: 'That name is taken.' }),
            );
            renderTab({ canCreatePriorities: true });

            await user.click(screen.getByText('New priority'));
            await user.type(
                screen.getByPlaceholderText('Priority name'),
                'High',
            );
            await user.click(
                screen.getByRole('button', { name: 'Create priority' }),
            );

            expect(screen.getByRole('alert')).toHaveTextContent(
                'That name is taken.',
            );
            expect(
                screen.getByText('New priority', { selector: 'div' }),
            ).toBeInTheDocument();
        });
    });

    describe('ordering and deleting', () => {
        test('shows move controls only to a user who can update priorities', () => {
            renderTab();

            expect(screen.queryByTitle('Move up')).not.toBeInTheDocument();
            expect(screen.queryByTitle('Move down')).not.toBeInTheDocument();
        });

        test('the first row cannot move up and the last cannot move down', () => {
            renderTab({ canUpdatePriorities: true });

            expect(screen.getAllByTitle('Move up')[0]).toBeDisabled();
            expect(screen.getAllByTitle('Move down')[2]).toBeDisabled();
            expect(screen.getAllByTitle('Move up')[1]).toBeEnabled();
        });

        test('moving a priority down sends the new order of ids', async () => {
            const user = userEvent.setup();
            renderTab({ canUpdatePriorities: true });

            await user.click(screen.getAllByTitle('Move down')[0]);

            expect(mockRouter.patch).toHaveBeenCalledWith(
                '/projects.priorities.reorder/1',
                { order: [2, 1, 3] },
                expect.objectContaining({ preserveScroll: true }),
            );
        });

        test('moving a priority up sends the new order of ids', async () => {
            const user = userEvent.setup();
            renderTab({ canUpdatePriorities: true });

            await user.click(screen.getAllByTitle('Move up')[2]);

            expect(mockRouter.patch).toHaveBeenCalledWith(
                '/projects.priorities.reorder/1',
                { order: [1, 3, 2] },
                expect.objectContaining({ preserveScroll: true }),
            );
        });

        test('a project with a single priority offers no moving and no deleting', () => {
            renderTab({
                canUpdatePriorities: true,
                canDeletePriorities: true,
                priorities: [settingsPriorities[0]],
            });

            expect(screen.queryByTitle('Move up')).not.toBeInTheDocument();
            expect(
                screen.queryByTitle('Delete priority'),
            ).not.toBeInTheDocument();
            expect(screen.getByTitle('Edit priority')).toBeInTheDocument();
        });

        test('a delete-only user sees delete but not edit or move controls', () => {
            renderTab({ canDeletePriorities: true });

            expect(screen.getAllByTitle('Delete priority')).toHaveLength(3);
            expect(
                screen.queryByTitle('Edit priority'),
            ).not.toBeInTheDocument();
            expect(screen.queryByTitle('Move up')).not.toBeInTheDocument();
        });

        test('deleting moves the issues to the chosen priority', async () => {
            const user = userEvent.setup();
            renderTab({ canDeletePriorities: true });

            await user.click(screen.getAllByTitle('Delete priority')[0]);
            await user.selectOptions(screen.getByRole('combobox'), 'Low');
            // The modal's confirm button comes after the row icons that share its name.
            await user.click(
                screen
                    .getAllByRole('button', { name: 'Delete priority' })
                    .at(-1)!,
            );

            expect(mockRouter.delete).toHaveBeenCalledWith(
                '/projects.priorities.destroy/1/1',
                expect.objectContaining({
                    data: { replacement_id: 3 },
                    preserveScroll: true,
                }),
            );
        });

        test('deleting without choosing leaves the issues without a priority', async () => {
            const user = userEvent.setup();
            renderTab({ canDeletePriorities: true });

            await user.click(screen.getAllByTitle('Delete priority')[2]);
            // The modal's confirm button comes after the row icons that share its name.
            await user.click(
                screen
                    .getAllByRole('button', { name: 'Delete priority' })
                    .at(-1)!,
            );

            expect(mockRouter.delete).toHaveBeenCalledWith(
                '/projects.priorities.destroy/1/3',
                expect.objectContaining({ data: { replacement_id: null } }),
            );
        });

        test('cancelling the delete modal deletes nothing', async () => {
            const user = userEvent.setup();
            renderTab({ canDeletePriorities: true });

            await user.click(screen.getAllByTitle('Delete priority')[0]);
            await user.click(screen.getByRole('button', { name: 'Cancel' }));

            expect(mockRouter.delete).not.toHaveBeenCalled();
        });
    });
});
