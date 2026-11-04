import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    paginated,
    portalContainers,
    portalErrorLog,
    portalProjects,
    portalTotals,
    portalUsers,
} from '@/stories/developerPortalFixtures';
import DeveloperPortalTab, { SECTION_DEFAULTS } from './DeveloperPortalTab';

const live = vi.hoisted(() => ({ useDeveloperPortalLive: vi.fn() }));

vi.mock('@/live/useDeveloperPortalLive', () => live);
vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        url: '/settings/dev-portal?users_page=2&users_search=ada',
    }),
    router: { get: vi.fn() },
    Link: ({
        children,
        href,
    }: {
        children: React.ReactNode;
        href?: string;
    }) => <a href={href}>{children}</a>,
}));
vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({ addAlert: vi.fn() }),
}));

const renderTab = (props = {}) =>
    render(
        <DeveloperPortalTab
            totals={portalTotals}
            portalUsers={paginated(portalUsers, 12)}
            portalProjects={paginated(portalProjects, 4)}
            containers={portalContainers}
            errorLog={portalErrorLog}
            {...props}
        />,
    );

beforeEach(() => {
    localStorage.clear();
    live.useDeveloperPortalLive.mockClear();
});

describe('DeveloperPortalTab', () => {
    test('subscribes to live updates', () => {
        renderTab();

        expect(live.useDeveloperPortalLive).toHaveBeenCalledTimes(1);
    });

    test('shows the instance totals', () => {
        renderTab();

        expect(screen.getAllByText('12').length).toBeGreaterThan(0);
        expect(screen.getAllByText('37').length).toBeGreaterThan(0);
        expect(screen.getByTestId('total')).toHaveTextContent('100');
        expect(screen.getAllByText('new in 7 days')).toHaveLength(2);
    });

    test('omits the trend when nothing is new', () => {
        renderTab({ totals: { ...portalTotals, newIssues: 0, newUsers: 0 } });

        expect(screen.queryByText('new in 7 days')).not.toBeInTheDocument();
    });

    test('splits issues by status into percent bars', () => {
        renderTab();

        const heights = screen
            .getAllByTestId('percent-bar')
            .map((bar) => (bar as HTMLElement).dataset.heightPercent);
        expect(heights).toEqual(['40', '35', '25']);
        expect(
            screen.getByText('25% of all issues are done.'),
        ).toBeInTheDocument();
    });

    test('with no issues every bar is empty and there is no footnote', () => {
        renderTab({
            totals: {
                ...portalTotals,
                issues: 0,
                categories: { todo: 0, in_progress: 0, done: 0 },
            },
        });

        expect(
            screen
                .getAllByTestId('percent-bar')
                .map((bar) => (bar as HTMLElement).dataset.heightPercent),
        ).toEqual(['0', '0', '0']);
        expect(
            screen.queryByText(/of all issues are done/),
        ).not.toBeInTheDocument();
    });

    test('renders all sections and passes the current query to the lists', () => {
        renderTab();

        expect(screen.getByText('Container uptime')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /^Recent errors/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /^Users/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /^Projects/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText(/Search by name or email/),
        ).toHaveValue('ada');
        const users = screen.getByText('Ada Lovelace').closest('section')!;
        expect(within(users).getByText('ada@example.test')).toBeInTheDocument();
    });

    test('deferred sections show their loading state first', () => {
        renderTab({ containers: undefined, errorLog: undefined });

        expect(screen.getAllByRole('status')).toHaveLength(2);
    });

    test('the long lists start folded, the glanceable parts open', async () => {
        renderTab();

        await waitFor(() => expect(screen.getByTestId('total')).toBeVisible());
        expect(screen.getByRole('button', { name: /Users/ })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        expect(
            screen.getByRole('button', { name: /Projects/ }),
        ).toHaveAttribute('aria-expanded', 'false');
        expect(
            screen.getByRole('button', { name: /Recent errors/ }),
        ).toHaveAttribute('aria-expanded', 'true');
        expect(SECTION_DEFAULTS.users).toBe(true);
    });

    test('a folded section still summarises itself', () => {
        renderTab();

        const users = screen.getByRole('button', { name: /Users/ });
        expect(
            within(users).getByTestId('collapsed-summary'),
        ).toHaveTextContent('12 users');
    });

    test('opening a folded section and reloading remembers it', () => {
        const { unmount } = renderTab();
        fireEvent.click(screen.getByRole('button', { name: /Users/ }));
        expect(screen.getByRole('button', { name: /Users/ })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        unmount();

        renderTab();

        expect(screen.getByRole('button', { name: /Users/ })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
    });

    test('"Collapse all" folds everything, then "Expand all" opens everything', async () => {
        renderTab();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Collapse all' }),
        );
        expect(screen.getByRole('button', { name: /Users/ })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
        expect(
            screen.getByRole('button', { name: /Recent errors/ }),
        ).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(
            await screen.findByRole('button', { name: 'Expand all' }),
        );
        expect(screen.getByRole('button', { name: /Users/ })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(
            screen.getByRole('button', { name: /Recent errors/ }),
        ).toHaveAttribute('aria-expanded', 'true');
        expect(
            await screen.findByRole('button', { name: 'Collapse all' }),
        ).toBeInTheDocument();
    });

    test('the deferred loading panels fold too', () => {
        renderTab({ containers: undefined, errorLog: undefined });

        expect(
            screen.getByRole('button', { name: /Containers/ }),
        ).toHaveAttribute('aria-expanded', 'true');
        expect(
            screen.getByRole('button', { name: /Recent errors/ }),
        ).toHaveAttribute('aria-expanded', 'true');
    });

    test('issue statuses are Badges with counts, focusable, with a share tooltip', () => {
        renderTab();

        const todo = screen
            .getAllByText('To do', {
                selector: 'span[tabindex] *, span[tabindex]',
            })
            .map((el) => el.closest('span[tabindex]'))
            .find(Boolean)!;
        expect(todo).toHaveAttribute('tabindex', '0');
        expect(todo).toHaveTextContent('To do40');
        expect(screen.getByText('40% of all issues')).toBeInTheDocument();
        expect(screen.getByText('35% of all issues')).toBeInTheDocument();
        expect(screen.getByText('25% of all issues')).toBeInTheDocument();
    });

    test('the status bars explain themselves on hover and focus', () => {
        renderTab();

        expect(
            screen.getByRole('img', {
                name: /Done: 25 done · 25% of all issues/,
            }),
        ).toHaveAttribute('tabindex', '0');
    });

    test('the controls carry the keyboard focus ring', () => {
        renderTab();

        expect(
            screen.getByRole('button', { name: /Collapse all|Expand all/ })
                .className,
        ).toContain('focus-visible:ring-2');
    });

    test('the stat cards stretch to the same height whatever they contain', () => {
        const { container } = renderTab();

        const cells = Array.from(
            container.querySelector('.grid.grid-cols-1')!.children,
        );
        expect(cells).toHaveLength(4);
        cells.forEach((cell) => {
            expect(cell).toHaveClass('h-full');
            expect(cell.firstElementChild).toHaveClass('h-full');
        });
    });
});
