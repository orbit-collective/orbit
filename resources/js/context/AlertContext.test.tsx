import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const pageState = vi.hoisted(() => ({
    flash: {} as Record<string, string | undefined>,
    successHandlers: [] as Array<(event: unknown) => void>,
}));

const fireRouterSuccess = (flash: Record<string, string | undefined>) => {
    pageState.successHandlers.forEach((handler) =>
        handler({ detail: { page: { props: { flash } } } }),
    );
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { flash: pageState.flash } }),
    router: {
        on: (event: string, handler: (e: unknown) => void) => {
            if (event === 'success') {
                pageState.successHandlers.push(handler);
            }
            return () => {
                pageState.successHandlers = pageState.successHandlers.filter(
                    (h) => h !== handler,
                );
            };
        },
    },
}));

vi.mock('@/Components/Organisms/AlertContainer/AlertContainer', () => ({
    AlertContainer: () => null,
}));

import { AlertProvider, useAlert } from './AlertContext';

const wrapper = ({ children }: { children: ReactNode }) => (
    <AlertProvider>{children}</AlertProvider>
);

beforeEach(() => {
    pageState.flash = {};
    pageState.successHandlers = [];
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useAlert', () => {
    test('throws when used outside of an AlertProvider', () => {
        expect(() => renderHook(() => useAlert())).toThrow(
            'useAlert must be used within an AlertProvider',
        );
    });

    test('starts with no alerts', () => {
        const { result } = renderHook(() => useAlert(), { wrapper });
        expect(result.current.alerts).toEqual([]);
    });

    test('addAlert defaults to a success type', () => {
        const { result } = renderHook(() => useAlert(), { wrapper });

        act(() => {
            result.current.addAlert('Saved!');
        });

        expect(result.current.alerts).toHaveLength(1);
        expect(result.current.alerts[0]).toMatchObject({
            message: 'Saved!',
            type: 'success',
        });
    });

    test('addAlert respects an explicit type and action url', () => {
        const { result } = renderHook(() => useAlert(), { wrapper });

        act(() => {
            result.current.addAlert(
                'Something broke',
                'error',
                4000,
                '/issues/1',
            );
        });

        expect(result.current.alerts[0]).toMatchObject({
            message: 'Something broke',
            type: 'error',
            actionUrl: '/issues/1',
        });
    });

    test('assigns each alert a unique id', () => {
        const { result } = renderHook(() => useAlert(), { wrapper });

        act(() => {
            result.current.addAlert('First');
            result.current.addAlert('Second');
        });

        const [first, second] = result.current.alerts;
        expect(first.id).not.toBe(second.id);
    });

    test('removeAlert removes only the matching alert', () => {
        const { result } = renderHook(() => useAlert(), { wrapper });

        act(() => {
            result.current.addAlert('First');
            result.current.addAlert('Second');
        });
        const [first, second] = result.current.alerts;

        act(() => {
            result.current.removeAlert(first.id);
        });

        expect(result.current.alerts).toEqual([second]);
    });

    test('auto-removes an alert after its duration elapses', () => {
        const { result } = renderHook(() => useAlert(), { wrapper });

        act(() => {
            result.current.addAlert('Bye soon', 'success', 4000);
        });
        expect(result.current.alerts).toHaveLength(1);

        act(() => {
            vi.advanceTimersByTime(4000);
        });

        expect(result.current.alerts).toHaveLength(0);
    });

    test('does not schedule auto-removal when duration is 0', () => {
        const { result } = renderHook(() => useAlert(), { wrapper });

        act(() => {
            result.current.addAlert('Stays forever', 'success', 0);
        });

        act(() => {
            vi.advanceTimersByTime(60_000);
        });

        expect(result.current.alerts).toHaveLength(1);
    });

    test('addAlert returns the new alert id', () => {
        const { result } = renderHook(() => useAlert(), { wrapper });

        let id = '';
        act(() => {
            id = result.current.addAlert('Importing…', 'information', 0);
        });

        expect(id).toBeTruthy();
        expect(result.current.alerts[0].id).toBe(id);
    });

    test('updateAlert patches an existing alert in place, preserving untouched fields', () => {
        const { result } = renderHook(() => useAlert(), { wrapper });

        let id = '';
        act(() => {
            id = result.current.addAlert(
                'Importing… 0 imported',
                'information',
                0,
                '/settings',
            );
        });

        act(() => {
            result.current.updateAlert(id, { message: 'Importing… 3 imported' });
        });

        expect(result.current.alerts).toHaveLength(1);
        expect(result.current.alerts[0]).toMatchObject({
            id,
            message: 'Importing… 3 imported',
            type: 'information',
            actionUrl: '/settings',
        });
    });

    test('updateAlert does nothing for an id that no longer exists', () => {
        const { result } = renderHook(() => useAlert(), { wrapper });

        act(() => {
            result.current.addAlert('Still here', 'success', 0);
        });

        act(() => {
            result.current.updateAlert('not-a-real-id', { message: 'Ghost' });
        });

        expect(result.current.alerts).toHaveLength(1);
        expect(result.current.alerts[0].message).toBe('Still here');
    });

    test.each([
        ['success', 'success'],
        ['error', 'error'],
        ['warning', 'warning'],
        ['information', 'information'],
    ] as const)(
        'surfaces a flash.%s message as an alert on mount',
        (flashKey, expectedType) => {
            pageState.flash = {
                [flashKey]: 'From the server',
                action_url: '/x',
            };

            const { result } = renderHook(() => useAlert(), { wrapper });

            expect(result.current.alerts).toHaveLength(1);
            expect(result.current.alerts[0]).toMatchObject({
                message: 'From the server',
                type: expectedType,
                actionUrl: '/x',
            });
        },
    );

    test('surfaces a flash error from a subsequent Inertia visit', () => {
        const { result } = renderHook(() => useAlert(), { wrapper });

        act(() => {
            fireRouterSuccess({ error: 'This action is unauthorized.' });
        });

        expect(result.current.alerts).toHaveLength(1);
        expect(result.current.alerts[0]).toMatchObject({
            message: 'This action is unauthorized.',
            type: 'error',
        });
    });

    test('surfaces the same flash message again on a second, later visit', () => {
        // Regression test: the router used to hand back the same `flash`
        // object reference across visits whose content was identical, so a
        // `useEffect` keyed on that object never re-ran for the second
        // occurrence of the same message (e.g. two authorization failures
        // in a row). Alerts must come from the router's own visit-completion
        // event instead, which fires unconditionally every time.
        const { result } = renderHook(() => useAlert(), { wrapper });

        act(() => {
            fireRouterSuccess({ error: 'This action is unauthorized.' });
        });
        act(() => {
            vi.advanceTimersByTime(4000);
        });
        expect(result.current.alerts).toHaveLength(0);

        act(() => {
            fireRouterSuccess({ error: 'This action is unauthorized.' });
        });

        expect(result.current.alerts).toHaveLength(1);
        expect(result.current.alerts[0]).toMatchObject({
            message: 'This action is unauthorized.',
            type: 'error',
        });
    });

    test('does not show flash alerts from the initial page load a second time', () => {
        pageState.flash = { success: 'Welcome back' };

        const { result } = renderHook(() => useAlert(), { wrapper });
        expect(result.current.alerts).toHaveLength(1);

        act(() => {
            vi.advanceTimersByTime(4000);
        });
        expect(result.current.alerts).toHaveLength(0);

        act(() => {
            fireRouterSuccess({});
        });
        expect(result.current.alerts).toHaveLength(0);
    });
});
