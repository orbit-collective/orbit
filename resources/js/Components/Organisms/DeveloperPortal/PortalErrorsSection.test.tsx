import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { paginated, portalErrorLog } from '@/stories/developerPortalFixtures';
import PortalErrorsSection, {
    buildDays,
    deltaPercent,
} from './PortalErrorsSection';

vi.mock('@inertiajs/react', () => ({
    router: { get: vi.fn() },
    Link: ({
        children,
        href,
        only,
        ...rest
    }: {
        children: React.ReactNode;
        href?: string;
        only?: string[];
    }) => (
        <a href={href} data-only={only?.join(',')} {...rest}>
            {children}
        </a>
    ),
}));
vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({ addAlert: vi.fn() }),
}));

describe('deltaPercent', () => {
    test('is the percent change from the previous day', () => {
        expect(deltaPercent(3, 2)).toBe(50);
        expect(deltaPercent(1, 4)).toBe(-75);
    });

    test('is undefined when there is nothing to compare with', () => {
        expect(deltaPercent(3)).toBeUndefined();
        expect(deltaPercent(3, 0)).toBeUndefined();
    });
});

describe('buildDays', () => {
    test('turns daily counts into days with critical, error and warning rows', () => {
        const days = buildDays(portalErrorLog);

        expect(days).toHaveLength(3);
        expect(days[2].rows.map((row) => [row.key, row.value])).toEqual([
            ['critical', 1],
            ['error', 4],
            ['warning', 3],
        ]);
        expect(days[2].dayNumber).toMatch(/^\d{2}$/);
    });

    test('computes each row delta against the day before, none for the first', () => {
        const days = buildDays(portalErrorLog);

        expect(days[0].rows.every((row) => row.delta === undefined)).toBe(true);
        expect(days[2].rows.find((row) => row.key === 'error')?.delta).toBe(
            300,
        );
        // previous critical was 0, so no delta
        expect(
            days[2].rows.find((row) => row.key === 'critical')?.delta,
        ).toBeUndefined();
    });
});

describe('PortalErrorsSection', () => {
    test('shows a loading state while the deferred prop is missing', () => {
        render(<PortalErrorsSection />);

        expect(screen.getByRole('status')).toHaveTextContent('Reading the log');
    });

    test('lists the recent errors with their level', () => {
        render(<PortalErrorsSection errorLog={portalErrorLog} />);

        expect(
            screen.getByText('SQLSTATE[HY000]: disk I/O error'),
        ).toBeInTheDocument();
        expect(screen.getByText('critical')).toBeInTheDocument();
        expect(screen.getByText('error')).toBeInTheDocument();
    });

    test('summarises the selected day in the headline', () => {
        render(<PortalErrorsSection errorLog={portalErrorLog} />);

        expect(screen.getByTestId('headline')).toHaveTextContent('8 problems');
    });

    test('expands an entry to show its stack trace', async () => {
        render(<PortalErrorsSection errorLog={portalErrorLog} />);

        const first = screen.getByRole('button', {
            name: /disk I\/O error/,
        });
        expect(screen.queryByText(/Connection\.php/)).not.toBeInTheDocument();

        fireEvent.click(first);

        expect(await screen.findByText(/Connection\.php/)).toBeInTheDocument();
        expect(first).toHaveAttribute('aria-expanded', 'true');

        fireEvent.click(first);
        await waitFor(() =>
            expect(
                screen.queryByText(/Connection\.php/),
            ).not.toBeInTheDocument(),
        );
    });

    test('an entry without a trace expands to nothing extra', () => {
        render(<PortalErrorsSection errorLog={portalErrorLog} />);

        fireEvent.click(
            screen.getByRole('button', { name: /Undefined array/ }),
        );

        expect(screen.queryByText(/#0/)).not.toBeInTheDocument();
    });

    test('says so when the log has no errors', () => {
        render(
            <PortalErrorsSection
                errorLog={{
                    entries: paginated([]),
                    daily: portalErrorLog.daily,
                }}
            />,
        );

        expect(screen.getByText(/No errors in the log/)).toBeInTheDocument();
    });

    test('pages through the errors, reloading only the log', () => {
        render(
            <PortalErrorsSection
                errorLog={{
                    daily: portalErrorLog.daily,
                    entries: {
                        ...paginated(portalErrorLog.entries.data, 25),
                        links: [
                            {
                                url: null,
                                label: '&laquo; Previous',
                                active: false,
                            },
                            {
                                url: '/p?errors_page=1',
                                label: '1',
                                active: true,
                            },
                            {
                                url: '/p?errors_page=2',
                                label: '2',
                                active: false,
                            },
                            {
                                url: '/p?errors_page=2',
                                label: 'Next &raquo;',
                                active: false,
                            },
                        ],
                    },
                }}
            />,
        );

        const next = screen.getByRole('link', { name: 'Page 2' });
        expect(next).toHaveAttribute('href', '/p?errors_page=2');
        expect(next).toHaveAttribute('data-only', 'errorLog');
        expect(screen.getByText(/of/)).toBeInTheDocument();
    });

    test("the error pager keeps the other lists' current query", () => {
        render(
            <PortalErrorsSection
                queryParams={{ users_search: 'ada', projects_page: '3' }}
                errorLog={{
                    daily: portalErrorLog.daily,
                    entries: {
                        ...paginated(portalErrorLog.entries.data, 25),
                        links: [
                            {
                                url: null,
                                label: '&laquo; Previous',
                                active: false,
                            },
                            {
                                url: '/p?errors_page=1',
                                label: '1',
                                active: true,
                            },
                            {
                                url: '/p?errors_page=2',
                                label: '2',
                                active: false,
                            },
                            {
                                url: '/p?errors_page=2',
                                label: 'Next &raquo;',
                                active: false,
                            },
                        ],
                    },
                }}
            />,
        );

        const href = screen
            .getByRole('link', { name: 'Page 2' })
            .getAttribute('href')!;
        const params = new URLSearchParams(href.split('?')[1]);
        expect(params.get('errors_page')).toBe('2');
        expect(params.get('users_search')).toBe('ada');
        expect(params.get('projects_page')).toBe('3');
    });
});
