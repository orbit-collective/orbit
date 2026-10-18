import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ProjectPrioritiesProvider } from '@/context/ProjectPrioritiesContext';
import { priorities, priorityFields } from '@/stories/fixtures';
import { todoStatus, inProgressStatus, doneStatus } from '@/tests/statuses';
import { Issue } from '@/types/Issues';
import { ProjectPriority } from '@/types/Priorities';
import IssueBoard from './IssueBoard';

const mockAddAlert = vi.hoisted(() => vi.fn());
vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({
        addAlert: mockAddAlert,
        removeAlert: vi.fn(),
        alerts: [],
    }),
}));

const mockRouterPatch = vi.hoisted(() => vi.fn());
const mockRouterVisit = vi.hoisted(() => vi.fn());
vi.mock('@inertiajs/react', () => ({
    router: { patch: mockRouterPatch, visit: mockRouterVisit },
}));

const mockRoute = vi.hoisted(() =>
    vi.fn((name: string, id?: string | number) => `/${name}/${id ?? ''}`),
);

// Real pointer-drag simulation is unreliable in jsdom (no real layout/geometry
// for dnd-kit's collision detection), so we mock @dnd-kit/core just enough to
// capture the onDragEnd handler IssueBoard registers and invoke it directly —
// that's where all the actual "which field gets patched" logic lives.
const capturedHandlers = vi.hoisted<{
    onDragEnd?: (event: unknown) => void;
}>(() => ({}));

vi.mock('@dnd-kit/core', async () => {
    const actual =
        await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
    return {
        ...actual,
        DndContext: ({
            children,
            onDragEnd,
        }: {
            children: ReactNode;
            onDragEnd?: (event: unknown) => void;
        }) => {
            capturedHandlers.onDragEnd = onDragEnd;
            return children;
        },
        useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
    };
});

beforeEach(() => {
    vi.stubGlobal('route', mockRoute);
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

let counter = 0;
const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: `ISSUE-${counter++}`,
    title: 'Some issue',
    workflowStatus: todoStatus,
    ...priorityFields('high'),
    project_id: 1,
    user_id: 1,
    ...overrides,
    // Naming just `priority` is enough: its id and details follow.
    ...(overrides.priority !== undefined &&
    overrides.priorityDetails === undefined
        ? priorityFields(overrides.priority)
        : {}),
});

const renderBoard = (issues: Issue[], scale: ProjectPriority[] = priorities) =>
    render(
        <ProjectPrioritiesProvider priorities={scale}>
            <IssueBoard issues={issues} />
        </ProjectPrioritiesProvider>,
    );

/** The column titles in board order (issue titles are headings too, so they are left out). */
const columnHeadings = () =>
    screen
        .getAllByRole('heading')
        .map((heading) => heading.textContent ?? '')
        .filter((text) => !text.includes('issue') && !text.includes(' one'));

/** The column a heading belongs to. */
const columnOf = (name: string) =>
    screen.getByRole('heading', { name }).closest('div')?.parentElement
        ?.parentElement?.parentElement?.parentElement as HTMLElement;

describe('IssueBoard Component', () => {
    test('renders a column for each priority of the project, then one for no priority', () => {
        renderBoard([]);

        expect(
            screen.getByRole('heading', { name: 'High' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Medium' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Low' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'No priority' }),
        ).toBeInTheDocument();
    });

    test("renders the project's own scale in its own order", () => {
        renderBoard(
            [],
            [
                {
                    id: 9,
                    name: 'Blocker',
                    color: '#9c27b0',
                    icon: 'Flame',
                    position: 0,
                    isDefault: false,
                },
                {
                    id: 8,
                    name: 'Whenever',
                    color: '#4caf50',
                    icon: 'Leaf',
                    position: 1,
                    isDefault: true,
                },
            ],
        );

        expect(columnHeadings()).toEqual([
            'Blocker',
            'Whenever',
            'No priority',
        ]);
        expect(screen.queryByRole('heading', { name: 'High' })).toBeNull();
    });

    test('groups each issue into the column matching its priority', () => {
        renderBoard([
            makeIssue({ title: 'A high one', priority: 'high' }),
            makeIssue({ title: 'A medium one', priority: 'medium' }),
            makeIssue({ title: 'A low one', priority: 'low' }),
        ]);

        expect(
            within(columnOf('High')).getByText('A high one'),
        ).toBeInTheDocument();
        expect(
            within(columnOf('Medium')).getByText('A medium one'),
        ).toBeInTheDocument();
        expect(
            within(columnOf('Low')).getByText('A low one'),
        ).toBeInTheDocument();
    });

    test('an issue without a priority lands in the No priority column', () => {
        renderBoard([
            makeIssue({
                title: 'Unprioritised',
                priority: null,
                priority_id: null,
                priorityDetails: null,
            }),
        ]);

        expect(
            within(columnOf('No priority')).getByText('Unprioritised'),
        ).toBeInTheDocument();
    });

    test('shows an empty state in columns that have no issues', () => {
        renderBoard([makeIssue({ title: 'Only high', priority: 'high' })]);

        // High has an issue; Medium, Low and No priority are empty.
        expect(screen.getAllByText('No issues')).toHaveLength(3);
    });

    test('without a provider the columns come from the priorities the issues carry', () => {
        render(
            <IssueBoard
                issues={[
                    makeIssue({ title: 'A low one', priority: 'low' }),
                    makeIssue({ title: 'A high one', priority: 'high' }),
                ]}
            />,
        );

        expect(columnHeadings()).toEqual(['High', 'Low', 'No priority']);
    });

    test('the count badge reflects only non-closed issues in that priority', () => {
        renderBoard([
            makeIssue({ priority: 'high', workflowStatus: todoStatus }),
            makeIssue({ priority: 'high', workflowStatus: todoStatus }),
            makeIssue({ priority: 'high', workflowStatus: doneStatus }),
        ]);

        // 2 open of 3 total in the High column => badge shows "2".
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('defaults to grouping by priority', () => {
        render(<IssueBoard issues={[]} />);

        expect(screen.getByRole('button', { name: 'Priority' })).toHaveClass(
            'bg-[var(--bg-light-color-hover)]',
        );
    });

    test('switching to Status regroups issues into To Do/In Progress/Done columns', async () => {
        const user = userEvent.setup();
        const issues = [
            makeIssue({ title: 'Not started', workflowStatus: todoStatus }),
            makeIssue({ title: 'Underway', workflowStatus: inProgressStatus }),
            makeIssue({ title: 'Finished', workflowStatus: doneStatus }),
        ];
        render(<IssueBoard issues={issues} />);

        await user.click(screen.getByRole('button', { name: 'Status' }));

        expect(
            screen.getByRole('heading', { name: 'To Do' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'In Progress' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Done' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Not started')).toBeInTheDocument();
        expect(screen.getByText('Underway')).toBeInTheDocument();
        expect(screen.getByText('Finished')).toBeInTheDocument();
        // Priority-only columns are gone once grouped by status.
        expect(
            screen.queryByRole('heading', { name: 'High' }),
        ).not.toBeInTheDocument();
    });

    test('persists the chosen grouping mode to localStorage and restores it', async () => {
        const user = userEvent.setup();
        const { unmount } = render(<IssueBoard issues={[]} />);

        await user.click(screen.getByRole('button', { name: 'Status' }));
        expect(localStorage.getItem('boardGroupBy')).toBe('status');
        unmount();

        render(<IssueBoard issues={[]} />);

        expect(
            screen.getByRole('heading', { name: 'To Do' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'High' }),
        ).not.toBeInTheDocument();
    });

    test('dragging a card to a new priority column patches the priority by name', () => {
        const issue = makeIssue({ priority: 'low' });
        renderBoard([issue]);

        act(() => {
            capturedHandlers.onDragEnd?.({
                active: { id: issue.id },
                over: { id: 'priority-1' },
            });
        });

        expect(mockRoute).toHaveBeenCalledWith('issues.update', issue.id);
        expect(mockRouterPatch).toHaveBeenCalledWith(
            expect.any(String),
            { priority: 'High' },
            expect.objectContaining({ preserveScroll: true }),
        );
        // The card moves at once, before the server answers.
        expect(
            within(columnOf('High')).getByText('Some issue'),
        ).toBeInTheDocument();
    });

    test('dragging a card to the No priority column clears its priority', () => {
        const issue = makeIssue({ priority: 'low' });
        renderBoard([issue]);

        act(() => {
            capturedHandlers.onDragEnd?.({
                active: { id: issue.id },
                over: { id: 'priority-none' },
            });
        });

        expect(mockRouterPatch).toHaveBeenCalledWith(
            expect.any(String),
            { priority: null },
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(
            within(columnOf('No priority')).getByText('Some issue'),
        ).toBeInTheDocument();
    });

    test('dropping a card back on its own column patches nothing', () => {
        const issue = makeIssue({ priority: 'low' });
        renderBoard([issue]);

        capturedHandlers.onDragEnd?.({
            active: { id: issue.id },
            over: { id: 'priority-3' },
        });

        expect(mockRouterPatch).not.toHaveBeenCalled();
    });

    test('dropping a card on a column that is not one of the priorities patches nothing', () => {
        const issue = makeIssue({ priority: 'low' });
        renderBoard([issue]);

        capturedHandlers.onDragEnd?.({
            active: { id: issue.id },
            over: { id: 'priority-404' },
        });

        expect(mockRouterPatch).not.toHaveBeenCalled();
    });

    test("dragging a card to a status column patches the type's status of that category", async () => {
        const user = userEvent.setup();
        const issue = makeIssue({
            workflowStatus: todoStatus,
            issueType: {
                statuses: [todoStatus, inProgressStatus, doneStatus],
                transitions: [
                    {
                        id: 1,
                        issueTypeId: 1,
                        fromStatusId: todoStatus.id,
                        toStatusId: inProgressStatus.id,
                    },
                ],
            } as Issue['issueType'],
        });
        renderBoard([issue]);

        await user.click(screen.getByRole('button', { name: 'Status' }));

        capturedHandlers.onDragEnd?.({
            active: { id: issue.id },
            over: { id: 'in_progress' },
        });

        expect(mockRouterPatch).toHaveBeenCalledWith(
            expect.any(String),
            { workflow_status_id: inProgressStatus.id },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('dragging to a status column the workflow does not reach alerts instead of patching', async () => {
        const user = userEvent.setup();
        const issue = makeIssue({
            workflowStatus: todoStatus,
            issueType: {
                statuses: [todoStatus, inProgressStatus, doneStatus],
                transitions: [],
            } as unknown as Issue['issueType'],
        });
        renderBoard([issue]);

        await user.click(screen.getByRole('button', { name: 'Status' }));

        capturedHandlers.onDragEnd?.({
            active: { id: issue.id },
            over: { id: 'done' },
        });

        expect(mockRouterPatch).not.toHaveBeenCalled();
        expect(mockAddAlert).toHaveBeenCalledWith(
            'This issue type has no reachable done status',
            'error',
        );
    });

    test('reverts the optimistic update and alerts on a failed drag patch', () => {
        mockRouterPatch.mockImplementation(
            (_url, _data, opts?: { onError?: () => void }) => {
                opts?.onError?.();
            },
        );
        const issue = makeIssue({ priority: 'low', title: 'Flaky issue' });
        renderBoard([issue]);

        capturedHandlers.onDragEnd?.({
            active: { id: issue.id },
            over: { id: 'priority-1' },
        });

        expect(mockAddAlert).toHaveBeenCalledWith(
            'Failed to update issue priority',
            'error',
        );
        // Reverted back to its original "Low" column.
        expect(
            within(columnOf('Low')).getByText('Flaky issue'),
        ).toBeInTheDocument();
    });
});
