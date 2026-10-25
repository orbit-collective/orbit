import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsLabelInlineEditor from './WorkspaceSettingsLabelInlineEditor';

const label = {
    id: 4,
    name: 'bug',
    color: '#f44336',
    description: 'Something is broken',
    isSystem: true,
};

const renderEditor = (
    props: Partial<
        Parameters<typeof WorkspaceSettingsLabelInlineEditor>[0]
    > = {},
) => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
        <WorkspaceSettingsLabelInlineEditor
            label={null}
            onSave={onSave}
            onCancel={onCancel}
            {...props}
        />,
    );

    return { onSave, onCancel };
};

describe('WorkspaceSettingsLabelInlineEditor', () => {
    test('starts a new label empty and focused, with nothing to save yet', () => {
        renderEditor();

        expect(screen.getByPlaceholderText('Label name')).toHaveFocus();
        expect(
            screen.getByRole('button', { name: 'Create label' }),
        ).toBeDisabled();
    });

    test('Enter in either field saves the trimmed name and description', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(screen.getByPlaceholderText('Label name'), ' urgent ');
        await user.type(
            screen.getByPlaceholderText('Description (optional)'),
            ' Needs a look {Enter}',
        );

        expect(onSave).toHaveBeenCalledWith({
            name: 'urgent',
            color: '#f44336',
            description: 'Needs a look',
        });
    });

    test('the picker sets the color', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(screen.getByPlaceholderText('Label name'), 'ux');
        await user.click(screen.getByRole('button', { name: 'Label color' }));
        await user.click(
            screen.getByRole('button', { name: 'Use color #009688' }),
        );
        await user.click(screen.getByRole('button', { name: 'Create label' }));

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'ux', color: '#009688' }),
        );
    });

    test('edits an existing label starting from its own values', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor({ label });

        expect(screen.getByPlaceholderText('Label name')).toHaveValue('bug');
        expect(
            screen.getByPlaceholderText('Description (optional)'),
        ).toHaveValue('Something is broken');

        await user.click(screen.getByRole('button', { name: 'Save label' }));

        expect(onSave).toHaveBeenCalledWith({
            name: 'bug',
            color: '#f44336',
            description: 'Something is broken',
        });
    });

    test('does not save a blank name', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(
            screen.getByPlaceholderText('Label name'),
            '   {Enter}',
        );

        expect(onSave).not.toHaveBeenCalled();
    });

    test('Escape and the cancel button close the editor without saving', async () => {
        const user = userEvent.setup();
        const { onSave, onCancel } = renderEditor();

        await user.type(screen.getByPlaceholderText('Label name'), 'x{Escape}');
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onCancel).toHaveBeenCalledTimes(2);
        expect(onSave).not.toHaveBeenCalled();
    });
});
