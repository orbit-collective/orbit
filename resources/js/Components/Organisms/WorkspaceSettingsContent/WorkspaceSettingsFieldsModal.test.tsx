import { AlertProvider } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsFieldsModal from './WorkspaceSettingsFieldsModal';

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
    fields: [
        {
            id: 5,
            issueTypeId: 1,
            label: 'Steps to reproduce',
            type: 'textarea',
            options: [],
            placeholder: null,
            isRequired: true,
        },
        {
            id: 6,
            issueTypeId: 1,
            label: 'Severity',
            type: 'select',
            options: ['Low', 'High'],
            placeholder: null,
            isRequired: false,
        },
    ],
};

const renderModal = (
    props: Partial<Parameters<typeof WorkspaceSettingsFieldsModal>[0]> = {},
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsFieldsModal
                isOpen
                onClose={vi.fn()}
                projectId={1}
                issueType={bugType}
                canManageFields
                {...props}
            />
        </AlertProvider>,
    );

describe('WorkspaceSettingsFieldsModal', () => {
    beforeEach(() => vi.clearAllMocks());

    test('lists the fields already defined on the type', () => {
        renderModal();

        expect(screen.getByText('Steps to reproduce')).toBeInTheDocument();
        expect(screen.getByText('Severity')).toBeInTheDocument();
        expect(screen.getByText('Required')).toBeInTheDocument();
        expect(screen.getByText('Low · High')).toBeInTheDocument();
    });

    test('shows an empty state for a type with no extra fields', () => {
        renderModal({ issueType: { ...bugType, fields: [] } });

        expect(screen.getByText('No extra fields yet.')).toBeInTheDocument();
    });

    test('adding a field posts its label and type', () => {
        renderModal();

        fireEvent.change(screen.getByPlaceholderText('New field label'), {
            target: { value: 'Environment' },
        });
        fireEvent.click(screen.getByText('Add field'));

        expect(routerMock.post).toHaveBeenCalledWith(
            expect.stringContaining('fields.store'),
            expect.objectContaining({
                label: 'Environment',
                type: 'text',
                is_required: false,
            }),
            expect.any(Object),
        );
    });

    test('a blank label does not add a field', () => {
        renderModal();

        fireEvent.click(screen.getByText('Add field'));

        expect(routerMock.post).not.toHaveBeenCalled();
    });

    test('choosing the Choice type reveals the options input and splits it', () => {
        renderModal();

        fireEvent.click(
            within(screen.getByTestId('new-field-type')).getByRole('button'),
        );
        const choiceOptions = screen.getAllByText('Choice');
        fireEvent.click(choiceOptions[choiceOptions.length - 1]);

        fireEvent.change(screen.getByPlaceholderText('New field label'), {
            target: { value: 'Severity' },
        });
        fireEvent.change(
            screen.getByPlaceholderText('Choices, comma separated'),
            { target: { value: 'Low, High ,, Critical' } },
        );
        fireEvent.click(screen.getByText('Add field'));

        expect(routerMock.post).toHaveBeenCalledWith(
            expect.stringContaining('fields.store'),
            expect.objectContaining({
                type: 'select',
                options: ['Low', 'High', 'Critical'],
            }),
            expect.any(Object),
        );
    });

    test('deleting a field calls the destroy route', () => {
        renderModal();

        fireEvent.click(screen.getByLabelText('Delete Severity'));

        expect(routerMock.delete).toHaveBeenCalledWith(
            expect.stringContaining('fields.destroy'),
            expect.any(Object),
        );
    });

    test('offers no add form or delete buttons without permission', () => {
        renderModal({ canManageFields: false });

        expect(screen.queryByText('Add field')).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('Delete Severity'),
        ).not.toBeInTheDocument();
    });
});
