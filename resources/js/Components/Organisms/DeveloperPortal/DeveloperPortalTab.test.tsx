import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    paginated,
    portalContainers,
    portalErrorLog,
    portalProjects,
    portalTotals,
    portalUsers,
} from '@/stories/developerPortalFixtures';
import DeveloperPortalTab from './DeveloperPortalTab';

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
            .map((bar) => (bar as HTMLElement).style.height);
        expect(heights).toEqual(['40%', '35%', '25%']);
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
                .map((bar) => (bar as HTMLElement).style.height),
        ).toEqual(['0%', '0%', '0%']);
        expect(
            screen.queryByText(/of all issues are done/),
        ).not.toBeInTheDocument();
    });

    test('renders all sections and passes the current query to the lists', () => {
        renderTab();

        expect(screen.getByText('Container uptime')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Recent errors' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Users' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Projects' }),
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
});
