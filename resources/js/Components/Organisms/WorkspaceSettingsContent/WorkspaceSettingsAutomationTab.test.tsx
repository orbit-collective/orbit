import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { AlertProvider } from '@/context/AlertContext';
import { priorities } from '@/stories/fixtures';
import { AutomationRule } from '@/types/Automation';
import { IssueType } from '@/types/IssueTypes';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import WorkspaceSettingsAutomationTab from './WorkspaceSettingsAutomationTab';

type VisitOptions = {
    onSuccess?: () => void;
    onError?: (errors: Record<string, string>) => void;
};

const { mockRouterPatch, mockRouterGet, mockRouterPost, mockRouterDelete } =
    vi.hoisted(() => ({
        mockRouterPatch: vi.fn(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onSuccess?.();
            },
        ),
        mockRouterGet: vi.fn(),
        mockRouterPost: vi.fn(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onSuccess?.();
            },
        ),
        mockRouterDelete: vi.fn((_url: string, opts?: VisitOptions) => {
            opts?.onSuccess?.();
        }),
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
            post: mockRouterPost,
            delete: mockRouterDelete,
        },
    };
});

const renderTab = (
    props: Parameters<typeof WorkspaceSettingsAutomationTab>[0],
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsAutomationTab {...props} />
        </AlertProvider>,
    );

const project: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };

const rule: AutomationRule = {
    id: 1,
    name: 'Merge to done',
    triggerType: 'github.pull_request.merged',
    conditions: [],
    enabled: true,
    actions: [{ type: 'change_priority', params: { priority: 'High' } }],
};

const triggerTypes = [
    {
        value: 'github.pull_request.merged',
        label: 'GitHub pull request merged',
    },
    {
        value: 'github.pull_request.opened',
        label: 'GitHub pull request opened',
    },
];

const actionTypes = [
    { value: 'change_priority', label: 'Change priority' },
    { value: 'change_status', label: 'Change status' },
];

describe('WorkspaceSettingsAutomationTab', () => {
    test('renders no access message when the user cannot view automation', () => {
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            hasAutomationAccess: false,
        });

        expect(screen.getByText('No access')).toBeInTheDocument();
    });

    test('lists rules in the sidebar', () => {
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [rule],
            triggerTypes,
            actionTypes,
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        expect(screen.getByText('Merge to done')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Select a rule, or create a new one, to see its flow.',
            ),
        ).toBeInTheDocument();
    });

    test('selecting a rule opens its flow with trigger and action nodes', async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [rule],
            triggerTypes,
            actionTypes,
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        await user.click(screen.getByText('Merge to done'));

        // Appears twice - once on the trigger node itself, once as the
        // selected value in its inspector dropdown (open by default).
        expect(
            screen.getAllByText('GitHub pull request merged').length,
        ).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('Change priority')).toBeInTheDocument();
    });

    test('deletes a rule from the flow header', async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [rule],
            triggerTypes,
            actionTypes,
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        await user.click(screen.getByText('Merge to done'));
        await user.click(screen.getByRole('button', { name: 'Delete' }));

        expect(mockRouterDelete).toHaveBeenCalledWith(
            '/projects/1/automation-rules/1',
            expect.anything(),
        );
    });

    test('creates a new rule end to end', async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [],
            triggerTypes,
            actionTypes,
            priorities,
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        await user.click(screen.getByRole('button', { name: 'New rule' }));

        const nameInput = screen.getByPlaceholderText('Untitled rule');
        await user.type(nameInput, 'Notify on merge');

        // The first trigger type is selected by default - switch it to the
        // second one via the inspector's picker.
        await user.click(screen.getByRole('button', { name: 'When' }));
        await user.click(screen.getByText('GitHub pull request opened'));

        // Add an action via the canvas's "+ Add action" control.
        await user.click(screen.getByRole('button', { name: 'Add action' }));
        await user.click(screen.getByText('Change priority'));

        // The newly-added action is auto-selected - fill its param.
        await user.click(screen.getByRole('button', { name: 'Priority' }));
        await user.click(screen.getByText('High'));

        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(mockRouterPost).toHaveBeenCalledWith(
            '/projects/1/automation-rules',
            expect.objectContaining({
                name: 'Notify on merge',
                trigger_type: 'github.pull_request.opened',
                actions: [
                    { type: 'change_priority', params: { priority: 'High' } },
                ],
            }),
            expect.anything(),
        );
    });

    test("the change-priority action offers the project's own priorities and starts on its default", async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [],
            triggerTypes,
            actionTypes,
            priorities: [
                { ...priorities[0], name: 'Blocker', isDefault: false },
                { ...priorities[1], name: 'Whenever', isDefault: true },
            ],
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        await user.click(screen.getByRole('button', { name: 'New rule' }));
        await user.click(screen.getByRole('button', { name: 'Add action' }));
        await user.click(screen.getByText('Change priority'));

        // The new action starts on the project's default priority.
        expect(
            screen.getByRole('button', { name: 'Priority' }),
        ).toHaveTextContent('Whenever');

        await user.click(screen.getByRole('button', { name: 'Priority' }));

        expect(screen.getByText('Blocker')).toBeInTheDocument();
        expect(screen.queryByText('High')).not.toBeInTheDocument();
    });

    test('Save is disabled until the draft actually changes', async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [rule],
            triggerTypes,
            actionTypes,
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        await user.click(screen.getByText('Merge to done'));

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('Untitled rule'), {
            target: { value: 'Merge to done (renamed)' },
        });

        expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    });

    test('does not render management controls without update access', async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [rule],
            triggerTypes,
            actionTypes,
            hasAutomationAccess: true,
            canUpdateAutomation: false,
        });

        expect(
            screen.queryByRole('button', { name: 'New rule' }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByText('Merge to done'));

        expect(
            screen.queryByRole('button', { name: 'Delete' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Save' }),
        ).not.toBeInTheDocument();
    });

    test('removing the conditions node clears every condition', async () => {
        const user = userEvent.setup();
        const ruleWithCondition: AutomationRule = {
            ...rule,
            conditions: [
                {
                    field: 'pullRequest.title',
                    operator: 'contains',
                    value: 'fix',
                },
            ],
        };

        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [ruleWithCondition],
            triggerTypes,
            actionTypes,
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        await user.click(screen.getByText('Merge to done'));

        expect(screen.getByText('1 condition')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Remove 1 condition' }),
        );

        expect(screen.queryByText('1 condition')).not.toBeInTheDocument();
        expect(screen.getByText('+ Add condition')).toBeInTheDocument();
    });

    test('condition field is a dropdown of real context fields, not free text', async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [rule],
            triggerTypes,
            actionTypes,
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        await user.click(screen.getByText('Merge to done'));
        await user.click(screen.getByText('+ Add condition'));

        expect(
            screen.queryByPlaceholderText('Field (e.g. pullRequest.title)'),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Field' }));
        await user.click(screen.getByText('Pull request title'));

        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects/1/automation-rules/1',
            expect.objectContaining({
                conditions: [
                    expect.objectContaining({ field: 'pullRequest.title' }),
                ],
            }),
            expect.anything(),
        );
    });

    describe('change status action', () => {
        const issueTypes = [
            {
                id: 1,
                name: 'Bug',
                statuses: [
                    {
                        id: 5,
                        issueTypeId: 1,
                        name: 'In Review',
                        color: '#ff9800',
                        category: 'in_progress',
                        isInitial: false,
                    },
                ],
            },
        ] as unknown as IssueType[];

        const statusRule = (
            params: Record<string, string>,
        ): AutomationRule => ({
            ...rule,
            actions: [{ type: 'change_status', params }],
        });

        const open = async (r: AutomationRule) => {
            const user = userEvent.setup();
            renderTab({
                memberProjects: [project],
                selectedProjectId: 1,
                automationRules: [r],
                triggerTypes,
                actionTypes,
                issueTypes,
                hasAutomationAccess: true,
                canUpdateAutomation: true,
            });
            await user.click(screen.getByText('Merge to done'));
            return user;
        };

        test('names the category the action moves issues to', async () => {
            await open(statusRule({ category: 'done' }));

            expect(screen.getByText('Category: Done')).toBeInTheDocument();
        });

        test('names an exact status with its issue type', async () => {
            await open(statusRule({ workflow_status_id: '5' }));

            expect(screen.getByText('Bug · In Review')).toBeInTheDocument();
        });

        test('picking an exact status saves it in place of the category', async () => {
            const user = await open(statusRule({ category: 'done' }));

            await user.click(screen.getByText('Change status'));
            await user.click(
                screen.getByRole('button', { name: 'Exact status' }),
            );
            await user.click(screen.getByText('Bug · In Review'));
            await user.click(screen.getByRole('button', { name: 'Save' }));

            expect(mockRouterPatch).toHaveBeenCalledWith(
                '/projects/1/automation-rules/1',
                expect.objectContaining({
                    actions: [
                        expect.objectContaining({
                            params: { workflow_status_id: '5' },
                        }),
                    ],
                }),
                expect.anything(),
            );
        });
    });

    test('a status category condition picks its value from the categories', async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [rule],
            triggerTypes,
            actionTypes,
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        await user.click(screen.getByText('Merge to done'));
        await user.click(screen.getByText('+ Add condition'));
        await user.click(screen.getByRole('button', { name: 'Field' }));
        await user.click(screen.getByText('Status category'));

        expect(screen.queryByPlaceholderText('Value')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Value' }));
        await user.click(screen.getByText('In Progress'));
        await user.click(screen.getByRole('button', { name: 'Save' }));

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects/1/automation-rules/1',
            expect.objectContaining({
                conditions: [
                    expect.objectContaining({
                        field: 'issue.category',
                        value: 'in_progress',
                    }),
                ],
            }),
            expect.anything(),
        );
    });
});
