import { act, fireEvent, render, screen } from '@testing-library/react';
import { ComponentProps, createRef } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { ProjectPrioritiesProvider } from '@/context/ProjectPrioritiesContext';
import { priorities } from '@/stories/fixtures';
import { IssueType } from '@/types/IssueTypes';
import { ProjectPriority } from '@/types/Priorities';
import { WorkflowStatus } from '@/types/Workflow';
import QuickAddIssueRow, {
    fallbackStatus,
    QuickAddIssueRowHandle,
} from './QuickAddIssueRow';

// Stands in for the real calendar: picks a fixed day per mount, the start
// calendar picks 3 Nov 2026 and the end calendar (which gets a minDate) 10 Nov.
vi.mock('@/Components/Molecules/Calendar/Calendar', () => ({
    default: ({
        onSelect,
        minDate,
    }: {
        onSelect: (date: Date) => void;
        minDate?: Date;
    }) => (
        <button
            type="button"
            onClick={() =>
                onSelect(new Date(2026, minDate ? 10 : 10, minDate ? 10 : 3))
            }
        >
            pick day
        </button>
    ),
}));

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
    props: Partial<ComponentProps<typeof QuickAddIssueRow>> = {},
    projectPriorities: ProjectPriority[] = [],
) =>
    render(
        <ProjectPrioritiesProvider priorities={projectPriorities}>
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
            </table>
        </ProjectPrioritiesProvider>,
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

        expect(handleSubmit).toHaveBeenCalledWith('Fix the bug', 1, {});
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

        expect(handleSubmit).toHaveBeenCalledWith('Something broke', 2, {});
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
        renderRow({ nextIssueId: 42 }, priorities);

        fireEvent.click(screen.getByText('New issue'));

        expect(screen.getByText('#42')).toBeInTheDocument();
        expect(screen.getByText('To Do')).toBeInTheDocument();
        expect(screen.getByText('Unassigned')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    test('previews whichever priority the project made its default', () => {
        renderRow({}, [
            { ...priorities[0], name: 'Urgent', isDefault: true },
            { ...priorities[1], isDefault: false },
        ]);

        fireEvent.click(screen.getByText('New issue'));

        expect(screen.getByText('Urgent')).toBeInTheDocument();
        expect(screen.queryByText('Medium')).not.toBeInTheDocument();
    });

    test('previews no priority when the project has none', () => {
        renderRow({ nextIssueId: 42 });

        fireEvent.click(screen.getByText('New issue'));

        expect(screen.getByLabelText('Priority')).toHaveTextContent('None');
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

        expect(handleSubmit).toHaveBeenCalledWith('Broken', 2, {});
    });

    test('indents the title through its cell so the field is never wider than it', () => {
        renderRow({ indent: 2 });
        fireEvent.click(screen.getByText('New issue'));

        const input = screen.getByPlaceholderText('What needs to be done?');

        expect(input.style.marginLeft).toBe('');
        expect(input.closest('td')?.style.paddingLeft).toBe('56px');
    });

    test('shows the selected type as the same badge the list uses, with a chevron', () => {
        renderRow();
        fireEvent.click(screen.getByText('New issue'));

        const trigger = screen.getByRole('button', { name: 'Issue type' });

        expect(trigger).toHaveTextContent('Task');
        expect(trigger.querySelector('.rounded-full')).not.toBeNull();
        expect(trigger.querySelectorAll('svg').length).toBeGreaterThan(1);
    });
});

const status = (
    id: number,
    category: WorkflowStatus['category'],
    isInitial = false,
): WorkflowStatus => ({
    id,
    issueTypeId: 1,
    name: `S${id}`,
    color: '#000',
    category,
    isInitial,
});

describe('fallbackStatus', () => {
    const type = {
        statuses: [
            status(20, 'todo', true),
            status(21, 'in_progress'),
            status(22, 'in_progress'),
            status(23, 'done'),
        ],
    } as IssueType;

    test('keeps a status the new type also has', () => {
        expect(fallbackStatus(status(22, 'in_progress'), type)?.id).toBe(22);
    });

    test('falls back to the same category of the new type', () => {
        expect(fallbackStatus(status(99, 'in_progress'), type)?.id).toBe(21);
        expect(fallbackStatus(status(99, 'done'), type)?.id).toBe(23);
    });

    test('drops the choice when the new type has no such category or no statuses', () => {
        const todoOnly = { statuses: [status(30, 'todo', true)] } as IssueType;

        expect(fallbackStatus(status(99, 'done'), todoOnly)).toBeNull();
        expect(fallbackStatus(status(99, 'done'), {} as IssueType)).toBeNull();
        expect(fallbackStatus(null, type)).toBeNull();
    });
});

describe('QuickAddIssueRow properties', () => {
    test('submits the dates and assignee that were picked', () => {
        const handleSubmit = vi.fn();
        renderRow({
            onSubmit: handleSubmit,
            users: [{ id: 5, name: 'Ada' }],
        });

        fireEvent.click(screen.getByText('New issue'));
        fireEvent.click(screen.getByLabelText('Start date'));
        fireEvent.click(screen.getByText('pick day'));
        fireEvent.click(screen.getByLabelText('End date'));
        fireEvent.click(screen.getByText('pick day'));
        fireEvent.click(screen.getByLabelText('Assignee'));
        fireEvent.click(screen.getByText('Ada'));

        const input = screen.getByPlaceholderText('What needs to be done?');
        fireEvent.change(input, { target: { value: 'Plan' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(handleSubmit).toHaveBeenCalledWith('Plan', 1, {
            assignee_id: 5,
            start_date: '2026-11-03',
            end_date: '2026-11-10',
        });
    });

    test('a chosen status is dropped when the new type has none to match', () => {
        const handleSubmit = vi.fn();
        const types = [
            {
                ...issueTypes[0],
                statuses: [status(10, 'todo', true), status(11, 'done')],
            } as IssueType,
            {
                id: 2,
                name: 'Bug',
                icon: 'Bug',
                color: '#ef4444',
                statuses: [{ ...status(40, 'todo', true), issueTypeId: 2 }],
            } as IssueType,
        ];
        renderRow({ onSubmit: handleSubmit, issueTypes: types });

        fireEvent.click(screen.getByText('New issue'));
        fireEvent.click(screen.getByLabelText('Status'));
        fireEvent.click(screen.getByText('S11'));
        fireEvent.click(screen.getByText('Task'));
        fireEvent.click(screen.getByText('Bug'));

        const input = screen.getByPlaceholderText('What needs to be done?');
        fireEvent.change(input, { target: { value: 'Oops' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(handleSubmit).toHaveBeenCalledWith('Oops', 2, {});
    });
});
