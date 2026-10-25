import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { IssueType } from '@/types/IssueTypes';
import WorkspaceSettingsIssueTypeInlineEditor from './WorkspaceSettingsIssueTypeInlineEditor';

const bugType: IssueType = {
    id: 1,
    name: 'Bug',
    icon: 'Bug',
    color: '#ef4444',
    description: 'Something is broken',
    isSystem: true,
    allowsChildren: false,
    isTopLevel: true,
    requiredFields: [],
    restrictedRoleTypes: [],
};

const renderEditor = (issueType: IssueType | null = null) => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
        <WorkspaceSettingsIssueTypeInlineEditor
            issueType={issueType}
            onSave={onSave}
            onCancel={onCancel}
        />,
    );

    return { onSave, onCancel };
};

const chip = (name: string) => screen.getByRole('button', { name });

describe('WorkspaceSettingsIssueTypeInlineEditor', () => {
    test('starts a new issue type empty and focused, with nothing to save yet', () => {
        renderEditor();

        const name = screen.getByPlaceholderText('Issue type name');
        expect(name).toHaveValue('');
        expect(name).toHaveFocus();
        expect(
            screen.getByRole('button', { name: 'Create issue type' }),
        ).toBeDisabled();
    });

    test('pre-fills the fields when editing an existing issue type', () => {
        renderEditor(bugType);

        expect(screen.getByDisplayValue('Bug')).toBeInTheDocument();
        expect(
            screen.getByDisplayValue('Something is broken'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Save issue type' }),
        ).toBeEnabled();
    });

    test('Enter saves the trimmed values with the defaults of a new type', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(
            screen.getByPlaceholderText('Issue type name'),
            '  Custom Type {Enter}',
        );

        expect(onSave).toHaveBeenCalledWith({
            name: 'Custom Type',
            icon: 'SquareCheck',
            color: '#f44336',
            description: '',
            allows_children: false,
            is_top_level: true,
            required_fields: [],
            restricted_role_types: [],
        });
    });

    test('the picker sets the color and the icon', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(
            screen.getByPlaceholderText('Issue type name'),
            'Custom',
        );
        await user.click(
            screen.getByRole('button', { name: 'Issue type icon and color' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Use color #ff5722' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Use icon Rocket' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Create issue type' }),
        );

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ color: '#ff5722', icon: 'Rocket' }),
        );
    });

    test('the description is part of the saved values', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(
            screen.getByPlaceholderText('Issue type name'),
            'Custom',
        );
        await user.type(
            screen.getByPlaceholderText('What is it used for? (optional)'),
            ' A custom description ',
        );
        await user.click(
            screen.getByRole('button', { name: 'Create issue type' }),
        );

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ description: 'A custom description' }),
        );
    });

    test('the hierarchy chips toggle the two flags', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(screen.getByPlaceholderText('Issue type name'), 'Epic');
        await user.click(chip('Allows sub-issues'));
        await user.click(chip('Can be created on its own'));
        await user.click(
            screen.getByRole('button', { name: 'Create issue type' }),
        );

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                allows_children: true,
                is_top_level: false,
            }),
        );
    });

    test('toggling required-field chips saves them in the order picked', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        await user.type(
            screen.getByPlaceholderText('Issue type name'),
            'Custom',
        );
        await user.click(chip('Description'));
        await user.click(chip('Assignee'));
        await user.click(
            screen.getByRole('button', { name: 'Create issue type' }),
        );

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                required_fields: ['description', 'assignee'],
            }),
        );
    });

    test('a chip can be switched off again', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor({
            ...bugType,
            requiredFields: ['priority', 'labels'],
        });

        expect(chip('Priority')).toHaveAttribute('aria-pressed', 'true');
        expect(chip('Description')).toHaveAttribute('aria-pressed', 'false');

        await user.click(chip('Priority'));
        await user.click(
            screen.getByRole('button', { name: 'Save issue type' }),
        );

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ required_fields: ['labels'] }),
        );
    });

    test('the role chips restrict who can create the type', async () => {
        const user = userEvent.setup();
        const { onSave } = renderEditor();

        expect(screen.getByText('Anyone who can create issues')).toBeVisible();

        await user.type(
            screen.getByPlaceholderText('Issue type name'),
            'Custom',
        );
        await user.click(chip('Owner'));
        await user.click(chip('Admin'));
        await user.click(
            screen.getByRole('button', { name: 'Create issue type' }),
        );

        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({
                restricted_role_types: ['owner', 'admin'],
            }),
        );
    });

    test('pre-selects the restrictions already set on an existing type', () => {
        renderEditor({ ...bugType, restrictedRoleTypes: ['owner'] });

        expect(chip('Owner')).toHaveAttribute('aria-pressed', 'true');
        expect(chip('Admin')).toHaveAttribute('aria-pressed', 'false');
    });

    test('Escape and the cancel button close the editor without saving', async () => {
        const user = userEvent.setup();
        const { onSave, onCancel } = renderEditor();

        await user.type(
            screen.getByPlaceholderText('Issue type name'),
            'x{Escape}',
        );
        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onCancel).toHaveBeenCalledTimes(2);
        expect(onSave).not.toHaveBeenCalled();
    });
});
