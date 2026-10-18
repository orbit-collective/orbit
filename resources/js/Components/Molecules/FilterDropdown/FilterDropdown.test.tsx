import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { ProjectPrioritiesProvider } from '@/context/ProjectPrioritiesContext';
import { priorities } from '@/stories/fixtures';
import { ProjectLabel } from '@/types/Labels';
import { AssignableUser } from '@/types/Users';
import type { StatusGroup } from '@/utils/workflow';
import FilterDropdown from './FilterDropdown';

const mockRouterGet = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    router: { get: mockRouterGet },
}));

const users: AssignableUser[] = [
    { id: 1, name: 'Ada Lovelace', avatar: null },
    { id: 2, name: 'Grace Hopper', avatar: null },
];

const testLabels: ProjectLabel[] = ['bug', 'feature'].map((name, index) => ({
    id: index + 1,
    name,
    color: '#f44336',
    description: null,
    isSystem: true,
}));

describe('FilterDropdown Component', () => {
    beforeEach(() => {
        mockRouterGet.mockClear();
    });

    test('renders the trigger button with the filter label', () => {
        render(
            <FilterDropdown
                type="status"
                isOpen={false}
                onOpenChange={vi.fn()}
            />,
        );

        expect(screen.getByText('Status')).toBeInTheDocument();
    });

    test('calls onOpenChange when the trigger is clicked', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        render(
            <FilterDropdown
                type="status"
                isOpen={false}
                onOpenChange={onOpenChange}
            />,
        );

        await user.click(screen.getByText('Status'));

        expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    test('does not render the option panel when closed', () => {
        render(
            <FilterDropdown
                type="status"
                isOpen={false}
                onOpenChange={vi.fn()}
            />,
        );

        expect(screen.queryByText('To Do')).not.toBeInTheDocument();
        expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });

    test('renders the option panel with all options when open', async () => {
        render(<FilterDropdown type="status" isOpen onOpenChange={vi.fn()} />);

        expect(await screen.findByText('To Do')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
        expect(screen.getByText('Filter by Status')).toBeInTheDocument();
    });

    test('shows the selected count as the trigger value', () => {
        renderPriority({
            queryParams: { priority: '1,2' },
            isOpen: false,
        });

        expect(screen.getByText('2')).toBeInTheDocument();
    });

    const renderPriority = (
        props: Partial<React.ComponentProps<typeof FilterDropdown>> = {},
    ) =>
        render(
            <ProjectPrioritiesProvider priorities={priorities}>
                <FilterDropdown
                    type="priority"
                    isOpen
                    onOpenChange={vi.fn()}
                    {...props}
                />
            </ProjectPrioritiesProvider>,
        );

    test('lists the project priorities under their own names', async () => {
        renderPriority();

        expect(await screen.findByText('High')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
        expect(screen.getByText('Low')).toBeInTheDocument();
    });

    test('lists a custom scale instead of the starter names', async () => {
        render(
            <ProjectPrioritiesProvider
                priorities={[
                    {
                        id: 9,
                        name: 'Blocker',
                        color: '#9c27b0',
                        icon: 'Flame',
                        position: 0,
                        isDefault: true,
                    },
                ]}
            >
                <FilterDropdown type="priority" isOpen onOpenChange={vi.fn()} />
            </ProjectPrioritiesProvider>,
        );

        expect(await screen.findByText('Blocker')).toBeInTheDocument();
        expect(screen.queryByText('High')).not.toBeInTheDocument();
    });

    test('filters by priority id, since a rename must not break the filter', async () => {
        const user = userEvent.setup();
        renderPriority({ queryParams: { priority: '1' } });

        await user.click(await screen.findByText('Low'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/',
            expect.objectContaining({ priority: '1,3' }),
            { preserveState: true, replace: true },
        );
    });

    test('selects a single-select option and applies the filter', async () => {
        const user = userEvent.setup();
        render(<FilterDropdown type="status" isOpen onOpenChange={vi.fn()} />);

        await user.click(await screen.findByText('To Do'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/',
            expect.objectContaining({ status: 'todo', page: 1 }),
            { preserveState: true, replace: true },
        );
    });

    test('re-selecting the active single-select option clears it', async () => {
        const user = userEvent.setup();
        render(
            <FilterDropdown
                type="status"
                queryParams={{ status: 'todo' }}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        await user.click(await screen.findByText('To Do'));

        const params = mockRouterGet.mock.calls[0][1];
        expect(params).not.toHaveProperty('status');
    });

    test('adds a value to a multi-select filter', async () => {
        const user = userEvent.setup();
        render(
            <ProjectLabelsProvider labels={testLabels}>
                <FilterDropdown
                    type="labels"
                    queryParams={{ labels: '1' }}
                    isOpen
                    onOpenChange={vi.fn()}
                />
            </ProjectLabelsProvider>,
        );

        await user.click(await screen.findByText('feature'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/',
            expect.objectContaining({ labels: '1,2' }),
            { preserveState: true, replace: true },
        );
    });

    test('removes a value from a multi-select filter', async () => {
        const user = userEvent.setup();
        render(
            <ProjectLabelsProvider labels={testLabels}>
                <FilterDropdown
                    type="labels"
                    queryParams={{ labels: '1,2' }}
                    isOpen
                    onOpenChange={vi.fn()}
                />
            </ProjectLabelsProvider>,
        );

        await user.click(await screen.findByText('bug'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/',
            expect.objectContaining({ labels: '2' }),
            { preserveState: true, replace: true },
        );
    });

    test('clears all selected values when Clear is clicked', async () => {
        const user = userEvent.setup();
        renderPriority({ queryParams: { priority: '1' } });

        await user.click(await screen.findByText('Clear'));

        const params = mockRouterGet.mock.calls[0][1];
        expect(params).not.toHaveProperty('priority');
    });

    test('does not render a Clear button when nothing is selected', async () => {
        renderPriority();

        await screen.findByText('Filter by Priority');
        expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });

    test('renders only the "Unassigned" option when no users are provided', async () => {
        render(
            <FilterDropdown type="assignee" isOpen onOpenChange={vi.fn()} />,
        );

        expect(await screen.findByText('Unassigned')).toBeInTheDocument();
        expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    });

    test('renders assignable users as additional assignee options', async () => {
        render(
            <FilterDropdown
                type="assignee"
                users={users}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
        expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });

    test('selecting a user assignee applies the filter with the user id', async () => {
        const user = userEvent.setup();
        render(
            <FilterDropdown
                type="assignee"
                users={users}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        await user.click(await screen.findByText('Ada Lovelace'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/',
            expect.objectContaining({ assignee: '1' }),
            { preserveState: true, replace: true },
        );
    });

    test('closes the panel when Escape is pressed', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        render(
            <FilterDropdown type="status" isOpen onOpenChange={onOpenChange} />,
        );

        await screen.findByText('Filter by Status');
        await user.keyboard('{Escape}');

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    test('closes the panel when clicking outside', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        render(
            <FilterDropdown type="status" isOpen onOpenChange={onOpenChange} />,
        );

        await screen.findByText('Filter by Status');
        await user.click(document.body);

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    test('shows the results count for the option list', async () => {
        render(<FilterDropdown type="status" isOpen onOpenChange={vi.fn()} />);

        expect(await screen.findByText('3 results')).toBeInTheDocument();
    });

    test('does not show a search input for short option lists', async () => {
        render(<FilterDropdown type="status" isOpen onOpenChange={vi.fn()} />);

        await screen.findByText('Filter by Status');
        expect(
            screen.queryByPlaceholderText('Search status…'),
        ).not.toBeInTheDocument();
    });

    test('shows a search input and filters options for long lists', async () => {
        const user = userEvent.setup();
        const manyUsers: AssignableUser[] = Array.from(
            { length: 8 },
            (_, i) => ({
                id: i + 1,
                name: `User ${i + 1}`,
                avatar: null,
            }),
        );
        render(
            <FilterDropdown
                type="assignee"
                users={manyUsers}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        const search = await screen.findByPlaceholderText('Search assignee…');
        await user.type(search, 'User 3');

        expect(screen.getByText('1 result')).toBeInTheDocument();
        expect(screen.getByText('User 3')).toBeInTheDocument();
        expect(screen.queryByText('User 4')).not.toBeInTheDocument();
    });

    test('shows an empty state when the search has no matches', async () => {
        const user = userEvent.setup();
        const manyUsers: AssignableUser[] = Array.from(
            { length: 8 },
            (_, i) => ({
                id: i + 1,
                name: `User ${i + 1}`,
                avatar: null,
            }),
        );
        render(
            <FilterDropdown
                type="assignee"
                users={manyUsers}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        const search = await screen.findByPlaceholderText('Search assignee…');
        await user.type(search, 'nobody-matches-this');

        expect(screen.getByText('No matches found')).toBeInTheDocument();
    });

    test('selects and deselects all options via the "Select all" control', async () => {
        const user = userEvent.setup();
        renderPriority();

        await user.click(await screen.findByText('Select all'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/',
            expect.objectContaining({ priority: '1,2,3' }),
            { preserveState: true, replace: true },
        );
    });

    test('does not render "Select all" for single-select filters', async () => {
        render(<FilterDropdown type="status" isOpen onOpenChange={vi.fn()} />);

        await screen.findByText('Filter by Status');
        expect(screen.queryByText('Select all')).not.toBeInTheDocument();
    });

    describe('exact status', () => {
        const statusGroups = [
            {
                name: 'In Review',
                color: '#ff9800',
                category: 'in_progress' as const,
                ids: [5, 9],
            },
            {
                name: 'Done',
                color: '#4caf50',
                category: 'done' as const,
                ids: [3],
            },
        ];

        const renderStatus = (
            queryParams: Record<string, string> = {},
            groups: StatusGroup[] = statusGroups,
        ) =>
            render(
                <FilterDropdown
                    type="status"
                    statusGroups={groups}
                    queryParams={queryParams}
                    isOpen
                    onOpenChange={vi.fn()}
                />,
            );

        test('lists the categories first and offers a switch to exact statuses', async () => {
            renderStatus();

            expect(await screen.findByText('To Do')).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: /Show exact statuses/ }),
            ).toBeInTheDocument();
        });

        test('has no switch when the project has no statuses of its own', async () => {
            renderStatus({}, []);

            await screen.findByText('To Do');
            expect(
                screen.queryByRole('button', { name: /exact statuses/ }),
            ).not.toBeInTheDocument();
        });

        test('the switch lists one option per status name and clears the category filter', async () => {
            const user = userEvent.setup();
            renderStatus({ status: 'todo' });

            await user.click(
                await screen.findByRole('button', {
                    name: /Show exact statuses/,
                }),
            );

            expect(mockRouterGet).toHaveBeenCalledWith(
                '/',
                expect.not.objectContaining({ status: expect.anything() }),
                expect.anything(),
            );
            expect(await screen.findByText('In Review')).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: /Show categories/ }),
            ).toBeInTheDocument();
        });

        test('picking a name filters by all the ids behind it', async () => {
            const user = userEvent.setup();
            renderStatus();

            await user.click(
                await screen.findByRole('button', {
                    name: /Show exact statuses/,
                }),
            );
            mockRouterGet.mockClear();
            await user.click(await screen.findByText('In Review'));

            expect(mockRouterGet).toHaveBeenCalledWith(
                '/',
                expect.objectContaining({ workflow_status: '5,9', page: 1 }),
                { preserveState: true, replace: true },
            );
        });

        test('arrow keys reach the switch button after the last option', async () => {
            const user = userEvent.setup();
            renderStatus();
            await screen.findByText('To Do');

            const visited: string[] = [];
            for (let i = 0; i < 4; i++) {
                await user.keyboard('{ArrowDown}');
                visited.push(document.activeElement?.textContent ?? '');
            }

            expect(
                visited.some((text) => /Show exact statuses/.test(text)),
            ).toBe(true);
        });

        test('arrow keys also reach the switch among many exact statuses with a search box', async () => {
            const user = userEvent.setup();
            const many = Array.from({ length: 8 }, (_, i) => ({
                name: `Status ${i}`,
                color: '#000',
                category: 'todo' as const,
                ids: [i + 1],
            }));
            renderStatus({ workflow_status: '1' }, many);
            await screen.findByText('Status 0');

            const visited: string[] = [];
            for (let i = 0; i < 12; i++) {
                await user.keyboard('{ArrowDown}');
                visited.push(document.activeElement?.textContent ?? '');
            }

            expect(visited.some((text) => /Show categories/.test(text))).toBe(
                true,
            );
        });

        test('opens straight in exact mode when the URL already holds exact statuses', async () => {
            renderStatus({ workflow_status: '5,9' });

            expect(await screen.findByText('In Review')).toBeInTheDocument();
            expect(screen.queryByText('To Do')).not.toBeInTheDocument();
        });
    });
});
