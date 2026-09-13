import { AlertProvider } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsIssueTypesTab from './WorkspaceSettingsIssueTypesTab';

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
const issueTypes: IssueType[] = [
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
        statuses: [
            {
                id: 10,
                issueTypeId: 1,
                name: 'To Do',
                color: '#94a3b8',
                category: 'todo',
                isInitial: true,
            },
        ],
        transitions: [],
    },
    {
        id: 2,
        name: 'Custom Type',
        icon: 'Star',
        color: '#000000',
        description: null,
        isSystem: false,
        allowsChildren: false,
        isTopLevel: true,
        requiredFields: [],
        restrictedRoleTypes: [],
    },
];

const renderTab = (
    props: Partial<Parameters<typeof WorkspaceSettingsIssueTypesTab>[0]>,
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsIssueTypesTab
                memberProjects={[project]}
                selectedProjectId={1}
                issueTypes={issueTypes}
                hasIssueTypesAccess
                {...props}
            />
        </AlertProvider>,
    );

describe('WorkspaceSettingsIssueTypesTab', () => {
    test('renders every issue type name', () => {
        renderTab({});

        expect(screen.getByText('Bug')).toBeInTheDocument();
        expect(screen.getByText('Custom Type')).toBeInTheDocument();
    });

    test('marks system issue types with a "System" badge', () => {
        renderTab({});

        expect(screen.getByText('System')).toBeInTheDocument();
    });

    test("shows a fallback message when the user has no access to this project's issue types", () => {
        renderTab({ hasIssueTypesAccess: false });

        expect(
            screen.getByText(
                "You don't have access to this project's issue types",
            ),
        ).toBeInTheDocument();
    });

    describe('permission gating', () => {
        test('a user with no capabilities sees neither create nor edit/delete controls', () => {
            renderTab({});

            expect(
                screen.queryByText('New issue type'),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByTitle('Edit issue type'),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByTitle('Delete issue type'),
            ).not.toBeInTheDocument();
        });

        test('a create-only user sees the "New issue type" button but no edit or delete controls', () => {
            renderTab({ canCreateIssueTypes: true });

            expect(screen.getByText('New issue type')).toBeInTheDocument();
            expect(
                screen.queryByTitle('Edit issue type'),
            ).not.toBeInTheDocument();
        });

        test('an update-only user sees edit controls on every type, including system ones', () => {
            renderTab({ canUpdateIssueTypes: true });

            expect(screen.getAllByTitle('Edit issue type')).toHaveLength(2);
        });

        test('a delete-only user sees a delete control only on the custom type', () => {
            renderTab({ canDeleteIssueTypes: true });

            expect(screen.getAllByTitle('Delete issue type')).toHaveLength(1);
        });

        test('without canUpdateWorkflow, no "Manage workflow" control is shown', () => {
            renderTab({});

            expect(
                screen.queryByTitle('Manage workflow'),
            ).not.toBeInTheDocument();
        });

        test('a canUpdateWorkflow user sees a "Manage workflow" control on every type', () => {
            renderTab({ canUpdateWorkflow: true });

            expect(screen.getAllByTitle('Manage workflow')).toHaveLength(2);
        });
    });

    describe('inline editor', () => {
        test('clicking "New issue type" opens the create editor with a live preview', () => {
            renderTab({ canCreateIssueTypes: true });

            fireEvent.click(screen.getByText('New issue type'));

            expect(
                screen.getByPlaceholderText('Issue type name'),
            ).toBeInTheDocument();
            expect(screen.getByText('Preview')).toBeInTheDocument();
        });

        test('clicking edit on an issue type opens the editor pre-filled with its name', () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Edit issue type')[0]);

            expect(screen.getByDisplayValue('Bug')).toBeInTheDocument();
        });
    });

    describe('workflow modal', () => {
        test('clicking "Manage workflow" opens the workflow modal for that type', () => {
            renderTab({ canUpdateWorkflow: true });

            fireEvent.click(screen.getAllByTitle('Manage workflow')[0]);

            expect(screen.getByText('Bug workflow')).toBeInTheDocument();
        });
    });

    describe('hierarchy modal', () => {
        test('clicking "Manage hierarchy" opens the hierarchy modal for that type', () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Manage hierarchy')[0]);

            expect(screen.getByText('Bug hierarchy')).toBeInTheDocument();
        });
    });

    describe('templates modal', () => {
        test('clicking "Manage templates" opens the templates modal for that type', () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Manage templates')[0]);

            expect(screen.getByText('Bug templates')).toBeInTheDocument();
        });
    });

    describe('delete modal', () => {
        test('clicking delete on the custom type opens the confirmation modal', () => {
            renderTab({ canDeleteIssueTypes: true });

            fireEvent.click(screen.getByTitle('Delete issue type'));

            expect(
                screen.getByText('Delete issue type', { selector: 'button' }),
            ).toBeInTheDocument();
        });

        test('closing the delete modal hides it again', () => {
            renderTab({ canDeleteIssueTypes: true });

            fireEvent.click(screen.getByTitle('Delete issue type'));
            fireEvent.click(screen.getByText('Cancel'));

            expect(
                screen.queryByText('Delete issue type', {
                    selector: 'button',
                }),
            ).not.toBeInTheDocument();
        });
    });

    describe('closing workflow and templates modals', () => {
        test('closing the workflow modal hides it', () => {
            renderTab({ canUpdateWorkflow: true });

            fireEvent.click(screen.getAllByTitle('Manage workflow')[0]);
            expect(screen.getByText('Bug workflow')).toBeInTheDocument();

            const closeButton = document.querySelector('header button');
            fireEvent.click(closeButton as Element);

            expect(screen.queryByText('Bug workflow')).not.toBeInTheDocument();
        });

        test('closing the templates modal hides it', () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Manage templates')[0]);
            expect(screen.getByText('Bug templates')).toBeInTheDocument();

            const closeButton = document.querySelector('header button');
            fireEvent.click(closeButton as Element);

            expect(screen.queryByText('Bug templates')).not.toBeInTheDocument();
        });
    });
});
