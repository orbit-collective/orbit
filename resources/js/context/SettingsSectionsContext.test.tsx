import {
    act,
    fireEvent,
    render,
    renderHook,
    screen,
} from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    SettingsSectionsProvider,
    useSettingsPanelState,
    useSettingsSections,
} from './SettingsSectionsContext';

const KEY = 'settings-sections:test';

const wrapper = ({ children }: { children: ReactNode }) => (
    <SettingsSectionsProvider storageKey={KEY}>
        {children}
    </SettingsSectionsProvider>
);

/** Two panels and a readout of what the provider knows, to drive the context like a page does. */
function Page({ defaults = {} as Record<string, boolean> }) {
    const a = useSettingsPanelState('a', defaults.a);
    const b = useSettingsPanelState('b', defaults.b);
    const sections = useSettingsSections();

    return (
        <div>
            <button onClick={a?.toggle}>toggle a</button>
            <button onClick={b?.toggle}>toggle b</button>
            <button onClick={() => sections?.setAll(!sections.allCollapsed)}>
                all
            </button>
            <p data-testid="state">
                a:{String(a?.collapsed)} b:{String(b?.collapsed)} count:
                {sections?.count} all:{String(sections?.allCollapsed)}
            </p>
        </div>
    );
}

const state = () => screen.getByTestId('state').textContent;

beforeEach(() => {
    localStorage.clear();
});

describe('useSettingsPanelState', () => {
    test('is null outside a settings page, and without an id', () => {
        const outside = renderHook(() => useSettingsPanelState('a'));
        expect(outside.result.current).toBeNull();

        const noId = renderHook(() => useSettingsPanelState(undefined), {
            wrapper,
        });
        expect(noId.result.current).toBeNull();
    });

    test('starts from the default and toggles', () => {
        const { result } = renderHook(() => useSettingsPanelState('a', true), {
            wrapper,
        });
        expect(result.current?.collapsed).toBe(true);

        act(() => result.current?.toggle());
        expect(result.current?.collapsed).toBe(false);

        act(() => result.current?.toggle());
        expect(result.current?.collapsed).toBe(true);
    });
});

describe('SettingsSectionsProvider', () => {
    test('counts the mounted panels and forgets one that unmounts', () => {
        const { rerender } = render(
            <SettingsSectionsProvider storageKey={KEY}>
                <Page />
            </SettingsSectionsProvider>,
        );
        expect(state()).toContain('count:2');

        rerender(
            <SettingsSectionsProvider storageKey={KEY}>
                <div data-testid="state">none</div>
            </SettingsSectionsProvider>,
        );
        expect(state()).toBe('none');
    });

    test('remembers a choice for the next visit', () => {
        const first = render(
            <SettingsSectionsProvider storageKey={KEY}>
                <Page />
            </SettingsSectionsProvider>,
        );
        fireEvent.click(screen.getByText('toggle a'));
        expect(state()).toContain('a:true');
        first.unmount();

        render(
            <SettingsSectionsProvider storageKey={KEY}>
                <Page />
            </SettingsSectionsProvider>,
        );

        expect(state()).toContain('a:true');
        expect(state()).toContain('b:false');
    });

    test('a stored choice wins over a default; other tabs have their own key', () => {
        localStorage.setItem(KEY, JSON.stringify({ a: false }));
        render(
            <SettingsSectionsProvider storageKey={KEY}>
                <Page defaults={{ a: true, b: true }} />
            </SettingsSectionsProvider>,
        );

        expect(state()).toContain('a:false');
        expect(state()).toContain('b:true');

        localStorage.clear();
        render(
            <SettingsSectionsProvider storageKey="settings-sections:other">
                <Page defaults={{ a: true }} />
            </SettingsSectionsProvider>,
        );
        expect(screen.getAllByTestId('state')[1].textContent).toContain(
            'a:true',
        );
    });

    test('collapse all folds every mounted panel, then expand all opens them', () => {
        render(
            <SettingsSectionsProvider storageKey={KEY}>
                <Page />
            </SettingsSectionsProvider>,
        );
        expect(state()).toContain('all:false');

        fireEvent.click(screen.getByText('all'));
        expect(state()).toContain('a:true b:true');
        expect(state()).toContain('all:true');

        fireEvent.click(screen.getByText('all'));
        expect(state()).toContain('a:false b:false');
    });

    test('broken or hostile storage falls back to the defaults', () => {
        localStorage.setItem(KEY, '{not json');
        render(
            <SettingsSectionsProvider storageKey={KEY}>
                <Page defaults={{ b: true }} />
            </SettingsSectionsProvider>,
        );
        expect(state()).toContain('b:true');
    });

    test('still works when storage throws', () => {
        const get = vi
            .spyOn(Storage.prototype, 'getItem')
            .mockImplementation(() => {
                throw new Error('blocked');
            });
        const set = vi
            .spyOn(Storage.prototype, 'setItem')
            .mockImplementation(() => {
                throw new Error('blocked');
            });

        render(
            <SettingsSectionsProvider storageKey={KEY}>
                <Page />
            </SettingsSectionsProvider>,
        );
        fireEvent.click(screen.getByText('toggle a'));

        expect(state()).toContain('a:true');
        get.mockRestore();
        set.mockRestore();
    });
});
