import { AlertProvider } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
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
                {...props}
            />
        </AlertProvider>,
    );

describe('WorkspaceSettingsTemplatesModal', () => {
    test('renders existing templates', () => {
        renderModal({ canManageTemplates: true });

        expect(screen.getByText('Standard Bug Report')).toBeInTheDocument();
        expect(screen.getByText('Steps to reproduce...')).toBeInTheDocument();
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

    test('without canManageTemplates, no delete control or create form is shown', () => {
        renderModal({ canManageTemplates: false });

        expect(screen.queryByTitle('Delete template')).not.toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText('Template name'),
        ).not.toBeInTheDocument();
    });

    test('creating a template posts the parsed labels and priority', () => {
        renderModal({ canManageTemplates: true });

        fireEvent.change(screen.getByPlaceholderText('Template name'), {
            target: { value: 'Quick Report' },
        });
        fireEvent.change(
            screen.getByPlaceholderText('Default labels (comma-separated)'),
            { target: { value: 'bug, urgent' } },
        );
        fireEvent.click(screen.getByText('Add template'));

        expect(routerMock.post).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.templates.store'),
            expect.objectContaining({
                name: 'Quick Report',
                default_labels: ['bug', 'urgent'],
            }),
            expect.any(Object),
        );
    });

    test('creating a template includes the description and default priority', () => {
        renderModal({ canManageTemplates: true });

        fireEvent.change(screen.getByPlaceholderText('Template name'), {
            target: { value: 'Quick Report' },
        });
        fireEvent.change(
            screen.getByPlaceholderText(
                'Description prefilled on new issues (optional)',
            ),
            { target: { value: 'Steps to reproduce' } },
        );
        fireEvent.click(screen.getByText('Default priority'));
        fireEvent.click(screen.getByText('High'));
        fireEvent.click(screen.getByText('Add template'));

        expect(routerMock.post).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.templates.store'),
            expect.objectContaining({
                description: 'Steps to reproduce',
                default_priority: 'high',
            }),
            expect.any(Object),
        );
    });

    test('the add-template button is disabled until a name is entered', () => {
        renderModal({ canManageTemplates: true });

        expect(screen.getByText('Add template')).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('Template name'), {
            target: { value: 'Quick Report' },
        });

        expect(screen.getByText('Add template')).not.toBeDisabled();
    });

    test('deleting a template calls the destroy endpoint', () => {
        renderModal({ canManageTemplates: true });

        fireEvent.click(screen.getByTitle('Delete template'));

        expect(routerMock.delete).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.templates.destroy'),
            expect.any(Object),
        );
    });
});
