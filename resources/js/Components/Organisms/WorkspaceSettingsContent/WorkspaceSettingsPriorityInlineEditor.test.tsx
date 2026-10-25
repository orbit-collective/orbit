import { render, screen } from '@testing-library/react';
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
    test('starts a new priority empty and focused, with nothing to save yet', () => {
        renderEditor();

        const name = screen.getByPlaceholderText('Priority name');
        expect(name).toHaveValue('');
        expect(name).toHaveFocus();
        expect(
            screen.getByRole('button', { name: 'Create priority' }),
        ).toBeDisabled();
    });

    test('Enter in the name saves with the starting color and icon', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(
            screen.getByPlaceholderText('Priority name'),
            '  Blocker {Enter}',
        );

        expect(onSave).toHaveBeenCalledWith({
            name: 'Blocker',
            color: '#2196f3',
            icon: 'Flag',
            is_default: false,
        });
    });

    test('Enter does nothing while the name is blank', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(
            screen.getByPlaceholderText('Priority name'),
            '   {Enter}',
        );

        expect(onSave).not.toHaveBeenCalled();
    });

    test('the picker sets the color and the icon', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(
            screen.getByPlaceholderText('Priority name'),
            'Blocker',
        );
        await user.click(
            screen.getByRole('button', { name: 'Priority icon and color' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Use color #9c27b0' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Use icon Flame' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Create priority' }),
        );

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Blocker',
                color: '#9c27b0',
                icon: 'Flame',
            }),
        );
    });

    test('the star makes the new priority the default', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(screen.getByPlaceholderText('Priority name'), 'Normal');
        const star = screen.getByRole('button', {
            name: 'Default for new issues',
        });
        expect(star).toHaveAttribute('aria-pressed', 'false');
        await user.click(star);
        expect(star).toHaveAttribute('aria-pressed', 'true');
        await user.click(
            screen.getByRole('button', { name: 'Create priority' }),
        );

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ is_default: true }),
        );
    });

    test('edits an existing priority starting from its own values', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor({ priority: priorities[0] });

        expect(screen.getByPlaceholderText('Priority name')).toHaveValue(
            'High',
        );

        await user.click(screen.getByRole('button', { name: 'Save priority' }));

        expect(onSave).toHaveBeenCalledWith({
            name: 'High',
            color: '#f44336',
            icon: 'SignalHigh',
            is_default: false,
        });
    });

    test('the current default cannot be switched off on its own', () => {
        renderEditor({ priority: priorities[1] });

        const star = screen.getByRole('button', {
            name: 'Default for new issues',
        });
        expect(star).toHaveAttribute('aria-pressed', 'true');
        expect(star).toBeDisabled();
    });

    test('shows what the server objected to under the row', () => {
        renderEditor({
            errors: { name: 'A priority named "High" already exists.' },
        });

        expect(screen.getByRole('alert')).toHaveTextContent(
            'A priority named "High" already exists.',
        );
    });

    test('ties the rejected name to its error for assistive tech', () => {
        renderEditor({
            errors: { name: 'A priority named "High" already exists.' },
        });

        const name = screen.getByPlaceholderText('Priority name');

        expect(name).toHaveAttribute('aria-invalid', 'true');
        expect(name).toHaveAccessibleDescription(
            'A priority named "High" already exists.',
        );
    });

    test('Escape and the cancel button close the editor without saving', async () => {
        const user = userEvent.setup();
        const { onSave, onCancel } = renderEditor();

        await user.type(
            screen.getByPlaceholderText('Priority name'),
            'x{Escape}',
        );
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onCancel).toHaveBeenCalledTimes(2);
        expect(onSave).not.toHaveBeenCalled();
    });
});
