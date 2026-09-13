import { AlertProvider } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { fireEvent, render, screen } from '@testing-library/react';
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

    test('renders each field with its type, required flag and choices', () => {
        renderModal();

        expect(screen.getByText('Steps to reproduce')).toBeInTheDocument();
        expect(screen.getByText('Long text')).toBeInTheDocument();
        expect(screen.getByText('Required')).toBeInTheDocument();
        expect(screen.getByText('Severity')).toBeInTheDocument();
        expect(screen.getByText('Low')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
    });

    test('shows an empty state for a type with no extra fields', () => {
        renderModal({ issueType: { ...bugType, fields: [] } });

        expect(screen.getByText('No extra fields yet.')).toBeInTheDocument();
    });

    test('the form stays closed until a field is being created or edited', () => {
        renderModal();

        expect(
            screen.queryByPlaceholderText('Field label'),
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('New field'));

        expect(screen.getByPlaceholderText('Field label')).toBeInTheDocument();
    });

    test('creating a field posts its label, type and hint', () => {
        renderModal();

        fireEvent.click(screen.getByText('New field'));
        fireEvent.change(screen.getByPlaceholderText('Field label'), {
            target: { value: 'Environment' },
        });
        fireEvent.change(
            screen.getByPlaceholderText(
                'Shown while the field is empty (optional)',
            ),
            { target: { value: 'Which environment?' } },
        );
        fireEvent.click(screen.getByText('Add field'));

        expect(routerMock.post).toHaveBeenCalledWith(
            expect.stringContaining('fields.store'),
            expect.objectContaining({
                label: 'Environment',
                type: 'text',
                placeholder: 'Which environment?',
                is_required: false,
                options: [],
            }),
            expect.any(Object),
        );
    });

    test('the choices input only appears for a Choice field and is split on commas', () => {
        renderModal();

        fireEvent.click(screen.getByText('New field'));
        expect(
            screen.queryByPlaceholderText('Low, Medium, High'),
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Field type'));
        const choiceOptions = screen.getAllByText('Choice');
        fireEvent.click(choiceOptions[choiceOptions.length - 1]);

        fireEvent.change(screen.getByPlaceholderText('Field label'), {
            target: { value: 'Urgency' },
        });
        fireEvent.change(screen.getByPlaceholderText('Low, Medium, High'), {
            target: { value: 'Low, High ,, Critical' },
        });
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

    test('editing a field prefills the form and patches it', () => {
        renderModal();

        fireEvent.click(screen.getByLabelText('Edit Severity'));

        const labelInput = screen.getByPlaceholderText('Field label');
        expect(labelInput).toHaveValue('Severity');
        expect(screen.getByText('Edit field')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Low, Medium, High')).toHaveValue(
            'Low, High',
        );

        fireEvent.change(labelInput, { target: { value: 'Urgency' } });
        fireEvent.click(screen.getByText('Save changes'));

        expect(routerMock.patch).toHaveBeenCalledWith(
            expect.stringContaining('fields.update'),
            expect.objectContaining({
                label: 'Urgency',
                type: 'select',
                options: ['Low', 'High'],
            }),
            expect.any(Object),
        );
    });

    test('editing carries the required flag through', () => {
        renderModal();

        fireEvent.click(screen.getByLabelText('Edit Steps to reproduce'));

        expect(screen.getByRole('checkbox')).toBeChecked();
    });

    test('a checkbox field offers no hint input', () => {
        renderModal();

        fireEvent.click(screen.getByText('New field'));
        fireEvent.click(screen.getByLabelText('Field type'));
        const checkboxOptions = screen.getAllByText('Checkbox');
        fireEvent.click(checkboxOptions[checkboxOptions.length - 1]);

        expect(
            screen.queryByPlaceholderText(
                'Shown while the field is empty (optional)',
            ),
        ).not.toBeInTheDocument();
    });

    test('cancelling closes the form without saving', () => {
        renderModal();

        fireEvent.click(screen.getByLabelText('Edit Severity'));
        fireEvent.click(screen.getByText('Cancel'));

        expect(
            screen.queryByPlaceholderText('Field label'),
        ).not.toBeInTheDocument();
        expect(routerMock.patch).not.toHaveBeenCalled();
    });

    test('the save button is disabled until a label is entered', () => {
        renderModal();

        fireEvent.click(screen.getByText('New field'));

        expect(screen.getByText('Add field')).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('Field label'), {
            target: { value: 'Environment' },
        });

        expect(screen.getByText('Add field')).not.toBeDisabled();
    });

    test('deleting a field calls the destroy route', () => {
        renderModal();

        fireEvent.click(screen.getByLabelText('Delete Severity'));

        expect(routerMock.delete).toHaveBeenCalledWith(
            expect.stringContaining('fields.destroy'),
            expect.any(Object),
        );
    });

    test('without permission there is no edit, delete or create control', () => {
        renderModal({ canManageFields: false });

        expect(screen.queryByText('New field')).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('Delete Severity'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('Edit Severity'),
        ).not.toBeInTheDocument();
    });
});
