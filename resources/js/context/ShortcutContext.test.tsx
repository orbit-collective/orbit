import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { ShortcutDefinition } from '@/types/Shortcuts';
import { suspendShortcuts } from '@/utils/shortcutSuspension';

const mockOpenModal = vi.hoisted(() => vi.fn());
const mockRouter = vi.hoisted(() => ({ visit: vi.fn() }));

vi.mock('@/context/ModalContext', () => ({
    useModal: () => ({ openModal: mockOpenModal }),
}));

vi.mock('@inertiajs/react', () => ({
    router: mockRouter,
}));

vi.mock('@/Components/Organisms/ShortcutHelpModal/ShortcutHelpModal', () => ({
    ShortcutHelpModal: () => null,
}));

import { ShortcutProvider, useShortcuts } from './ShortcutContext';

const wrapper = ({ children }: { children: ReactNode }) => (
    <ShortcutProvider>{children}</ShortcutProvider>
);

const dispatchKeydown = (init: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        ...init,
    });
    window.dispatchEvent(event);
    return event;
};

describe('useShortcuts', () => {
    test('throws when used outside of a ShortcutProvider', () => {
        expect(() => renderHook(() => useShortcuts())).toThrow(
            'useShortcuts must be used within a ShortcutProvider',
        );
    });

    test('registers the built-in navigation and help shortcuts on mount', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        const keys = result.current.shortcuts.map((s) => s.key);
        expect(keys).toEqual(
            expect.arrayContaining([
                '?',
                '/',
                'ctrl+k',
                'alt+p',
                'alt+b',
                'ctrl+f',
            ]),
        );
    });

    test('register adds a custom shortcut and its cleanup removes it', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });
        const before = result.current.shortcuts.length;
        const shortcut: ShortcutDefinition = {
            key: 'g i',
            description: 'Go to issues',
            action: vi.fn(),
        };

        let unregister = () => {};
        act(() => {
            unregister = result.current.register(shortcut);
        });
        expect(result.current.shortcuts).toHaveLength(before + 1);

        act(() => unregister());
        expect(result.current.shortcuts).toHaveLength(before);
    });

    test('register does not duplicate an identical key + description pair', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });
        const before = result.current.shortcuts.length;
        const shortcut: ShortcutDefinition = {
            key: 'g i',
            description: 'Go to issues',
            action: vi.fn(),
        };

        act(() => {
            result.current.register(shortcut);
            result.current.register({ ...shortcut });
        });

        expect(result.current.shortcuts).toHaveLength(before + 1);
    });

    test('registerBatch with an empty array is a no-op', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });
        const before = result.current.shortcuts.length;

        act(() => {
            const unregister = result.current.registerBatch([]);
            unregister();
        });

        expect(result.current.shortcuts).toHaveLength(before);
    });

    test('registerBatch skips shortcuts that already exist', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            result.current.registerBatch([
                {
                    key: 'alt+p',
                    description: 'Go to Projects',
                    action: vi.fn(),
                },
                { key: 'g n', description: 'New shortcut', action: vi.fn() },
            ]);
        });

        const matching = result.current.shortcuts.filter(
            (s) => s.key === 'alt+p' && s.description === 'Go to Projects',
        );
        expect(matching).toHaveLength(1);
        expect(result.current.shortcuts.some((s) => s.key === 'g n')).toBe(
            true,
        );
    });

    test('triggerShortcut invokes the matching, enabled shortcut', () => {
        const action = vi.fn();
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            result.current.register({
                key: 'g p',
                description: 'Go somewhere',
                action,
            });
        });

        act(() => {
            result.current.triggerShortcut('G P');
        });

        expect(action).toHaveBeenCalledTimes(1);
    });

    test('triggerShortcut ignores disabled shortcuts', () => {
        const action = vi.fn();
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            result.current.register({
                key: 'g p',
                description: 'Go somewhere',
                action,
                disabled: true,
            });
        });

        act(() => {
            result.current.triggerShortcut('g p');
        });

        expect(action).not.toHaveBeenCalled();
    });

    test('useShortcuts(definitions) registers and unregisters the passed definitions', () => {
        const action = vi.fn();
        const definitions: ShortcutDefinition[] = [
            { key: 'g d', description: 'Go to Dashboard extra', action },
        ];

        const { result, unmount } = renderHook(
            () => useShortcuts(definitions),
            { wrapper },
        );

        expect(result.current.shortcuts.some((s) => s.key === 'g d')).toBe(
            true,
        );

        unmount();
    });

    test('a global keydown for a registered key triggers its action', () => {
        const action = vi.fn();
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            result.current.register({
                key: 'g',
                description: 'Custom single key',
                action,
            });
        });

        act(() => {
            dispatchKeydown({ key: 'g' });
        });

        expect(action).toHaveBeenCalledTimes(1);
    });

    test('ignores keydown events from text inputs unless the key is Escape', () => {
        const action = vi.fn();
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            result.current.register({
                key: 'g',
                description: 'Custom single key',
                action,
            });
        });

        const input = document.createElement('input');
        input.type = 'text';
        document.body.appendChild(input);

        act(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'g',
                bubbles: true,
                cancelable: true,
            });
            input.dispatchEvent(event);
        });

        expect(action).not.toHaveBeenCalled();
        document.body.removeChild(input);
    });

    test('ignores global shortcuts while they are suspended and resumes after', () => {
        renderHook(() => useShortcuts(), { wrapper });
        mockRouter.visit.mockClear();

        const resume = suspendShortcuts();
        act(() => {
            dispatchKeydown({ key: 'p', altKey: true });
        });
        expect(mockRouter.visit).not.toHaveBeenCalled();

        resume();
        act(() => {
            dispatchKeydown({ key: 'p', altKey: true });
        });
        expect(mockRouter.visit).toHaveBeenCalledWith('/projects');
    });

    test('alt+p navigates to /projects via the router', () => {
        renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            dispatchKeydown({ key: 'p', altKey: true });
        });

        expect(mockRouter.visit).toHaveBeenCalledWith('/projects');
    });

    test('alt+b navigates to / via the router', () => {
        renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            dispatchKeydown({ key: 'b', altKey: true });
        });

        expect(mockRouter.visit).toHaveBeenCalledWith('/');
    });

    test('registerBatch is a no-op when every shortcut already exists', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });
        const before = result.current.shortcuts.length;

        act(() => {
            result.current.registerBatch([
                {
                    key: 'alt+p',
                    description: 'Go to Projects',
                    action: vi.fn(),
                },
                {
                    key: 'alt+b',
                    description: 'Go to Dashboard',
                    action: vi.fn(),
                },
            ]);
        });

        expect(result.current.shortcuts).toHaveLength(before);
    });

    test("registerBatch's cleanup removes exactly the shortcuts it added", () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });
        const before = result.current.shortcuts.length;

        let unregister = () => {};
        act(() => {
            unregister = result.current.registerBatch([
                { key: 'g a', description: 'Batch one', action: vi.fn() },
                { key: 'g b', description: 'Batch two', action: vi.fn() },
            ]);
        });
        expect(result.current.shortcuts).toHaveLength(before + 2);

        act(() => unregister());
        expect(result.current.shortcuts).toHaveLength(before);
    });

    test('"?" opens the keyboard shortcuts help modal', () => {
        renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            dispatchKeydown({ key: '?' });
        });

        expect(mockOpenModal).toHaveBeenCalledWith(
            'Keyboard Shortcuts',
            undefined,
            expect.anything(),
        );
    });

    test('"?" does not reopen the help modal while it is already open', () => {
        const marker = document.createElement('div');
        marker.className = 'shortcut-modal-marker';
        document.body.appendChild(marker);

        renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            dispatchKeydown({ key: '?' });
        });

        expect(mockOpenModal).not.toHaveBeenCalled();
        document.body.removeChild(marker);
    });

    test('ctrl+f focuses the first text input on the page', () => {
        renderHook(() => useShortcuts(), { wrapper });
        const input = document.createElement('input');
        input.type = 'text';
        document.body.appendChild(input);
        const focusSpy = vi.spyOn(input, 'focus');

        act(() => {
            dispatchKeydown({ key: 'f', ctrlKey: true });
        });

        expect(focusSpy).toHaveBeenCalled();
        document.body.removeChild(input);
    });

    test('ctrl+f does nothing when there is no text input on the page', () => {
        renderHook(() => useShortcuts(), { wrapper });

        expect(() => {
            act(() => {
                dispatchKeydown({ key: 'f', ctrlKey: true });
            });
        }).not.toThrow();
    });

    test('recognizes ctrl and meta modifier combos', () => {
        const ctrlAction = vi.fn();
        const metaAction = vi.fn();
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            result.current.register({
                key: 'ctrl+j',
                description: 'Ctrl combo',
                action: ctrlAction,
            });
            result.current.register({
                key: 'meta+j',
                description: 'Meta combo',
                action: metaAction,
            });
        });

        act(() => dispatchKeydown({ key: 'j', ctrlKey: true }));
        expect(ctrlAction).toHaveBeenCalledTimes(1);
        expect(metaAction).not.toHaveBeenCalled();

        act(() => dispatchKeydown({ key: 'j', metaKey: true }));
        expect(metaAction).toHaveBeenCalledTimes(1);
    });

    test('recognizes a shift + modifier combo', () => {
        const action = vi.fn();
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            result.current.register({
                key: 'ctrl+shift+p',
                description: 'Shifted combo',
                action,
            });
        });

        act(() => dispatchKeydown({ key: 'p', ctrlKey: true, shiftKey: true }));

        expect(action).toHaveBeenCalledTimes(1);
    });

    test('pressing Escape resets the pressed-key combo and matches an "escape" shortcut', () => {
        const action = vi.fn();
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            result.current.register({
                key: 'escape',
                description: 'Escape action',
                action,
            });
        });

        act(() => dispatchKeydown({ key: 'Escape' }));

        expect(action).toHaveBeenCalledTimes(1);
    });

    test('a lone modifier keypress is ignored and does not throw', () => {
        renderHook(() => useShortcuts(), { wrapper });

        expect(() => {
            act(() => dispatchKeydown({ key: 'Control', ctrlKey: true }));
        }).not.toThrow();
        expect(mockRouter.visit).not.toHaveBeenCalled();
    });

    test('ignores keydown events from a contenteditable element', () => {
        const action = vi.fn();
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            result.current.register({
                key: 'g',
                description: 'Custom single key',
                action,
            });
        });

        const editable = document.createElement('div');
        editable.setAttribute('contenteditable', 'true');
        document.body.appendChild(editable);

        act(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'g',
                bubbles: true,
                cancelable: true,
            });
            editable.dispatchEvent(event);
        });

        expect(action).not.toHaveBeenCalled();
        document.body.removeChild(editable);
    });

    test('a multi-key combo only matches within the inactivity window', () => {
        vi.useFakeTimers();
        try {
            const action = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });

            act(() => {
                result.current.register({
                    key: 'g i',
                    description: 'Go to issues combo',
                    action,
                });
            });

            act(() => dispatchKeydown({ key: 'g' }));
            act(() => dispatchKeydown({ key: 'i' }));
            expect(action).toHaveBeenCalledTimes(1);

            action.mockClear();

            act(() => dispatchKeydown({ key: 'g' }));
            act(() => vi.advanceTimersByTime(600));
            act(() => dispatchKeydown({ key: 'i' }));
            expect(action).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });
});
