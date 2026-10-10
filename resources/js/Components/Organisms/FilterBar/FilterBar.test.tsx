import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import FilterBar from './FilterBar';

const mockRouterGet = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    router: { get: mockRouterGet },
}));

vi.mock('@/Components/Molecules/FilterDropdown/FilterDropdown', () => ({
    default: ({
        type,
        isOpen,
        onOpenChange,
    }: {
        type: string;
        isOpen: boolean;
        onOpenChange: (isOpen: boolean) => void;
    }) => (
        <button
            data-testid={`filter-dropdown-${type}`}
            data-open={isOpen}
            onClick={() => onOpenChange(!isOpen)}
        >
            {type} filter
        </button>
    ),
}));

vi.mock(
    '@/Components/Molecules/SavedFiltersDropdown/SavedFiltersDropdown',
    () => ({
        default: ({
            isOpen,
            onOpenChange,
        }: {
            isOpen: boolean;
            onOpenChange: (isOpen: boolean) => void;
        }) => (
            <button
                data-testid="saved-filters-dropdown"
                data-open={isOpen}
                onClick={() => onOpenChange(!isOpen)}
            >
                saved filters
            </button>
        ),
    }),
);

const makeProject = (overrides: Partial<Project> = {}): Project => ({
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: '',
    color: 'purple',
    created_at: 0,
    updated_at: 0,
    ...overrides,
});

const makeUsers = (): AssignableUser[] => [
    { id: 1, name: 'Jane Doe', avatar: null },
];

describe('FilterBar Component', () => {
    beforeEach(() => {
        mockRouterGet.mockClear();
    });

    test('renders the search input and all filter dropdowns', () => {
        render(<FilterBar savedFilters={[]} />);

        expect(
            screen.getByPlaceholderText('Search issue title, ID, labels...'),
        ).toBeInTheDocument();
        expect(
            screen.getByTestId('saved-filters-dropdown'),
        ).toBeInTheDocument();
        expect(
            screen.getByTestId('filter-dropdown-labels'),
        ).toBeInTheDocument();
        expect(
            screen.getByTestId('filter-dropdown-status'),
        ).toBeInTheDocument();
        expect(
            screen.getByTestId('filter-dropdown-assignee'),
        ).toBeInTheDocument();
        expect(
            screen.getByTestId('filter-dropdown-priority'),
        ).toBeInTheDocument();
    });

    test('initializes the search input from queryParams.search', () => {
        render(
            <FilterBar
                savedFilters={[]}
                queryParams={{ search: 'login bug' }}
            />,
        );

        expect(
            screen.getByPlaceholderText('Search issue title, ID, labels...'),
        ).toHaveValue('login bug');
    });

    test('updates the search input value and calls router.get on change', async () => {
        render(
            <FilterBar savedFilters={[]} queryParams={{ status: 'open' }} />,
        );

        const input = screen.getByPlaceholderText(
            'Search issue title, ID, labels...',
        );
        await userEvent.type(input, 'x');

        expect(input).toHaveValue('x');
        expect(mockRouterGet).toHaveBeenCalledWith(
            window.location.pathname,
            { status: 'open', search: 'x', page: 1 },
            { preserveState: true, replace: true },
        );
    });

    test('re-syncs the search input whenever queryParams.search changes externally', () => {
        const { rerender } = render(
            <FilterBar savedFilters={[]} queryParams={{ search: 'first' }} />,
        );

        expect(
            screen.getByPlaceholderText('Search issue title, ID, labels...'),
        ).toHaveValue('first');

        rerender(
            <FilterBar savedFilters={[]} queryParams={{ search: 'second' }} />,
        );

        expect(
            screen.getByPlaceholderText('Search issue title, ID, labels...'),
        ).toHaveValue('second');
    });

    test('passes the project id and query params through to SavedFiltersDropdown', () => {
        render(
            <FilterBar
                savedFilters={[]}
                project={makeProject({ id: 7 })}
                queryParams={{ status: 'open' }}
            />,
        );

        expect(
            screen.getByTestId('saved-filters-dropdown'),
        ).toBeInTheDocument();
    });

    test('passes users through to the assignee filter dropdown', () => {
        render(<FilterBar savedFilters={[]} users={makeUsers()} />);

        expect(
            screen.getByTestId('filter-dropdown-assignee'),
        ).toBeInTheDocument();
    });

    test('tracks which single filter panel is open, closing the previous one', async () => {
        const user = userEvent.setup();
        render(<FilterBar savedFilters={[]} />);

        const labelsButton = screen.getByTestId('filter-dropdown-labels');
        const statusButton = screen.getByTestId('filter-dropdown-status');

        expect(labelsButton).toHaveAttribute('data-open', 'false');
        expect(statusButton).toHaveAttribute('data-open', 'false');

        await user.click(labelsButton);
        expect(labelsButton).toHaveAttribute('data-open', 'true');
        expect(statusButton).toHaveAttribute('data-open', 'false');

        await user.click(statusButton);
        expect(labelsButton).toHaveAttribute('data-open', 'false');
        expect(statusButton).toHaveAttribute('data-open', 'true');
    });

    test('opens the assignee and priority filter panels, closing the others', async () => {
        const user = userEvent.setup();
        render(<FilterBar savedFilters={[]} />);

        const assigneeButton = screen.getByTestId('filter-dropdown-assignee');
        const priorityButton = screen.getByTestId('filter-dropdown-priority');
        const labelsButton = screen.getByTestId('filter-dropdown-labels');

        await user.click(assigneeButton);
        expect(assigneeButton).toHaveAttribute('data-open', 'true');
        expect(priorityButton).toHaveAttribute('data-open', 'false');

        await user.click(priorityButton);
        expect(assigneeButton).toHaveAttribute('data-open', 'false');
        expect(priorityButton).toHaveAttribute('data-open', 'true');
        expect(labelsButton).toHaveAttribute('data-open', 'false');
    });

    test('opens the saved filters panel independently of the other filter dropdowns', async () => {
        const user = userEvent.setup();
        render(<FilterBar savedFilters={[]} />);

        const savedButton = screen.getByTestId('saved-filters-dropdown');
        const labelsButton = screen.getByTestId('filter-dropdown-labels');

        await user.click(savedButton);

        expect(savedButton).toHaveAttribute('data-open', 'true');
        expect(labelsButton).toHaveAttribute('data-open', 'false');

        await user.click(labelsButton);

        expect(savedButton).toHaveAttribute('data-open', 'false');
        expect(labelsButton).toHaveAttribute('data-open', 'true');
    });
});
