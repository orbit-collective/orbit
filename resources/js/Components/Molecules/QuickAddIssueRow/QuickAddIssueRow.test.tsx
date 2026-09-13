import { IssueType } from '@/types/IssueTypes';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, test, vi } from 'vitest';
import QuickAddIssueRow, { QuickAddIssueRowHandle } from './QuickAddIssueRow';

const issueTypes: IssueType[] = [
    {
        id: 1,
        name: 'Task',
        icon: 'SquareCheck',
        color: '#3b82f6',
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
    } as IssueType,
    { id: 2, name: 'Bug', icon: 'Bug', color: '#ef4444' } as IssueType,
];

const enabledColumns = {
    id: true,
    title: true,
    type: true,
    status: true,
    assignee: true,
    priority: true,
    labels: true,
    updated: true,
    start_date: true,
    end_date: true,
};

const renderRow = (
    props: Partial<React.ComponentProps<typeof QuickAddIssueRow>> = {},
) =>
    render(
        <table>
            <tbody>
                <QuickAddIssueRow
                    colSpan={5}
                    enabledColumns={enabledColumns}
                    issueTypes={issueTypes}
                    onSubmit={vi.fn()}
                    {...props}
                />
            </tbody>
        </table>,
    );

describe('QuickAddIssueRow', () => {
    test('renders collapsed with the default label', () => {
        renderRow();

        expect(screen.getByText('New issue')).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText('What needs to be done?'),
        ).not.toBeInTheDocument();
    });

    test('supports a custom label, e.g. for sub-issue quick-add', () => {
        renderRow({ label: 'Add sub-issue' });

        expect(screen.getByText('Add sub-issue')).toBeInTheDocument();
    });

    test('clicking reveals the input and defaults the issue type to Task', () => {
        renderRow();

        fireEvent.click(screen.getByText('New issue'));

        expect(
            screen.getByPlaceholderText('What needs to be done?'),
        ).toBeInTheDocument();
        expect(screen.getByText('Task')).toBeInTheDocument();
    });

    test('pressing Enter with a title calls onSubmit with the title and selected type, and clears the field', () => {
        const handleSubmit = vi.fn();
        renderRow({ onSubmit: handleSubmit });

        fireEvent.click(screen.getByText('New issue'));
        const input = screen.getByPlaceholderText('What needs to be done?');
        fireEvent.change(input, { target: { value: 'Fix the bug' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(handleSubmit).toHaveBeenCalledWith('Fix the bug', 1);
        expect(input).toHaveValue('');
    });

    test('changing the issue type dropdown changes what is submitted', () => {
        const handleSubmit = vi.fn();
        renderRow({ onSubmit: handleSubmit });

        fireEvent.click(screen.getByText('New issue'));
        fireEvent.click(screen.getByText('Task'));
        fireEvent.click(screen.getByText('Bug'));

        const input = screen.getByPlaceholderText('What needs to be done?');
        fireEvent.change(input, { target: { value: 'Something broke' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(handleSubmit).toHaveBeenCalledWith('Something broke', 2);
    });

    test('pressing Enter with an empty title does not submit', () => {
        const handleSubmit = vi.fn();
        renderRow({ onSubmit: handleSubmit });

        fireEvent.click(screen.getByText('New issue'));
        fireEvent.keyDown(
            screen.getByPlaceholderText('What needs to be done?'),
            { key: 'Enter' },
        );

        expect(handleSubmit).not.toHaveBeenCalled();
    });

    test('pressing Escape collapses the row back', () => {
        renderRow();

        fireEvent.click(screen.getByText('New issue'));
        fireEvent.keyDown(
            screen.getByPlaceholderText('What needs to be done?'),
            { key: 'Escape' },
        );

        expect(screen.getByText('New issue')).toBeInTheDocument();
    });

    test('the imperative open() handle reveals the input', () => {
        const ref = createRef<QuickAddIssueRowHandle>();
        render(
            <table>
                <tbody>
                    <QuickAddIssueRow
                        ref={ref}
                        colSpan={5}
                        enabledColumns={enabledColumns}
                        issueTypes={issueTypes}
                        onSubmit={vi.fn()}
                    />
                </tbody>
            </table>,
        );

        act(() => {
            ref.current?.open();
        });

        expect(
            screen.getByPlaceholderText('What needs to be done?'),
        ).toBeInTheDocument();
    });

    test('renders a placeholder dash for the type cell when no issue types exist', () => {
        renderRow({ issueTypes: [] });

        fireEvent.click(screen.getByText('New issue'));

        expect(
            screen.getByPlaceholderText('What needs to be done?'),
        ).toBeInTheDocument();
    });

    test('previews the id the issue will get and the defaults it will be created with', () => {
        renderRow({ nextIssueId: 42 });

        fireEvent.click(screen.getByText('New issue'));

        expect(screen.getByText('#42')).toBeInTheDocument();
        expect(screen.getByText('To Do')).toBeInTheDocument();
        expect(screen.getByText('Unassigned')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    test('the type stays selectable while the title is still empty', () => {
        const handleSubmit = vi.fn();
        renderRow({ onSubmit: handleSubmit });

        fireEvent.click(screen.getByText('New issue'));
        fireEvent.blur(screen.getByPlaceholderText('What needs to be done?'));
        fireEvent.click(screen.getByText('Task'));
        fireEvent.click(screen.getByText('Bug'));

        const input = screen.getByPlaceholderText('What needs to be done?');
        fireEvent.change(input, { target: { value: 'Broken' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(handleSubmit).toHaveBeenCalledWith('Broken', 2);
    });
});
