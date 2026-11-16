import { router } from '@inertiajs/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import Pagination from './Pagination';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        className,
        preserveState,
        only,
        ...rest
    }: {
        children: React.ReactNode;
        href?: string;
        className?: string;
        preserveState?: boolean;
        only?: string[];
    }) => (
        <a
            href={href}
            className={className}
            data-preserve-state={String(preserveState)}
            data-only={only ? only.join(',') : undefined}
            {...rest}
        >
            {children}
        </a>
    ),
    router: {
        get: vi.fn(),
    },
}));

const { addAlert } = vi.hoisted(() => ({
    addAlert: vi.fn(),
}));

vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({
        addAlert,
        removeAlert: vi.fn(),
        alerts: [],
    }),
}));

const buildLinks = () => [
    { url: null, label: '&laquo; Previous', active: false },
    { url: '/?page=1', label: '1', active: true },
    { url: '/?page=2', label: '2', active: false },
    { url: '/?page=2', label: 'Next &raquo;', active: false },
];

describe('Pagination Component', () => {
    test('renders nothing when the total is zero', () => {
        const { container } = render(
            <Pagination links={buildLinks()} from={0} to={0} total={0} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    test('renders the "Showing X to Y of Z results" summary', () => {
        // Use values that do not collide with the "1"/"2" page-link labels.
        render(
            <Pagination links={buildLinks()} from={11} to={20} total={25} />,
        );

        expect(screen.getByText('11')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
        expect(screen.getByText(/results/i)).toBeInTheDocument();
    });

    test('falls back to 0 for missing from / to values', () => {
        render(<Pagination links={buildLinks()} from={0} to={0} total={25} />);

        expect(screen.getAllByText('0')).toHaveLength(2);
    });

    test('renders page links when there are more than 3 links', () => {
        render(<Pagination links={buildLinks()} from={1} to={10} total={25} />);

        const links = screen.getAllByRole('link');
        expect(links.length).toBeGreaterThan(0);
        expect(links.some((l) => l.getAttribute('href') === '/?page=2')).toBe(
            true,
        );
    });

    test('does not render page links when there are 3 or fewer links', () => {
        const links = [
            { url: null, label: '&laquo; Previous', active: false },
            { url: '/?page=1', label: '1', active: true },
            { url: '/?page=1', label: 'Next &raquo;', active: false },
        ];
        render(<Pagination links={links} from={1} to={10} total={25} />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test('renders disabled links (no url) as non-navigable spans', () => {
        render(<Pagination links={buildLinks()} from={1} to={10} total={25} />);

        // The "Previous" entry has a null url, so it must not be a link.
        const previous = screen
            .getAllByRole('link')
            .map((l) => l.getAttribute('href'));
        expect(previous).not.toContain(null);
    });

    test('opens the rows-per-page dropdown and highlights the current count', async () => {
        render(<Pagination links={buildLinks()} from={1} to={10} total={25} />);

        await userEvent.click(screen.getByRole('button'));

        expect(screen.getByText('10 rows')).toBeInTheDocument();
        expect(screen.getByText('20 rows')).toBeInTheDocument();
        expect(
            screen.getByRole('menuitemradio', { name: /10 rows/ }),
        ).toHaveAttribute('aria-checked', 'true');
        expect(
            screen.getByRole('menuitemradio', { name: '20 rows' }),
        ).toHaveAttribute('aria-checked', 'false');
    });

    test('changes the rows per page, alerts, and navigates with the new value', async () => {
        render(
            <Pagination
                links={buildLinks()}
                from={1}
                to={10}
                total={25}
                queryParams={{ page: '2' }}
            />,
        );

        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getByText('20 rows'));

        expect(router.get).toHaveBeenCalledWith(
            window.location.pathname,
            { page: 1, perPage: 20 },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: expect.any(Function),
            },
        );

        // The alert only fires once the request has succeeded.
        expect(addAlert).not.toHaveBeenCalled();
        vi.mocked(router.get)
            .mock.calls.at(-1)?.[2]
            ?.onSuccess?.({} as never);
        expect(addAlert).toHaveBeenCalledWith(
            'Rows per page changed to 20',
            'information',
        );

        // The dropdown closes after a selection is made.
        expect(screen.queryByText('20 rows')).not.toBeInTheDocument();
    });

    test('hides a disabled, non-active numeric page link on mobile', () => {
        const links = [
            { url: null, label: '&laquo; Previous', active: false },
            { url: '/?page=1', label: '1', active: true },
            { url: null, label: '2', active: false },
            { url: '/?page=3', label: 'Next &raquo;', active: false },
        ];
        render(<Pagination links={links} from={1} to={10} total={25} />);

        expect(screen.getByText('2')).toHaveClass('hidden', 'sm:flex');
    });

    test('hides the ellipsis on mobile along with the numeric page links', () => {
        const links = [
            { url: null, label: '&laquo; Previous', active: false },
            ...Array.from({ length: 10 }, (_, i) => ({
                url: `/?page=${i + 1}`,
                label: String(i + 1),
                active: i === 0,
            })),
            { url: '/?page=2', label: 'Next &raquo;', active: false },
        ];
        render(<Pagination links={links} from={1} to={10} total={100} />);

        expect(screen.getByText('...')).toHaveClass('hidden', 'sm:flex');
    });

    test('closes the rows-per-page dropdown with Escape or an outside click', async () => {
        render(<Pagination links={buildLinks()} from={1} to={10} total={25} />);

        await userEvent.click(screen.getByRole('button'));
        expect(screen.getByText('20 rows')).toBeInTheDocument();
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByText('20 rows')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(document.body);
        expect(screen.queryByText('20 rows')).not.toBeInTheDocument();
    });

    test('draws the arrows whatever language the server words the links in', () => {
        const links = buildLinks().map((link, index, all) =>
            index === 0
                ? { ...link, label: '&laquo; Poprzednia' }
                : index === all.length - 1
                  ? { ...link, label: 'Następna &raquo;' }
                  : link,
        );
        render(<Pagination links={links} from={1} to={10} total={25} />);

        expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Next page' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/Poprzednia|Następna/),
        ).not.toBeInTheDocument();
    });

    test('exposes a labelled pagination landmark with named, current-aware links', () => {
        render(<Pagination links={buildLinks()} from={1} to={10} total={25} />);

        const nav = screen.getByRole('navigation', { name: 'Pagination' });
        expect(nav).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Next page' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Previous page')).toHaveAttribute(
            'aria-disabled',
            'true',
        );
        expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute(
            'aria-label',
            'Page 1',
        );
    });

    test('names the rows-per-page trigger for screen readers', () => {
        render(<Pagination links={buildLinks()} from={1} to={10} total={25} />);

        expect(
            screen.getByRole('button', { name: /rows per page/i }),
        ).toBeInTheDocument();
    });

    test('moves focus into the menu and supports arrow-key navigation', async () => {
        render(<Pagination links={buildLinks()} from={1} to={10} total={25} />);

        const trigger = screen.getByRole('button', { name: /rows per page/i });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(
            screen.getByRole('menuitemradio', { name: /10 rows/ }),
        ).toHaveFocus();

        await userEvent.keyboard('{ArrowDown}');
        expect(
            screen.getByRole('menuitemradio', { name: '20 rows' }),
        ).toHaveFocus();

        await userEvent.keyboard('{End}');
        expect(
            screen.getByRole('menuitemradio', { name: '100 rows' }),
        ).toHaveFocus();

        await userEvent.keyboard('{ArrowDown}');
        expect(
            screen.getByRole('menuitemradio', { name: /10 rows/ }),
        ).toHaveFocus();

        await userEvent.keyboard('{Escape}');
        expect(trigger).toHaveFocus();
    });

    test('uses custom page and per-page param names and default rows per page', async () => {
        render(
            <Pagination
                links={buildLinks()}
                from={1}
                to={20}
                total={45}
                queryParams={{ page: '4', activityPage: '3' }}
                pageParam="activityPage"
                perPageParam="activityPerPage"
                defaultPerPage={20}
            />,
        );

        // The per-page trigger shows the configured default, not the first option.
        expect(screen.getByRole('button')).toHaveTextContent('20');

        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getByText('50 rows'));

        expect(router.get).toHaveBeenLastCalledWith(
            window.location.pathname,
            {
                page: '4',
                activityPage: 1,
                activityPerPage: 50,
            },
            expect.any(Object),
        );
    });

    test('reads the current rows per page from the custom per-page param', () => {
        render(
            <Pagination
                links={buildLinks()}
                from={1}
                to={50}
                total={120}
                queryParams={{ activityPerPage: '50' }}
                perPageParam="activityPerPage"
                defaultPerPage={20}
            />,
        );

        expect(screen.getByRole('button')).toHaveTextContent('50');
    });

    test('remounts on page links by default', () => {
        render(<Pagination links={buildLinks()} from={1} to={10} total={25} />);

        const links = screen.getAllByRole('link');
        expect(links.length).toBeGreaterThan(0);
        links.forEach((link) =>
            expect(link).toHaveAttribute('data-preserve-state', 'false'),
        );
    });

    test('keeps the page mounted on page links when preserveState is set', () => {
        render(
            <Pagination
                links={buildLinks()}
                from={1}
                to={10}
                total={25}
                preserveState
            />,
        );

        const links = screen.getAllByRole('link');
        expect(links.length).toBeGreaterThan(0);
        links.forEach((link) =>
            expect(link).toHaveAttribute('data-preserve-state', 'true'),
        );
    });

    test('limits page links to the named props when only is set', () => {
        render(
            <Pagination
                links={buildLinks()}
                from={1}
                to={10}
                total={25}
                only={['activityLogs']}
            />,
        );

        const links = screen.getAllByRole('link');
        expect(links.length).toBeGreaterThan(0);
        links.forEach((link) =>
            expect(link).toHaveAttribute('data-only', 'activityLogs'),
        );
    });

    test('requests only the named props when the rows per page change', async () => {
        render(
            <Pagination
                links={buildLinks()}
                from={1}
                to={10}
                total={25}
                only={['activityLogs']}
            />,
        );

        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getByText('20 rows'));

        expect(router.get).toHaveBeenLastCalledWith(
            window.location.pathname,
            expect.any(Object),
            expect.objectContaining({ only: ['activityLogs'] }),
        );
    });

    test('merges a custom className over the default padding', () => {
        const { container } = render(
            <Pagination
                links={buildLinks()}
                from={1}
                to={10}
                total={25}
                className="border-t px-0"
            />,
        );

        const root = container.firstChild as HTMLElement;
        expect(root).toHaveClass('px-0', 'border-t');
        expect(root).not.toHaveClass('px-6');
        expect(root).toHaveClass('py-4');
    });
});

describe('Pagination, controlled and compact', () => {
    const renderControlled = (
        props: Partial<React.ComponentProps<typeof Pagination>> = {},
    ) => {
        const onPageChange = vi.fn();
        const onPerPageChange = vi.fn();
        const view = render(
            <Pagination
                total={134}
                page={2}
                perPage={6}
                perPageOptions={[6, 12, 24]}
                onPageChange={onPageChange}
                onPerPageChange={onPerPageChange}
                variant="compact"
                {...props}
            />,
        );

        return { onPageChange, onPerPageChange, ...view };
    };

    test('works out what is shown from the page, size and total', () => {
        renderControlled();

        const summary = screen.getByText(/Showing/);
        expect(summary).toHaveTextContent('Showing 7 to 12 of 134 results');
        expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
            'aria-current',
            'page',
        );
    });

    test('changes the page with buttons, never a link', async () => {
        const { onPageChange } = renderControlled();

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Next page' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Previous page' }),
        );
        await userEvent.click(screen.getByRole('button', { name: 'Page 1' }));

        expect(onPageChange).toHaveBeenNthCalledWith(1, 3);
        expect(onPageChange).toHaveBeenNthCalledWith(2, 1);
        expect(onPageChange).toHaveBeenNthCalledWith(3, 1);
    });

    test('stops at the ends and clips the last range', () => {
        const { unmount } = renderControlled({ page: 1 });
        expect(
            screen.getByRole('button', { name: 'Previous page' }),
        ).toBeDisabled();
        unmount();

        renderControlled({ page: 23, total: 134 });
        expect(
            screen.getByRole('button', { name: 'Next page' }),
        ).toBeDisabled();
        expect(screen.getByText(/Showing/)).toHaveTextContent(
            'Showing 133 to 134 of 134 results',
        );
    });

    test('clamps a page that is past the end after the list shrank', () => {
        renderControlled({ page: 99, total: 20 });

        expect(screen.getByText(/Showing/)).toHaveTextContent(
            'Showing 19 to 20 of 20 results',
        );
    });

    test('offers the given sizes and reports a new one without touching the URL', async () => {
        const { onPerPageChange } = renderControlled();

        await userEvent.click(
            screen.getByRole('button', { name: /Rows per page/ }),
        );
        await userEvent.click(
            await screen.findByRole('menuitemradio', { name: /12/ }),
        );

        expect(onPerPageChange).toHaveBeenCalledWith(12);
        expect(router.get).not.toHaveBeenCalled();
        expect(addAlert).not.toHaveBeenCalled();
    });

    test('shows no page buttons for a single page, and nothing for an empty list', () => {
        const { unmount } = renderControlled({ total: 5 });
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        expect(screen.getByText(/Showing/)).toHaveTextContent(
            'Showing 1 to 5 of 5 results',
        );
        unmount();

        const { container } = renderControlled({ total: 0 });
        expect(container).toBeEmptyDOMElement();
    });

    test('the compact look changes the size of the controls, not their behaviour', () => {
        renderControlled();

        expect(screen.getByRole('button', { name: 'Next page' })).toHaveClass(
            'h-7',
            'rounded-full',
        );
    });

    test('the compact pager answers to the width of its own container, not the window', () => {
        const { container } = renderControlled();

        // A container the layout can query, and numbers that wait for room in it.
        expect(container.firstElementChild).toHaveClass(
            '@container',
            'w-full',
            'min-w-0',
        );
        expect(screen.getByRole('button', { name: 'Page 1' })).toHaveClass(
            'hidden',
            '@md:flex',
        );
        expect(screen.getByRole('button', { name: 'Page 1' })).not.toHaveClass(
            'sm:flex',
        );
        // The current page is always there.
        expect(screen.getByRole('button', { name: 'Page 2' })).toHaveClass(
            'flex',
        );
        expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveClass(
            'hidden',
        );
    });

    test('the default pager still follows the window', () => {
        const { container } = render(
            <Pagination links={buildLinks()} from={1} to={10} total={30} />,
        );

        expect(container.firstElementChild).not.toHaveClass('@container');
    });
});
