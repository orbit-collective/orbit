import { router } from '@inertiajs/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
    paginated,
    portalProjects,
    portalUsers,
} from '@/stories/developerPortalFixtures';
import PortalProjectsPanel from './PortalProjectsPanel';
import PortalUsersPanel from './PortalUsersPanel';
import { PORTAL_SEARCH_DEBOUNCE_MS } from './usePortalSearch';

vi.mock('@inertiajs/react', () => ({
    router: { get: vi.fn() },
    Link: ({
        children,
        href,
        ...rest
    }: {
        children: React.ReactNode;
        href?: string;
    }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));
vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({ addAlert: vi.fn() }),
}));

beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(router.get).mockClear();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('PortalUsersPanel', () => {
    test('lists users with their email and project count', () => {
        render(
            <PortalUsersPanel
                users={paginated(portalUsers, 12)}
                queryParams={{}}
            />,
        );

        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('ada@example.test')).toBeInTheDocument();
        expect(screen.getByText(/2 projects · joined/)).toBeInTheDocument();
        expect(screen.getByText('1 project')).toBeInTheDocument();
        expect(
            screen.getByText(/Every account on this instance \(12\)/),
        ).toBeInTheDocument();
    });

    test('says so when nothing matches', () => {
        render(<PortalUsersPanel users={paginated([])} queryParams={{}} />);

        expect(screen.getByText('No users match.')).toBeInTheDocument();
    });

    test('searching waits, then re-reads only the users from page 1 keeping other params', () => {
        render(
            <PortalUsersPanel
                users={paginated(portalUsers)}
                queryParams={{ projects_page: '3', users_page: '2' }}
            />,
        );

        fireEvent.change(screen.getByPlaceholderText(/Search by name/), {
            target: { value: ' ada ' },
        });
        expect(router.get).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(PORTAL_SEARCH_DEBOUNCE_MS);
        });

        expect(router.get).toHaveBeenCalledTimes(1);
        const [, params, options] = vi.mocked(router.get).mock.calls[0];
        expect(params).toEqual({
            projects_page: '3',
            users_page: '1',
            users_search: 'ada',
        });
        expect(options).toMatchObject({
            only: ['portalUsers'],
            preserveState: true,
            replace: true,
        });
    });

    test('clearing the search drops the term from the query', () => {
        render(
            <PortalUsersPanel
                users={paginated(portalUsers)}
                queryParams={{ users_search: 'ada' }}
            />,
        );

        expect(screen.getByPlaceholderText(/Search by name/)).toHaveValue(
            'ada',
        );
        fireEvent.change(screen.getByPlaceholderText(/Search by name/), {
            target: { value: '' },
        });
        act(() => {
            vi.advanceTimersByTime(PORTAL_SEARCH_DEBOUNCE_MS);
        });

        expect(vi.mocked(router.get).mock.calls[0][1]).toEqual({
            users_page: '1',
        });
    });

    test('does not search again for an unchanged term', () => {
        render(
            <PortalUsersPanel
                users={paginated(portalUsers)}
                queryParams={{ users_search: 'ada' }}
            />,
        );

        act(() => {
            vi.advanceTimersByTime(PORTAL_SEARCH_DEBOUNCE_MS * 2);
        });

        expect(router.get).not.toHaveBeenCalled();
    });

    test('its pager reloads only the users prop', () => {
        render(
            <PortalUsersPanel
                users={{
                    ...paginated(portalUsers, 25),
                    links: [
                        { url: null, label: '&laquo; Previous', active: false },
                        { url: '/p?users_page=1', label: '1', active: true },
                        { url: '/p?users_page=2', label: '2', active: false },
                        {
                            url: '/p?users_page=2',
                            label: 'Next &raquo;',
                            active: false,
                        },
                    ],
                }}
                queryParams={{}}
            />,
        );

        expect(screen.getByRole('link', { name: 'Page 2' })).toHaveAttribute(
            'href',
            '/p?users_page=2',
        );
    });
});

describe('PortalProjectsPanel', () => {
    test('lists projects with members and issue counts per status', () => {
        render(
            <PortalProjectsPanel
                projects={paginated(portalProjects, 4)}
                queryParams={{}}
            />,
        );

        expect(screen.getByRole('link', { name: 'Orbit' })).toHaveAttribute(
            'href',
            '/projects/1',
        );
        expect(screen.getByText('orbit · 3 members')).toBeInTheDocument();
        expect(screen.getByText('website · 1 member')).toBeInTheDocument();
        expect(screen.getByLabelText('4 to do')).toBeInTheDocument();
        expect(screen.getByLabelText('9 done')).toBeInTheDocument();
        expect(
            screen.getByLabelText('Issue counts legend'),
        ).toBeInTheDocument();
    });

    test('says so when nothing matches', () => {
        render(
            <PortalProjectsPanel projects={paginated([])} queryParams={{}} />,
        );

        expect(screen.getByText('No projects match.')).toBeInTheDocument();
    });

    test('searching re-reads only the projects prop', () => {
        render(
            <PortalProjectsPanel
                projects={paginated(portalProjects)}
                queryParams={{ users_search: 'x' }}
            />,
        );

        fireEvent.change(
            screen.getByPlaceholderText(/Search by name or slug/),
            {
                target: { value: 'orb' },
            },
        );
        act(() => {
            vi.advanceTimersByTime(PORTAL_SEARCH_DEBOUNCE_MS);
        });

        const [, params, options] = vi.mocked(router.get).mock.calls[0];
        expect(params).toEqual({
            users_search: 'x',
            projects_page: '1',
            projects_search: 'orb',
        });
        expect(options).toMatchObject({ only: ['portalProjects'] });
    });

    test('on a narrow panel a row stacks: counts get their own line with words, the legend is hidden', () => {
        render(
            <PortalProjectsPanel
                projects={paginated(portalProjects, 4)}
                queryParams={{}}
            />,
        );

        const counts = screen.getByLabelText('4 to do').parentElement!;
        expect(counts.className).toContain('flex-wrap');
        expect(counts.className).toContain('md:flex-nowrap');
        expect(
            screen.getByLabelText('4 to do').querySelector('.md\\:hidden'),
        ).toHaveTextContent('to do');
        expect(
            screen.getByLabelText('Issue counts legend').className,
        ).toContain('hidden');
        expect(
            screen.getByLabelText('Issue counts legend').className,
        ).toContain('md:flex');
    });

    test('a long name or slug truncates and never pushes the counts out', () => {
        render(
            <PortalProjectsPanel
                projects={paginated(portalProjects, 4)}
                queryParams={{}}
            />,
        );

        const link = screen.getByRole('link', { name: 'Orbit' });
        expect(link).toHaveClass('truncate');
        expect(link.parentElement).toHaveClass('min-w-0');
        expect(screen.getByText('orbit · 3 members')).toHaveClass('truncate');
    });

    test('a pager link built before another list was searched still carries that search', () => {
        const stale = {
            ...paginated(portalUsers, 25),
            links: [
                { url: null, label: '&laquo; Previous', active: false },
                { url: '/p?users_page=1', label: '1', active: true },
                { url: '/p?users_page=2', label: '2', active: false },
                {
                    url: '/p?users_page=2',
                    label: 'Next &raquo;',
                    active: false,
                },
            ],
        };
        render(
            <PortalUsersPanel
                users={stale}
                queryParams={{ projects_search: 'orbit' }}
            />,
        );

        const href = screen
            .getByRole('link', { name: 'Page 2' })
            .getAttribute('href')!;
        const params = new URLSearchParams(href.split('?')[1]);
        expect(params.get('users_page')).toBe('2');
        expect(params.get('projects_search')).toBe('orbit');
    });

    test('the projects pager does the same for the users search', () => {
        const stale = {
            ...paginated(portalProjects, 25),
            links: [
                { url: null, label: '&laquo; Previous', active: false },
                { url: '/p?projects_page=1', label: '1', active: true },
                { url: '/p?projects_page=2', label: '2', active: false },
                {
                    url: '/p?projects_page=2',
                    label: 'Next &raquo;',
                    active: false,
                },
            ],
        };
        render(
            <PortalProjectsPanel
                projects={stale}
                queryParams={{ users_search: 'ada' }}
            />,
        );

        const href = screen
            .getByRole('link', { name: 'Page 2' })
            .getAttribute('href')!;
        expect(
            new URLSearchParams(href.split('?')[1]).get('users_search'),
        ).toBe('ada');
    });
});
