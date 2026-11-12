import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ErrorScreen from './ErrorScreen';

const page = vi.hoisted(() => ({
    props: {} as Record<string, unknown>,
}));
const mockReload = vi.hoisted(() => vi.fn());
const handlers = vi.hoisted(() => ({}) as Record<string, () => void>);

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        usePage: () => ({ props: page.props }),
        router: {
            reload: mockReload,
            on: (event: string, handler: () => void) => {
                handlers[event] = handler;
                return () => {
                    delete handlers[event];
                };
            },
        },
        Link: ({ children, ...props }: Record<string, unknown>) =>
            React.createElement('a', props, children as never),
    };
});

const signedIn = { auth: { user: { id: 1 } } };

function setHistoryLength(length: number) {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(length);
}

describe('ErrorScreen', () => {
    beforeEach(() => {
        page.props = signedIn;
        setHistoryLength(3);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test.each([
        [403, 'Access denied'],
        [404, 'Page not found'],
        [500, 'Something went wrong'],
        [503, 'Back soon'],
    ] as const)('announces a %i', (status, title) => {
        render(<ErrorScreen status={status} />);

        expect(
            screen.getByRole('heading', { name: `${status} - ${title}` }),
        ).toBeInTheDocument();
        expect(screen.getByText(title)).toBeInTheDocument();
    });

    test('shows the requested path', () => {
        render(<ErrorScreen status={404} path="/projects/abc" />);

        expect(screen.getByText('/projects/abc')).toBeInTheDocument();
    });

    test('omits the path when there is none', () => {
        render(<ErrorScreen status={404} />);

        expect(screen.queryByText(/^\//)).not.toBeInTheDocument();
    });

    test('a signed-in user goes back to the dashboard and gets the search hint', () => {
        render(<ErrorScreen status={404} />);

        expect(
            screen.getByRole('link', { name: 'Back to dashboard' }),
        ).toHaveAttribute('href', '/');
        expect(screen.getByText(/Looking for something/)).toBeInTheDocument();
        expect(screen.getByText('K')).toBeInTheDocument();
    });

    test('a guest is sent to the login page and gets no search hint', () => {
        page.props = { auth: { user: null } };
        render(<ErrorScreen status={404} />);

        expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
            'href',
            '/login',
        );
        expect(
            screen.queryByText(/Looking for something/),
        ).not.toBeInTheDocument();
    });

    test('works without any shared props', () => {
        page.props = {};
        render(<ErrorScreen status={404} />);

        expect(
            screen.getByRole('link', { name: 'Log in' }),
        ).toBeInTheDocument();
    });

    test('goes back in history', () => {
        const back = vi
            .spyOn(window.history, 'back')
            .mockImplementation(() => {});
        render(<ErrorScreen status={404} />);

        fireEvent.click(screen.getByRole('button', { name: 'Go back' }));

        expect(back).toHaveBeenCalledOnce();
    });

    test('hides "Go back" when there is no history', () => {
        setHistoryLength(1);
        render(<ErrorScreen status={404} />);

        expect(
            screen.queryByRole('button', { name: 'Go back' }),
        ).not.toBeInTheDocument();
    });

    test.each([500, 503] as const)(
        'a %i offers "Try again" and no search hint',
        (status) => {
            render(<ErrorScreen status={status} />);

            expect(
                screen.getByRole('button', { name: 'Try again' }),
            ).toBeInTheDocument();
            expect(
                screen.queryByRole('button', { name: 'Go back' }),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByText(/Looking for something/),
            ).not.toBeInTheDocument();
        },
    );

    test('"Try again" reloads the page', () => {
        render(<ErrorScreen status={500} />);

        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

        expect(mockReload).toHaveBeenCalledOnce();
    });

    test('shows a loading state while a visit is in flight', () => {
        render(<ErrorScreen status={500} />);

        act(() => handlers.start());

        expect(screen.getByRole('status')).toHaveTextContent('Loading');
        expect(
            screen.getByRole('button', { name: 'Trying again…' }),
        ).toBeDisabled();
        expect(
            screen.getByRole('link', { name: 'Back to dashboard' }),
        ).toHaveAttribute('aria-disabled', 'true');

        act(() => handlers.finish());

        expect(screen.getByRole('status')).toBeEmptyDOMElement();
        expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    });

    test('stops listening to visits when it unmounts', () => {
        const { unmount } = render(<ErrorScreen status={404} />);

        unmount();

        expect(handlers.start).toBeUndefined();
        expect(handlers.finish).toBeUndefined();
    });

    test('the arrival lap is not announced as loading and ends by itself', () => {
        vi.useFakeTimers();
        render(<ErrorScreen status={404} />);

        expect(screen.getByRole('status')).toBeEmptyDOMElement();

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(screen.getByRole('status')).toBeEmptyDOMElement();
        vi.useRealTimers();
    });
});
