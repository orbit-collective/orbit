import { AssignableUser } from '@/types/Users';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import FilterDropdown from './FilterDropdown';

const mockRouterGet = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    router: { get: mockRouterGet },
}));

const users: AssignableUser[] = [
    { id: 1, name: 'Ada Lovelace', avatar: null },
    { id: 2, name: 'Grace Hopper', avatar: null },
];

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

        expect(screen.queryByText('Open')).not.toBeInTheDocument();
        expect(screen.queryByText('Closed')).not.toBeInTheDocument();
    });

    test('renders the option panel with all options when open', async () => {
        render(<FilterDropdown type="status" isOpen onOpenChange={vi.fn()} />);

        expect(await screen.findByText('Open')).toBeInTheDocument();
        expect(screen.getByText('Closed')).toBeInTheDocument();
        expect(screen.getByText('Filter by Status')).toBeInTheDocument();
    });

    test('shows the selected count as the trigger value', () => {
        render(
            <FilterDropdown
                type="priority"
                queryParams={{ priority: 'high,medium' }}
                isOpen={false}
                onOpenChange={vi.fn()}
            />,
        );

        expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('selects a single-select option and applies the filter', async () => {
        const user = userEvent.setup();
        render(<FilterDropdown type="status" isOpen onOpenChange={vi.fn()} />);

        await user.click(await screen.findByText('Open'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/',
            expect.objectContaining({ status: 'open', page: 1 }),
            { preserveState: true, replace: true },
        );
    });

    test('re-selecting the active single-select option clears it', async () => {
        const user = userEvent.setup();
        render(
            <FilterDropdown
                type="status"
                queryParams={{ status: 'open' }}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        await user.click(await screen.findByText('Open'));

        const params = mockRouterGet.mock.calls[0][1];
        expect(params).not.toHaveProperty('status');
    });

    test('adds a value to a multi-select filter', async () => {
        const user = userEvent.setup();
        render(
            <FilterDropdown
                type="labels"
                queryParams={{ labels: 'bug' }}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        await user.click(await screen.findByText('feature'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/',
            expect.objectContaining({ labels: 'bug,feature' }),
            { preserveState: true, replace: true },
        );
    });

    test('removes a value from a multi-select filter', async () => {
        const user = userEvent.setup();
        render(
            <FilterDropdown
                type="labels"
                queryParams={{ labels: 'bug,feature' }}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        await user.click(await screen.findByText('bug'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/',
            expect.objectContaining({ labels: 'feature' }),
            { preserveState: true, replace: true },
        );
    });

    test('clears all selected values when Clear is clicked', async () => {
        const user = userEvent.setup();
        render(
            <FilterDropdown
                type="priority"
                queryParams={{ priority: 'high' }}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        await user.click(await screen.findByText('Clear'));

        const params = mockRouterGet.mock.calls[0][1];
        expect(params).not.toHaveProperty('priority');
    });

    test('does not render a Clear button when nothing is selected', async () => {
        render(
            <FilterDropdown type="priority" isOpen onOpenChange={vi.fn()} />,
        );

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
        render(
            <FilterDropdown type="priority" isOpen onOpenChange={vi.fn()} />,
        );

        await user.click(await screen.findByText('Select all'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/',
            expect.objectContaining({ priority: 'high,medium,low' }),
            { preserveState: true, replace: true },
        );
    });

    test('does not render "Select all" for single-select filters', async () => {
        render(<FilterDropdown type="status" isOpen onOpenChange={vi.fn()} />);

        await screen.findByText('Filter by Status');
        expect(screen.queryByText('Select all')).not.toBeInTheDocument();
    });
});
