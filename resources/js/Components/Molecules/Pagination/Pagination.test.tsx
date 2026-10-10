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
        ...rest
    }: {
        children: React.ReactNode;
        href?: string;
        className?: string;
    }) => (
        <a href={href} className={className} {...rest}>
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
});
