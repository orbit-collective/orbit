import { AlertProvider } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsTemplatesModal from './WorkspaceSettingsTemplatesModal';

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params?: Array<string | number>) =>
            `/${name}/${(params ?? []).join('/')}`,
    ),
);

const routerMock = vi.hoisted(() => ({
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
    templates: [
        {
            id: 5,
            issueTypeId: 1,
            name: 'Standard Bug Report',
            description: 'Steps to reproduce...',
            defaultPriority: 'high',
            defaultLabels: ['bug'],
        },
    ],
};

const labels: ProjectLabel[] = [
    { id: 1, name: 'bug', color: '#f44336', description: null, isSystem: true },
    {
        id: 2,
        name: 'chore',
        color: '#e91e63',
        description: null,
        isSystem: true,
    },
];

const renderModal = (
    props: Partial<Parameters<typeof WorkspaceSettingsTemplatesModal>[0]>,
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsTemplatesModal
                isOpen
                onClose={vi.fn()}
                projectId={1}
                issueType={bugType}
                labels={labels}
                {...props}
            />
        </AlertProvider>,
    );

describe('WorkspaceSettingsTemplatesModal', () => {
    beforeEach(() => vi.clearAllMocks());

    test('renders an existing template with its description, priority and labels', () => {
        renderModal({ canManageTemplates: true });

        expect(screen.getByText('Standard Bug Report')).toBeInTheDocument();
        expect(screen.getByText('Steps to reproduce...')).toBeInTheDocument();
        expect(screen.getByText('High priority')).toBeInTheDocument();
        expect(screen.getByText('Applied by default')).toBeInTheDocument();
    });

    test('shows an empty state when there are no templates', () => {
        renderModal({
            issueType: { ...bugType, templates: [] },
            canManageTemplates: true,
        });

        expect(
            screen.getByText('No templates yet for this issue type.'),
        ).toBeInTheDocument();
    });

    test('without permission there is no edit, delete or create control', () => {
        renderModal({ canManageTemplates: false });

        expect(
            screen.queryByLabelText('Delete Standard Bug Report'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('Edit Standard Bug Report'),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('New template')).not.toBeInTheDocument();
    });

    test('the form stays closed until a template is being created or edited', () => {
        renderModal({ canManageTemplates: true });

        expect(
            screen.queryByPlaceholderText('Template name'),
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('New template'));

        expect(
            screen.getByPlaceholderText('Template name'),
        ).toBeInTheDocument();
    });

    test('creating a template posts its name, description, priority and labels', () => {
        renderModal({ canManageTemplates: true });

        fireEvent.click(screen.getByText('New template'));
        fireEvent.change(screen.getByPlaceholderText('Template name'), {
            target: { value: 'Quick Report' },
        });
        fireEvent.change(
            screen.getByPlaceholderText(
                'Description every new issue of this type starts from',
            ),
            { target: { value: '## Steps' } },
        );
        fireEvent.click(screen.getByLabelText('Default priority'));
        fireEvent.click(screen.getByText('High'));
        fireEvent.click(screen.getByRole('button', { name: 'chore' }));
        fireEvent.click(screen.getByText('Add template'));

        expect(routerMock.post).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.templates.store'),
            expect.objectContaining({
                name: 'Quick Report',
                description: '## Steps',
                default_priority: 'high',
                default_labels: ['chore'],
            }),
            expect.any(Object),
        );
    });

    test('editing a template prefills the form and patches it', () => {
        renderModal({ canManageTemplates: true });

        fireEvent.click(screen.getByLabelText('Edit Standard Bug Report'));

        const nameInput = screen.getByPlaceholderText('Template name');
        expect(nameInput).toHaveValue('Standard Bug Report');
        expect(screen.getByText('Edit template')).toBeInTheDocument();

        fireEvent.change(nameInput, { target: { value: 'Renamed' } });
        fireEvent.click(screen.getByText('Save changes'));

        expect(routerMock.patch).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.templates.update'),
            expect.objectContaining({
                name: 'Renamed',
                default_labels: ['bug'],
            }),
            expect.any(Object),
        );
    });

    test('a label already on the template starts selected and can be removed', () => {
        renderModal({ canManageTemplates: true });

        fireEvent.click(screen.getByLabelText('Edit Standard Bug Report'));

        const bugToggle = screen.getByRole('button', { name: 'bug' });
        expect(bugToggle).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(bugToggle);
        fireEvent.click(screen.getByText('Save changes'));

        expect(routerMock.patch).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ default_labels: [] }),
            expect.any(Object),
        );
    });

    test('cancelling closes the form without saving', () => {
        renderModal({ canManageTemplates: true });

        fireEvent.click(screen.getByLabelText('Edit Standard Bug Report'));
        fireEvent.click(screen.getByText('Cancel'));

        expect(
            screen.queryByPlaceholderText('Template name'),
        ).not.toBeInTheDocument();
        expect(routerMock.patch).not.toHaveBeenCalled();
    });

    test('the save button is disabled until a name is entered', () => {
        renderModal({ canManageTemplates: true });

        fireEvent.click(screen.getByText('New template'));

        expect(screen.getByText('Add template')).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('Template name'), {
            target: { value: 'Quick Report' },
        });

        expect(screen.getByText('Add template')).not.toBeDisabled();
    });

    test('deleting a template calls the destroy endpoint', () => {
        renderModal({ canManageTemplates: true });

        fireEvent.click(screen.getByLabelText('Delete Standard Bug Report'));

        expect(routerMock.delete).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.templates.destroy'),
            expect.any(Object),
        );
    });

    test('a project with no labels says so instead of showing an empty picker', () => {
        renderModal({ canManageTemplates: true, labels: [] });

        fireEvent.click(screen.getByText('New template'));

        expect(
            within(screen.getByText('Default labels').parentElement!).getByText(
                'This project has no labels yet.',
            ),
        ).toBeInTheDocument();
    });
});
