import { Issue } from '@/types/Issues';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { ListRow } from './ListRow';

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: 'ISSUE-1',
    title: 'Fix the login page',
    status: 'open',
    priority: 'high',
    project_id: 1,
    user_id: 1,
    updated_at: Date.now(),
    ...overrides,
});

const renderRow = (props: Partial<React.ComponentProps<typeof ListRow>>) => {
    const defaultProps: React.ComponentProps<typeof ListRow> = {
        issue: makeIssue(),
        isClosed: false,
        onClick: () => {},
        ...props,
    };

    return render(
        <table>
            <tbody>
                <ListRow {...defaultProps} />
            </tbody>
        </table>,
    );
};

describe('ListRow Component', () => {
    test('renders the default set of columns', () => {
        renderRow({ issue: makeIssue({ id: 'ISSUE-42' }) });

        expect(screen.getByText('#ISSUE-42')).toBeInTheDocument();
        expect(screen.getByText('Fix the login page')).toBeInTheDocument();
        expect(screen.getAllByText('open').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('high').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Unassigned').length).toBeGreaterThanOrEqual(
            1,
        );
    });

    test('renders the issue type badge when the type column is enabled and issueType is present', () => {
        renderRow({
            issue: makeIssue({
                issueType: {
                    id: 1,
                    name: 'Bug',
                    icon: 'Bug',
                    color: '#ef4444',
                    description: null,
                    isSystem: true,
                    allowsChildren: false,
                    requiredFields: [],
                    restrictedRoleTypes: [],
                },
            }),
        });

        expect(screen.getByText('Bug')).toBeInTheDocument();
    });

    test('renders a workflow status badge when workflowStatus is present, instead of the legacy status icon', () => {
        renderRow({
            issue: makeIssue({
                workflowStatus: {
                    id: 5,
                    issueTypeId: 1,
                    name: 'In Review',
                    color: '#f59e0b',
                    category: 'in_progress',
                    isInitial: false,
                },
            }),
        });

        expect(screen.getByText('In Review')).toBeInTheDocument();
        expect(screen.queryByText('open')).not.toBeInTheDocument();
    });

    test('renders an expand/collapse chevron when hasChildren is true', () => {
        renderRow({ hasChildren: true, isCollapsed: false });

        expect(
            screen.getByLabelText('Collapse sub-issues'),
        ).toBeInTheDocument();
    });

    test('shows the collapsed chevron variant and calls onToggleCollapse when clicked', () => {
        const handleToggle = vi.fn();
        renderRow({
            hasChildren: true,
            isCollapsed: true,
            onToggleCollapse: handleToggle,
        });

        fireEvent.click(screen.getByLabelText('Expand sub-issues'));

        expect(handleToggle).toHaveBeenCalledTimes(1);
    });

    test('does not render a chevron for a leaf row', () => {
        renderRow({ hasChildren: false });

        expect(
            screen.queryByLabelText('Expand sub-issues'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('Collapse sub-issues'),
        ).not.toBeInTheDocument();
    });

    test('does not render start_date/end_date columns by default', () => {
        renderRow({
            issue: makeIssue({
                start_date: '2026-01-01',
                end_date: '2026-02-01',
            }),
        });

        expect(screen.queryByText('2026-01-01')).not.toBeInTheDocument();
        expect(screen.queryByText('2026-02-01')).not.toBeInTheDocument();
    });

    test('respects a custom enabledColumns configuration', () => {
        const { container } = renderRow({
            issue: makeIssue({ start_date: '2026-01-01' }),
            enabledColumns: {
                id: false,
                title: true,
                status: false,
                assignee: false,
                priority: false,
                labels: false,
                updated: false,
                start_date: true,
                end_date: false,
            },
        });

        expect(
            container.querySelector('[data-column="id"]'),
        ).not.toBeInTheDocument();
        expect(
            container.querySelector('[data-column="status"]'),
        ).not.toBeInTheDocument();
        expect(screen.getByText('2026-01-01')).toBeInTheDocument();
    });

    test('shows the assignee name via UserBadge', () => {
        renderRow({
            issue: makeIssue({
                assignee: {
                    id: 1,
                    name: 'Jane Doe',
                    email: 'jane@acme.com',
                    avatar: '',
                    created_at: '',
                    updated_at: '',
                },
            }),
        });

        expect(screen.getAllByText('Jane Doe').length).toBeGreaterThanOrEqual(
            1,
        );
    });

    test('renders labels via LabelList', () => {
        renderRow({ issue: makeIssue({ labels: ['bug', 'design'] }) });

        expect(screen.getAllByText('bug').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('design').length).toBeGreaterThanOrEqual(1);
    });

    test('reflects the isChecked state on the row checkbox', () => {
        renderRow({ issue: makeIssue({ isChecked: true }) });

        const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
    });

    test('calls onClick when the row itself is clicked', async () => {
        const handleClick = vi.fn();
        renderRow({ onClick: handleClick });

        await userEvent.click(screen.getByText('Fix the login page'));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('does not trigger row onClick when the checkbox is clicked, but calls handleSelectIssueCheckbox', async () => {
        const handleClick = vi.fn();
        const handleSelect = vi.fn();
        const issue = makeIssue();
        renderRow({
            issue,
            onClick: handleClick,
            handleSelectIssueCheckbox: handleSelect,
        });

        await userEvent.click(screen.getByRole('checkbox'));

        expect(handleClick).not.toHaveBeenCalled();
        expect(handleSelect).toHaveBeenCalledWith(issue);
    });

    test('pressing Enter on the row calls onClick', () => {
        const handleClick = vi.fn();
        renderRow({ onClick: handleClick });

        const row = screen
            .getByText('Fix the login page')
            .closest('tr') as HTMLElement;
        fireEvent.keyDown(row, { key: 'Enter' });

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('pressing Space on the row prevents the page from scrolling and does not call onClick', () => {
        const handleClick = vi.fn();
        renderRow({ onClick: handleClick });

        const row = screen
            .getByText('Fix the login page')
            .closest('tr') as HTMLElement;
        const event = new KeyboardEvent('keydown', {
            key: ' ',
            bubbles: true,
            cancelable: true,
        });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
        row.dispatchEvent(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(handleClick).not.toHaveBeenCalled();
    });

    test('applies a line-through title and dimmed checkbox when the issue is closed', () => {
        renderRow({ isClosed: true });

        const title = screen.getByText('Fix the login page');
        expect(title).toHaveClass('line-through');

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toHaveClass('opacity-20');
    });

    describe('context menu', () => {
        test('right-clicking the row opens the actions menu', () => {
            renderRow({});

            const row = screen
                .getByText('Fix the login page')
                .closest('tr') as HTMLElement;
            fireEvent.contextMenu(row);

            expect(screen.getByText('Open issue')).toBeInTheDocument();
            expect(screen.getByText('Remove')).toBeInTheDocument();
        });

        test('clicking the ellipsis button toggles the actions menu', async () => {
            renderRow({});

            expect(screen.queryByText('Open issue')).not.toBeInTheDocument();

            const ellipsisButton = document.querySelector(
                '[data-column="actions"] button',
            ) as HTMLElement;
            await userEvent.click(ellipsisButton);

            expect(screen.getByText('Open issue')).toBeInTheDocument();

            await userEvent.click(ellipsisButton);

            expect(screen.queryByText('Open issue')).not.toBeInTheDocument();
        });

        test('clicking "Open issue" calls onClick and closes the menu', async () => {
            const handleClick = vi.fn();
            renderRow({ onClick: handleClick });

            const row = screen
                .getByText('Fix the login page')
                .closest('tr') as HTMLElement;
            fireEvent.contextMenu(row);

            await userEvent.click(screen.getByText('Open issue'));

            expect(handleClick).toHaveBeenCalledTimes(1);
            expect(screen.queryByText('Open issue')).not.toBeInTheDocument();
        });

        test('clicking "Remove" calls onRemove and closes the menu', async () => {
            const handleRemove = vi.fn();
            renderRow({ onRemove: handleRemove });

            const row = screen
                .getByText('Fix the login page')
                .closest('tr') as HTMLElement;
            fireEvent.contextMenu(row);

            expect(
                screen.getByText('Remove').closest('button'),
            ).not.toBeDisabled();

            await userEvent.click(screen.getByText('Remove'));

            expect(handleRemove).toHaveBeenCalledTimes(1);
            expect(screen.queryByText('Remove')).not.toBeInTheDocument();
        });

        test('the "Remove" action is disabled', () => {
            renderRow({});

            const row = screen
                .getByText('Fix the login page')
                .closest('tr') as HTMLElement;
            fireEvent.contextMenu(row);

            expect(screen.getByText('Remove').closest('button')).toBeDisabled();
        });

        test('closes the menu when clicking outside of it', () => {
            renderRow({});

            const row = screen
                .getByText('Fix the login page')
                .closest('tr') as HTMLElement;
            fireEvent.contextMenu(row);
            expect(screen.getByText('Open issue')).toBeInTheDocument();

            fireEvent.mouseDown(document.body);

            expect(screen.queryByText('Open issue')).not.toBeInTheDocument();
        });
    });
});
