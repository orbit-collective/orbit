import { IssueType } from '@/types/IssueTypes';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsIssueTypeInlineEditor from './WorkspaceSettingsIssueTypeInlineEditor';

const bugType: IssueType = {
    id: 1,
    name: 'Bug',
    icon: 'Bug',
    color: '#ef4444',
    description: 'Something is broken',
    isSystem: true,
    allowsChildren: false,
    requiredFields: [],
    restrictedRoleTypes: [],
};

describe('WorkspaceSettingsIssueTypeInlineEditor', () => {
    test('renders empty fields for a new issue type', () => {
        render(
            <WorkspaceSettingsIssueTypeInlineEditor
                issueType={null}
                onSave={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        expect(screen.getByText('New issue type')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Issue type name')).toHaveValue('');
    });

    test('pre-fills fields when editing an existing issue type', () => {
        render(
            <WorkspaceSettingsIssueTypeInlineEditor
                issueType={bugType}
                onSave={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        expect(screen.getByText('Editing issue type')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Bug')).toBeInTheDocument();
        expect(
            screen.getByDisplayValue('Something is broken'),
        ).toBeInTheDocument();
    });

    test('the Create button is disabled until a name is entered', () => {
        render(
            <WorkspaceSettingsIssueTypeInlineEditor
                issueType={null}
                onSave={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        expect(screen.getByText('Create issue type')).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('Issue type name'), {
            target: { value: 'Custom' },
        });

        expect(screen.getByText('Create issue type')).not.toBeDisabled();
    });

    test('calls onSave with the trimmed field values', () => {
        const handleSave = vi.fn();
        render(
            <WorkspaceSettingsIssueTypeInlineEditor
                issueType={null}
                onSave={handleSave}
                onCancel={vi.fn()}
            />,
        );

        fireEvent.change(screen.getByPlaceholderText('Issue type name'), {
            target: { value: '  Custom Type  ' },
        });
        fireEvent.click(screen.getByText('Create issue type'));

        expect(handleSave).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Custom Type' }),
        );
    });

    test('toggling a required field checkbox includes it in the saved values', () => {
        const handleSave = vi.fn();
        render(
            <WorkspaceSettingsIssueTypeInlineEditor
                issueType={null}
                onSave={handleSave}
                onCancel={vi.fn()}
            />,
        );

        fireEvent.change(screen.getByPlaceholderText('Issue type name'), {
            target: { value: 'Custom' },
        });
        fireEvent.click(screen.getByLabelText('Description'));
        fireEvent.click(screen.getByLabelText('Assignee'));
        fireEvent.click(screen.getByText('Create issue type'));

        expect(handleSave).toHaveBeenCalledWith(
            expect.objectContaining({
                required_fields: ['description', 'assignee'],
            }),
        );
    });

    test('pre-checks the required fields already set on an existing issue type', () => {
        render(
            <WorkspaceSettingsIssueTypeInlineEditor
                issueType={{ ...bugType, requiredFields: ['priority'] }}
                onSave={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        expect(screen.getByLabelText('Priority')).toBeChecked();
        expect(screen.getByLabelText('Description')).not.toBeChecked();
    });

    test('toggling a role checkbox includes it in the saved values', () => {
        const handleSave = vi.fn();
        render(
            <WorkspaceSettingsIssueTypeInlineEditor
                issueType={null}
                onSave={handleSave}
                onCancel={vi.fn()}
            />,
        );

        fireEvent.change(screen.getByPlaceholderText('Issue type name'), {
            target: { value: 'Custom' },
        });
        fireEvent.click(screen.getByLabelText('Owner'));
        fireEvent.click(screen.getByLabelText('Admin'));
        fireEvent.click(screen.getByText('Create issue type'));

        expect(handleSave).toHaveBeenCalledWith(
            expect.objectContaining({
                restricted_role_types: ['owner', 'admin'],
            }),
        );
    });

    test('pre-checks the restricted role types already set on an existing issue type', () => {
        render(
            <WorkspaceSettingsIssueTypeInlineEditor
                issueType={{ ...bugType, restrictedRoleTypes: ['owner'] }}
                onSave={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        expect(screen.getByLabelText('Owner')).toBeChecked();
        expect(screen.getByLabelText('Admin')).not.toBeChecked();
    });

    test('changing the description, color and icon includes them in the saved values', () => {
        const handleSave = vi.fn();
        render(
            <WorkspaceSettingsIssueTypeInlineEditor
                issueType={null}
                onSave={handleSave}
                onCancel={vi.fn()}
            />,
        );

        fireEvent.change(screen.getByPlaceholderText('Issue type name'), {
            target: { value: 'Custom' },
        });
        fireEvent.change(
            screen.getByPlaceholderText(
                'What is this issue type used for? (optional)',
            ),
            { target: { value: 'A custom description' } },
        );
        fireEvent.click(screen.getByLabelText('Use color #ff5722'));
        fireEvent.click(screen.getByLabelText('Use icon Rocket'));
        fireEvent.click(screen.getByText('Create issue type'));

        expect(handleSave).toHaveBeenCalledWith(
            expect.objectContaining({
                description: 'A custom description',
                color: '#ff5722',
                icon: 'Rocket',
            }),
        );
    });

    test('toggling the allows-children checkbox includes it in the saved values', () => {
        const handleSave = vi.fn();
        render(
            <WorkspaceSettingsIssueTypeInlineEditor
                issueType={null}
                onSave={handleSave}
                onCancel={vi.fn()}
            />,
        );

        fireEvent.change(screen.getByPlaceholderText('Issue type name'), {
            target: { value: 'Custom' },
        });
        fireEvent.click(
            screen.getByLabelText('Allows sub-issues (like an Epic)'),
        );
        fireEvent.click(screen.getByText('Create issue type'));

        expect(handleSave).toHaveBeenCalledWith(
            expect.objectContaining({ allows_children: true }),
        );
    });

    test('calls onCancel when Cancel is clicked', () => {
        const handleCancel = vi.fn();
        render(
            <WorkspaceSettingsIssueTypeInlineEditor
                issueType={null}
                onSave={vi.fn()}
                onCancel={handleCancel}
            />,
        );

        fireEvent.click(screen.getByText('Cancel'));

        expect(handleCancel).toHaveBeenCalledTimes(1);
    });
});
