import { AlertProvider } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsWorkflowModal from './WorkspaceSettingsWorkflowModal';

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params?: Array<string | number>) =>
            `/${name}/${(params ?? []).join('/')}`,
    ),
);

const routerMock = vi.hoisted(() => ({
    post: vi.fn(),
    delete: vi.fn(),
}));

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({ props: { flash: {} } }),
        router: routerMock,
    };
});

const bugType: IssueType = {
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
    statuses: [
        {
            id: 10,
            issueTypeId: 1,
            name: 'To Do',
            color: '#94a3b8',
            category: 'todo',
            isInitial: true,
        },
        {
            id: 11,
            issueTypeId: 1,
            name: 'Done',
            color: '#22c55e',
            category: 'done',
            isInitial: false,
        },
    ],
    transitions: [
        { id: 100, issueTypeId: 1, fromStatusId: 10, toStatusId: 11 },
    ],
};

const renderModal = (
    props: Partial<Parameters<typeof WorkspaceSettingsWorkflowModal>[0]>,
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsWorkflowModal
                isOpen
                onClose={vi.fn()}
                projectId={1}
                issueType={bugType}
                {...props}
            />
        </AlertProvider>,
    );

describe('WorkspaceSettingsWorkflowModal', () => {
    test('renders every status and marks the initial one', () => {
        renderModal({ canUpdateWorkflow: true });

        expect(screen.getAllByText('To Do').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Done').length).toBeGreaterThan(0);
        expect(screen.getByText('Initial')).toBeInTheDocument();
    });

    test('renders the transition chips with the existing transition marked allowed', () => {
        renderModal({ canUpdateWorkflow: true });

        expect(
            screen.getByLabelText('Allow transition from To Do to Done'),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByLabelText('Allow transition from Done to To Do'),
        ).toHaveAttribute('aria-pressed', 'false');
    });

    test('toggling an unmarked chip posts a new transition', () => {
        renderModal({ canUpdateWorkflow: true });

        fireEvent.click(
            screen.getByLabelText('Allow transition from Done to To Do'),
        );

        expect(routerMock.post).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.transitions.store'),
            { from_status_id: 11, to_status_id: 10 },
            expect.any(Object),
        );
    });

    test('toggling an allowed chip deletes the transition', () => {
        renderModal({ canUpdateWorkflow: true });

        fireEvent.click(
            screen.getByLabelText('Allow transition from To Do to Done'),
        );

        expect(routerMock.delete).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.transitions.destroy'),
            expect.any(Object),
        );
    });

    test('without canUpdateWorkflow, transition chips and the delete-status control are disabled/hidden', () => {
        renderModal({ canUpdateWorkflow: false });

        expect(
            screen.getByLabelText('Allow transition from To Do to Done'),
        ).toBeDisabled();
        expect(screen.queryByTitle('Delete status')).not.toBeInTheDocument();
    });

    test('filling in the add-status form and submitting posts the new status', () => {
        renderModal({ canUpdateWorkflow: true });

        fireEvent.change(screen.getByPlaceholderText('New status name'), {
            target: { value: 'Blocked' },
        });
        fireEvent.click(
            within(screen.getByTestId('new-status-category')).getByRole(
                'button',
            ),
        );
        fireEvent.click(screen.getByText('In Progress'));
        fireEvent.click(screen.getByLabelText('Use color #ff5722'));
        fireEvent.click(screen.getByText('Add status'));

        expect(routerMock.post).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.statuses.store'),
            { name: 'Blocked', color: '#ff5722', category: 'in_progress' },
            expect.any(Object),
        );
    });

    test('the add-status button is disabled until a name is entered', () => {
        renderModal({ canUpdateWorkflow: true });

        expect(screen.getByText('Add status')).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('New status name'), {
            target: { value: 'Blocked' },
        });

        expect(screen.getByText('Add status')).not.toBeDisabled();
    });

    test('clicking delete on a status calls the destroy endpoint', () => {
        renderModal({ canUpdateWorkflow: true });

        fireEvent.click(screen.getAllByTitle('Delete status')[0]);

        expect(routerMock.delete).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.statuses.destroy'),
            expect.any(Object),
        );
    });

    test('renders nothing when no issue type is given', () => {
        renderModal({ issueType: null });

        expect(screen.queryByText('Statuses')).not.toBeInTheDocument();
    });
});
