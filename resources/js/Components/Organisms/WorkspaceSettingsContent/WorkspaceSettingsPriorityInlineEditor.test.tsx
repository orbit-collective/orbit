import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { priorities } from '@/stories/fixtures';
import WorkspaceSettingsPriorityInlineEditor from './WorkspaceSettingsPriorityInlineEditor';

const renderEditor = (
    props: Partial<
        Parameters<typeof WorkspaceSettingsPriorityInlineEditor>[0]
    > = {},
) => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
        <WorkspaceSettingsPriorityInlineEditor
            priority={null}
            onSave={onSave}
            onCancel={onCancel}
            {...props}
        />,
    );

    return { onSave, onCancel };
};

describe('WorkspaceSettingsPriorityInlineEditor', () => {
    test('starts a new priority empty, with the first color and icon', () => {
        renderEditor();

        expect(screen.getByText('New priority')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Priority name')).toHaveValue('');
        expect(
            screen.getByRole('button', { name: 'Create priority' }),
        ).toBeDisabled();
    });

    test('saves the typed name with the chosen color, icon and default flag', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(
            screen.getByPlaceholderText('Priority name'),
            '  Blocker ',
        );
        await user.click(
            screen.getByRole('button', { name: 'Use color #9c27b0' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Use icon Flame' }),
        );
        await user.click(screen.getByLabelText('Default for new issues'));
        await user.click(
            screen.getByRole('button', { name: 'Create priority' }),
        );

        expect(onSave).toHaveBeenCalledWith({
            name: 'Blocker',
            color: '#9c27b0',
            icon: 'Flame',
            is_default: true,
        });
    });

    test('accepts a custom color from the color picker', () => {
        const { onSave } = renderEditor();

        fireEvent.change(screen.getByPlaceholderText('Priority name'), {
            target: { value: 'Teal' },
        });
        fireEvent.change(screen.getByLabelText('Pick a custom color'), {
            target: { value: '#00aa99' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Create priority' }),
        );

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ color: '#00aa99' }),
        );
    });

    test('does not save a blank name', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(screen.getByPlaceholderText('Priority name'), '   ');

        expect(
            screen.getByRole('button', { name: 'Create priority' }),
        ).toBeDisabled();
        expect(onSave).not.toHaveBeenCalled();
    });

    test('edits an existing priority starting from its own values', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor({ priority: priorities[0] });

        expect(screen.getByText('Editing priority')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Priority name')).toHaveValue(
            'High',
        );

        await user.click(screen.getByRole('button', { name: 'Save changes' }));

        expect(onSave).toHaveBeenCalledWith({
            name: 'High',
            color: '#f44336',
            icon: 'SignalHigh',
            is_default: false,
        });
    });

    test('the current default cannot be switched off on its own', () => {
        renderEditor({ priority: priorities[1] });

        expect(screen.getByLabelText('Default for new issues')).toBeChecked();
        expect(screen.getByLabelText('Default for new issues')).toBeDisabled();
    });

    test('shows what the server objected to under the name', () => {
        renderEditor({
            errors: { name: 'A priority named "High" already exists.' },
        });

        expect(screen.getByRole('alert')).toHaveTextContent(
            'A priority named "High" already exists.',
        );
    });

    test('previews the priority as it will look', () => {
        renderEditor({ priority: priorities[0] });

        expect(screen.getAllByText('High').length).toBeGreaterThan(0);
    });

    test('cancel closes the editor without saving', async () => {
        const user = userEvent.setup();
        const { onSave, onCancel } = renderEditor();

        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onCancel).toHaveBeenCalled();
        expect(onSave).not.toHaveBeenCalled();
    });
});
