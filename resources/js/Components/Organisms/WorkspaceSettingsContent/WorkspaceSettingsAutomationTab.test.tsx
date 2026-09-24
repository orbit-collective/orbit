import { AlertProvider } from '@/context/AlertContext';
import { AutomationRule } from '@/types/Automation';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsAutomationTab from './WorkspaceSettingsAutomationTab';

type VisitOptions = {
    onSuccess?: () => void;
    onError?: (errors: Record<string, string>) => void;
};

const { mockRouterPatch, mockRouterGet, mockRouterPost, mockRouterDelete } =
    vi.hoisted(() => ({
        mockRouterPatch: vi.fn(),
        mockRouterGet: vi.fn(),
        mockRouterPost: vi.fn(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onSuccess?.();
            },
        ),
        mockRouterDelete: vi.fn(),
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
    actions: [{ type: 'change_priority', params: { priority: 'high' } }],
};

describe('WorkspaceSettingsAutomationTab', () => {
    test('renders no access message when the user cannot view automation', () => {
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            hasAutomationAccess: false,
        });

        expect(screen.getByText('No access')).toBeInTheDocument();
    });

    test('renders an existing rule', () => {
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [rule],
            triggerTypes: [
                {
                    value: 'github.pull_request.merged',
                    label: 'GitHub pull request merged',
                },
            ],
            actionTypes: [
                { value: 'change_priority', label: 'Change priority' },
            ],
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        expect(screen.getByText('Merge to done')).toBeInTheDocument();
        expect(
            screen.getByText(/GitHub pull request merged/),
        ).toBeInTheDocument();
    });

    test('deletes a rule', async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [rule],
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        await user.click(screen.getByText('Delete'));

        expect(mockRouterDelete).toHaveBeenCalledWith(
            '/projects/1/automation-rules/1',
            expect.anything(),
        );
    });

    test('creates a rule from the add form', async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [],
            triggerTypes: [
                {
                    value: 'github.pull_request.merged',
                    label: 'GitHub pull request merged',
                },
            ],
            actionTypes: [
                { value: 'change_priority', label: 'Change priority' },
            ],
            hasAutomationAccess: true,
            canUpdateAutomation: true,
        });

        await user.click(screen.getByText('+ Add rule'));
        await user.type(screen.getByPlaceholderText('Rule name'), 'New rule');
        await user.click(screen.getByText('Create rule'));

        expect(mockRouterPost).toHaveBeenCalledWith(
            '/projects/1/automation-rules',
            expect.objectContaining({ name: 'New rule' }),
            expect.anything(),
        );
    });

    test('does not render management controls without update access', () => {
        renderTab({
            memberProjects: [project],
            selectedProjectId: 1,
            automationRules: [rule],
            hasAutomationAccess: true,
            canUpdateAutomation: false,
        });

        expect(screen.queryByText('Delete')).not.toBeInTheDocument();
        expect(screen.queryByText('+ Add rule')).not.toBeInTheDocument();
    });
});
