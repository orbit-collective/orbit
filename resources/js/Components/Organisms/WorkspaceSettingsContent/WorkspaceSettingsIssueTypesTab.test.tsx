import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { AlertProvider } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import WorkspaceSettingsIssueTypesTab from './WorkspaceSettingsIssueTypesTab';

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params?: Array<string | number>) =>
            `/${name}/${(params ?? []).join('/')}`,
    ),
);

const routerMock = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
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
        router: { ...actual.router, ...routerMock },
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
                screen.queryByText('Add issue type'),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByTitle('Edit issue type'),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByTitle('Delete issue type'),
            ).not.toBeInTheDocument();
        });

        test('a create-only user sees the "Add issue type" row but no edit or delete controls', () => {
            renderTab({ canCreateIssueTypes: true });

            expect(screen.getByText('Add issue type')).toBeInTheDocument();
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

        test('without any configuration permission there is no Configure menu', () => {
            renderTab({});

            expect(screen.queryByTitle('Configure')).not.toBeInTheDocument();
        });

        test('a canUpdateWorkflow user gets a Configure menu with only the workflow on every type', () => {
            renderTab({ canUpdateWorkflow: true });

            expect(screen.getAllByTitle('Configure')).toHaveLength(2);

            fireEvent.click(screen.getAllByTitle('Configure')[0]);

            expect(
                screen.getAllByRole('menuitem').map((item) => item.textContent),
            ).toEqual(['Workflow']);
        });

        test("an update user's Configure menu offers hierarchy, templates and custom fields", () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Configure')[0]);

            expect(
                screen.getAllByRole('menuitem').map((item) => item.textContent),
            ).toEqual(['Hierarchy', 'Templates', 'Custom fields']);
        });

        test('with every permission the menu lists all four', () => {
            renderTab({ canUpdateIssueTypes: true, canUpdateWorkflow: true });

            fireEvent.click(screen.getAllByTitle('Configure')[0]);

            expect(
                screen.getAllByRole('menuitem').map((item) => item.textContent),
            ).toEqual(['Workflow', 'Hierarchy', 'Templates', 'Custom fields']);
        });
    });

    describe('inline editor', () => {
        test('clicking "Add issue type" opens an empty row in place of the add line', () => {
            renderTab({ canCreateIssueTypes: true });

            fireEvent.click(screen.getByText('Add issue type'));

            expect(screen.getByPlaceholderText('Issue type name')).toHaveValue(
                '',
            );
            expect(
                screen.queryByText('Add issue type'),
            ).not.toBeInTheDocument();
        });

        test('the existing row turns into the editor where it stands', () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Edit issue type')[0]);

            // Bug is now an editor; the other type keeps its plain row.
            expect(screen.getByDisplayValue('Bug')).toBeInTheDocument();
            expect(screen.getByText('Custom Type')).toBeInTheDocument();
        });

        test('clicking edit on an issue type opens the editor pre-filled with its name', () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Edit issue type')[0]);

            expect(screen.getByDisplayValue('Bug')).toBeInTheDocument();
        });
    });

    describe('workflow modal', () => {
        test('choosing Workflow in the Configure menu opens the workflow modal for that type', () => {
            renderTab({ canUpdateWorkflow: true });

            fireEvent.click(screen.getAllByTitle('Configure')[0]);
            fireEvent.click(screen.getByRole('menuitem', { name: 'Workflow' }));

            expect(screen.getByText('Bug workflow')).toBeInTheDocument();
        });
    });

    describe('hierarchy modal', () => {
        test('choosing Hierarchy in the Configure menu opens the hierarchy modal for that type', () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Configure')[0]);
            fireEvent.click(
                screen.getByRole('menuitem', { name: 'Hierarchy' }),
            );

            expect(screen.getByText('Bug hierarchy')).toBeInTheDocument();
        });
    });

    describe('templates modal', () => {
        test('choosing Templates in the Configure menu opens the templates modal for that type', () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Configure')[0]);
            fireEvent.click(
                screen.getByRole('menuitem', { name: 'Templates' }),
            );

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

            fireEvent.click(screen.getAllByTitle('Configure')[0]);
            fireEvent.click(screen.getByRole('menuitem', { name: 'Workflow' }));
            expect(screen.getByText('Bug workflow')).toBeInTheDocument();

            const closeButton = document.querySelector('header button');
            fireEvent.click(closeButton as Element);

            expect(screen.queryByText('Bug workflow')).not.toBeInTheDocument();
        });

        test('closing the templates modal hides it', () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Configure')[0]);
            fireEvent.click(
                screen.getByRole('menuitem', { name: 'Templates' }),
            );
            expect(screen.getByText('Bug templates')).toBeInTheDocument();

            const closeButton = document.querySelector('header button');
            fireEvent.click(closeButton as Element);

            expect(screen.queryByText('Bug templates')).not.toBeInTheDocument();
        });
    });

    describe('fields modal', () => {
        test('choosing Custom fields in the Configure menu opens the fields modal for that type', () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Configure')[0]);
            fireEvent.click(
                screen.getByRole('menuitem', { name: 'Custom fields' }),
            );

            expect(screen.getByText('Bug fields')).toBeInTheDocument();
        });
    });

    describe('saving', () => {
        test('creating an issue type posts it to the project', () => {
            renderTab({ canCreateIssueTypes: true });

            fireEvent.click(screen.getByText('Add issue type'));
            fireEvent.change(screen.getByPlaceholderText('Issue type name'), {
                target: { value: 'Incident' },
            });
            fireEvent.click(
                screen.getByRole('button', { name: 'Create issue type' }),
            );

            expect(routerMock.post).toHaveBeenCalledWith(
                '/projects.issue-types.store/1',
                expect.objectContaining({ name: 'Incident' }),
                expect.objectContaining({ preserveScroll: true }),
            );
        });

        test('saving an edited issue type patches it', () => {
            renderTab({ canUpdateIssueTypes: true });

            fireEvent.click(screen.getAllByTitle('Edit issue type')[1]);
            fireEvent.change(screen.getByDisplayValue('Custom Type'), {
                target: { value: 'Renamed' },
            });
            fireEvent.click(
                screen.getByRole('button', { name: 'Save issue type' }),
            );

            expect(routerMock.patch).toHaveBeenCalledWith(
                '/projects.issue-types.update/1/2',
                expect.objectContaining({ name: 'Renamed' }),
                expect.objectContaining({ preserveScroll: true }),
            );
        });
    });
});
