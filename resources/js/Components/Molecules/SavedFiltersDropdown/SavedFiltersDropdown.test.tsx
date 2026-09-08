import { SavedFilter } from '@/hooks/useSavedFilters';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import SavedFiltersDropdown from './SavedFiltersDropdown';

const mockRouter = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
}));
const mockAddAlert = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    router: mockRouter,
}));

vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({
        addAlert: mockAddAlert,
        removeAlert: vi.fn(),
        alerts: [],
    }),
}));

const makeSavedFilter = (
    overrides: Partial<SavedFilter> = {},
): SavedFilter => ({
    id: 1,
    project_id: 7,
    name: 'My View',
    context: 'project_7',
    query_params: { status: 'open' },
    ...overrides,
});

describe('SavedFiltersDropdown Component', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    test('renders the trigger button with the Filters label', () => {
        render(<SavedFiltersDropdown isOpen={false} onOpenChange={vi.fn()} />);

        expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    test('shows the active filter count as the trigger value', () => {
        render(
            <SavedFiltersDropdown
                queryParams={{ status: 'open', labels: 'bug' }}
                isOpen={false}
                onOpenChange={vi.fn()}
            />,
        );

        expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('calls onOpenChange when the trigger is clicked', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        render(
            <SavedFiltersDropdown isOpen={false} onOpenChange={onOpenChange} />,
        );

        await user.click(screen.getByText('Filters'));

        expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    test('prompts to apply a filter first when no filters are active', async () => {
        render(<SavedFiltersDropdown isOpen onOpenChange={vi.fn()} />);

        expect(
            await screen.findByText(
                'Apply a filter above to save it as a view.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText('Name this view…'),
        ).not.toBeInTheDocument();
    });

    test('shows the active filters summary and a save form when filters are active', async () => {
        render(
            <SavedFiltersDropdown
                queryParams={{ status: 'open' }}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        expect(await screen.findByText('Status: open')).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText('Name this view…'),
        ).toBeInTheDocument();
    });

    test('disables the Save button until a name is entered', async () => {
        render(
            <SavedFiltersDropdown
                queryParams={{ status: 'open' }}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        await screen.findByText('Status: open');
        expect(screen.getByText('Save').closest('button')).toBeDisabled();
    });

    test('saves the current filters under the given name', async () => {
        const user = userEvent.setup();
        render(
            <SavedFiltersDropdown
                queryParams={{ status: 'open' }}
                projectId={7}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        const input = await screen.findByPlaceholderText('Name this view…');
        await user.type(input, 'My saved view');
        await user.click(screen.getByText('Save'));

        expect(mockRouter.post).toHaveBeenCalledWith(
            '/saved-filters',
            {
                project_id: 7,
                name: 'My saved view',
                context: 'project_7',
                query_params: { status: 'open' },
            },
            expect.objectContaining({
                preserveScroll: true,
                preserveState: true,
            }),
        );
        expect(input).toHaveValue('');
    });

    test('saves when pressing Enter in the name field', async () => {
        const user = userEvent.setup();
        render(
            <SavedFiltersDropdown
                queryParams={{ status: 'open' }}
                projectId={7}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        const input = await screen.findByPlaceholderText('Name this view…');
        await user.type(input, 'My saved view{Enter}');

        expect(mockRouter.post).toHaveBeenCalledTimes(1);
    });

    test('does not save when no projectId is available', async () => {
        const user = userEvent.setup();
        render(
            <SavedFiltersDropdown
                queryParams={{ status: 'open' }}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        const input = await screen.findByPlaceholderText('Name this view…');
        await user.type(input, 'My saved view');
        await user.click(screen.getByText('Save'));

        expect(mockRouter.post).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith(
            'SavedFilterError: Lack of projectId',
        );
    });

    test('shows an empty state when there are no saved views', async () => {
        render(<SavedFiltersDropdown isOpen onOpenChange={vi.fn()} />);

        expect(
            await screen.findByText('No saved views yet'),
        ).toBeInTheDocument();
    });

    test('lists saved views with their name and filter summary', async () => {
        render(
            <SavedFiltersDropdown
                savedFilters={[
                    makeSavedFilter({
                        id: 1,
                        name: 'Open bugs',
                        query_params: { status: 'open', labels: 'bug' },
                    }),
                ]}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        expect(await screen.findByText('Open bugs')).toBeInTheDocument();
        expect(
            screen.getByText('Labels: bug · Status: open'),
        ).toBeInTheDocument();
    });

    test('applies a saved view when clicked', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        render(
            <SavedFiltersDropdown
                queryParams={{ sort: 'created_at', status: 'closed' }}
                savedFilters={[
                    makeSavedFilter({
                        id: 3,
                        name: 'High priority',
                        query_params: { priority: 'high' },
                    }),
                ]}
                isOpen
                onOpenChange={onOpenChange}
            />,
        );

        await user.click(await screen.findByText('High priority'));

        expect(mockRouter.get).toHaveBeenCalledTimes(1);
        const [url, params, options] = mockRouter.get.mock.calls[0];
        expect(url).toBe('/');
        expect(params).toEqual(
            expect.objectContaining({
                sort: 'created_at',
                priority: 'high',
                page: 1,
            }),
        );
        expect(params).not.toHaveProperty('status');
        expect(options).toEqual(
            expect.objectContaining({ preserveState: true, replace: true }),
        );
        expect(mockAddAlert).toHaveBeenCalledWith(
            'Filters applied successfully',
            'success',
        );
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    test('applies a saved view via the keyboard', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        render(
            <SavedFiltersDropdown
                savedFilters={[
                    makeSavedFilter({ id: 4, name: 'Keyboard view' }),
                ]}
                isOpen
                onOpenChange={onOpenChange}
            />,
        );

        const row = (await screen.findByText('Keyboard view')).closest(
            '[role="button"]',
        ) as HTMLElement;
        row.focus();
        await user.keyboard('{Enter}');

        expect(mockRouter.get).toHaveBeenCalledTimes(1);
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    test('deletes a saved view without applying it', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        render(
            <SavedFiltersDropdown
                savedFilters={[makeSavedFilter({ id: 9, name: 'To delete' })]}
                isOpen
                onOpenChange={onOpenChange}
            />,
        );

        await screen.findByText('To delete');
        const deleteButton = document
            .querySelector('.lucide-trash')
            ?.closest('button') as HTMLElement;
        await user.click(deleteButton);

        expect(mockRouter.delete).toHaveBeenCalledWith(
            '/saved-filters/9',
            expect.objectContaining({
                preserveScroll: true,
                preserveState: true,
            }),
        );
        expect(mockRouter.get).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalled();
    });

    test('clears all active filters when Clear all is clicked', async () => {
        const user = userEvent.setup();
        render(
            <SavedFiltersDropdown
                queryParams={{ status: 'open', labels: 'bug' }}
                isOpen
                onOpenChange={vi.fn()}
            />,
        );

        await user.click(await screen.findByText('Clear all'));

        expect(mockRouter.get).toHaveBeenCalledTimes(1);
        const params = mockRouter.get.mock.calls[0][1];
        expect(params).not.toHaveProperty('status');
        expect(params).not.toHaveProperty('labels');
        expect(mockAddAlert).toHaveBeenCalledWith(
            'Filters applied successfully',
            'success',
        );
    });

    test('closes the panel when Escape is pressed', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        render(<SavedFiltersDropdown isOpen onOpenChange={onOpenChange} />);

        await screen.findByText('Filters', { selector: 'p' });
        await user.keyboard('{Escape}');

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    test('closes the panel when clicking outside', async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();
        render(<SavedFiltersDropdown isOpen onOpenChange={onOpenChange} />);

        await screen.findByText('Filters', { selector: 'p' });
        await user.click(document.body);

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
