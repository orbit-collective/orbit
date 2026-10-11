import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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

beforeEach(() => {
    mockOpenModal.mockClear();
    mockRouter.visit.mockClear();
});

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

const registerNav = (
    result: { current: ReturnType<typeof useShortcuts> },
    key = 'alt+p',
    to = '/projects',
) => {
    act(() => {
        result.current.register({
            key,
            description: `Go to ${to}`,
            action: () => mockRouter.visit(to),
        });
    });
};

describe('useShortcuts', () => {
    test('throws when used outside of a ShortcutProvider', () => {
        expect(() => renderHook(() => useShortcuts())).toThrow(
            'useShortcuts must be used within a ShortcutProvider',
        );
    });

    test('starts with an empty registry and exposes openHelp', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        expect(result.current.shortcuts).toEqual([]);
        expect(typeof result.current.openHelp).toBe('function');
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
        const { result } = renderHook(() => useShortcuts(), { wrapper });
        registerNav(result);

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

    test('alt+p fires its registered action', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });
        registerNav(result);

        act(() => {
            dispatchKeydown({ key: 'p', altKey: true });
        });

        expect(mockRouter.visit).toHaveBeenCalledWith('/projects');
    });

    test('alt+b fires its registered action', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });
        registerNav(result, 'alt+b', '/');

        act(() => {
            dispatchKeydown({ key: 'b', altKey: true });
        });

        expect(mockRouter.visit).toHaveBeenCalledWith('/');
    });

    test('registerBatch is a no-op when every shortcut already exists', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });
        const batch: ShortcutDefinition[] = [
            { key: 'alt+p', description: 'Go to Projects', action: vi.fn() },
            { key: 'alt+b', description: 'Go to Dashboard', action: vi.fn() },
        ];
        act(() => {
            result.current.registerBatch(batch);
        });
        const before = result.current.shortcuts.length;

        act(() => {
            result.current.registerBatch(
                batch.map((shortcut) => ({ ...shortcut })),
            );
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

    test('openHelp opens the keyboard shortcuts help modal', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => result.current.openHelp());

        expect(mockOpenModal).toHaveBeenCalledWith(
            'Keyboard Shortcuts',
            undefined,
            expect.anything(),
        );
    });

    test('openHelp does not reopen the help modal while it is already open', () => {
        const marker = document.createElement('div');
        marker.className = 'shortcut-modal-marker';
        document.body.appendChild(marker);

        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => result.current.openHelp());

        expect(mockOpenModal).not.toHaveBeenCalled();
        document.body.removeChild(marker);
    });

    test('ctrl+f is left to the browser and is not prevented', () => {
        renderHook(() => useShortcuts(), { wrapper });
        const input = document.createElement('input');
        input.type = 'text';
        document.body.appendChild(input);
        const focusSpy = vi.spyOn(input, 'focus');

        let event!: KeyboardEvent;
        act(() => {
            event = dispatchKeydown({ key: 'f', ctrlKey: true });
        });

        expect(focusSpy).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
        document.body.removeChild(input);
    });

    describe('mod key', () => {
        const mockPlatform = (platform: string) =>
            vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);

        afterEach(() => vi.restoreAllMocks());

        const registerModK = (
            result: { current: ReturnType<typeof useShortcuts> },
            action: () => void,
        ) =>
            act(() => {
                result.current.register({
                    key: 'mod+k',
                    description: 'Mod K',
                    action,
                });
            });

        test('mod+k fires with Ctrl on Windows/Linux and not with Meta', () => {
            mockPlatform('Linux x86_64');
            const action = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });
            registerModK(result, action);

            act(() => dispatchKeydown({ key: 'k', metaKey: true }));
            expect(action).not.toHaveBeenCalled();

            act(() => dispatchKeydown({ key: 'k', ctrlKey: true }));
            expect(action).toHaveBeenCalledTimes(1);
        });

        test('mod+k fires with Cmd on macOS and not with Ctrl', () => {
            mockPlatform('MacIntel');
            const action = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });
            registerModK(result, action);

            act(() => dispatchKeydown({ key: 'k', ctrlKey: true }));
            expect(action).not.toHaveBeenCalled();

            act(() => dispatchKeydown({ key: 'k', metaKey: true }));
            expect(action).toHaveBeenCalledTimes(1);
        });

        test('modifier order in a binding does not matter', () => {
            mockPlatform('Linux x86_64');
            const action = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });

            act(() => {
                result.current.register({
                    key: 'shift+mod+j',
                    description: 'Unordered combo',
                    action,
                });
            });
            act(() =>
                dispatchKeydown({ key: 'J', ctrlKey: true, shiftKey: true }),
            );

            expect(action).toHaveBeenCalledTimes(1);
        });
    });

    test('alt combos match on event.code so macOS Option still works', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });
        registerNav(result, 'alt+p', '/projects');
        registerNav(result, 'alt+b', '/');

        act(() => dispatchKeydown({ key: 'π', code: 'KeyP', altKey: true }));
        expect(mockRouter.visit).toHaveBeenCalledWith('/projects');

        act(() => dispatchKeydown({ key: '∫', code: 'KeyB', altKey: true }));
        expect(mockRouter.visit).toHaveBeenCalledWith('/');
    });

    test('alt combos match digit keys via event.code', () => {
        const action = vi.fn();
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            result.current.register({
                key: 'alt+1',
                description: 'Alt digit',
                action,
            });
        });
        act(() => dispatchKeydown({ key: '¡', code: 'Digit1', altKey: true }));

        expect(action).toHaveBeenCalledTimes(1);
    });

    test('a definition with an array key fires for every binding', () => {
        const action = vi.fn();
        const { result } = renderHook(() => useShortcuts(), { wrapper });

        act(() => {
            result.current.register({
                key: ['g', 'ctrl+g'],
                description: 'Array key',
                action,
            });
        });
        act(() => dispatchKeydown({ key: 'g' }));
        act(() => dispatchKeydown({ key: 'g', ctrlKey: true }));

        expect(action).toHaveBeenCalledTimes(2);
    });

    test('register does not duplicate an identical array-key definition', () => {
        const { result } = renderHook(() => useShortcuts(), { wrapper });
        const before = result.current.shortcuts.length;
        const shortcut: ShortcutDefinition = {
            key: ['x', 'y'],
            description: 'Dup',
            action: vi.fn(),
        };

        act(() => {
            result.current.register(shortcut);
            result.current.register({ ...shortcut });
        });

        expect(result.current.shortcuts).toHaveLength(before + 1);
    });

    describe('scopes', () => {
        test('the most specific scope wins regardless of registration order', () => {
            const globalAction = vi.fn();
            const issueAction = vi.fn();
            const projectAction = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });

            act(() => {
                result.current.register({
                    key: 'z',
                    description: 'Issue z',
                    scope: 'issue',
                    action: issueAction,
                });
                result.current.register({
                    key: 'z',
                    description: 'Global z',
                    action: globalAction,
                });
                result.current.register({
                    key: 'z',
                    description: 'Project z',
                    scope: 'project',
                    action: projectAction,
                });
            });
            act(() => dispatchKeydown({ key: 'z' }));

            expect(issueAction).toHaveBeenCalledTimes(1);
            expect(projectAction).not.toHaveBeenCalled();
            expect(globalAction).not.toHaveBeenCalled();
        });

        test('a disabled specific shortcut falls back to the global one', () => {
            const globalAction = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });

            act(() => {
                result.current.register({
                    key: 'z',
                    description: 'Issue z',
                    scope: 'issue',
                    disabled: true,
                    action: vi.fn(),
                });
                result.current.register({
                    key: 'z',
                    description: 'Global z',
                    action: globalAction,
                });
            });
            act(() => dispatchKeydown({ key: 'z' }));

            expect(globalAction).toHaveBeenCalledTimes(1);
        });

        test('triggerShortcut also prefers the most specific scope', () => {
            const globalAction = vi.fn();
            const projectAction = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });

            act(() => {
                result.current.register({
                    key: 'q',
                    description: 'Global q',
                    action: globalAction,
                });
                result.current.register({
                    key: 'q',
                    description: 'Project q',
                    scope: 'project',
                    action: projectAction,
                });
            });
            act(() => result.current.triggerShortcut('q'));

            expect(projectAction).toHaveBeenCalledTimes(1);
            expect(globalAction).not.toHaveBeenCalled();
        });

        test('warns once in dev when a key is bound twice in the same scope', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const { result } = renderHook(() => useShortcuts(), { wrapper });

            act(() => {
                result.current.register({
                    key: 'w',
                    description: 'First w',
                    action: vi.fn(),
                });
                result.current.register({
                    key: ['w', 'v'],
                    description: 'Second w',
                    action: vi.fn(),
                });
            });
            act(() => {
                result.current.register({
                    key: 'u',
                    description: 'Unrelated',
                    action: vi.fn(),
                });
            });

            const conflicts = warn.mock.calls.filter(([msg]) =>
                String(msg).includes('"w"'),
            );
            expect(conflicts).toHaveLength(1);
            warn.mockRestore();
        });

        test('does not warn when the same key lives in different scopes', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const { result } = renderHook(() => useShortcuts(), { wrapper });

            act(() => {
                result.current.register({
                    key: 'w',
                    description: 'Global w',
                    action: vi.fn(),
                });
                result.current.register({
                    key: 'w',
                    description: 'Issue w',
                    scope: 'issue',
                    action: vi.fn(),
                });
            });

            expect(warn).not.toHaveBeenCalled();
            warn.mockRestore();
        });
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

    describe('key sequences', () => {
        const registerSequence = (
            result: { current: ReturnType<typeof useShortcuts> },
            key: string,
            action: () => void,
            description = key,
        ) =>
            act(() => {
                result.current.register({ key, description, action });
            });

        test('a sequence fires on its last key', () => {
            const action = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });
            registerSequence(result, 'g d', action);

            act(() => dispatchKeydown({ key: 'g' }));
            expect(action).not.toHaveBeenCalled();
            act(() => dispatchKeydown({ key: 'd' }));

            expect(action).toHaveBeenCalledTimes(1);
        });

        test('a sequence beats the single key it ends with', () => {
            const single = vi.fn();
            const sequence = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });
            registerSequence(result, 'p', single, 'Create project');
            registerSequence(result, 'g p', sequence, 'Go to projects');

            act(() => dispatchKeydown({ key: 'g' }));
            act(() => dispatchKeydown({ key: 'p' }));

            expect(sequence).toHaveBeenCalledTimes(1);
            expect(single).not.toHaveBeenCalled();

            act(() => dispatchKeydown({ key: 'p' }));
            expect(single).toHaveBeenCalledTimes(1);
        });

        test('an unrelated key just before the sequence does not spoil it', () => {
            const action = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });
            registerSequence(result, 'g n', action);

            act(() => dispatchKeydown({ key: 'x' }));
            act(() => dispatchKeydown({ key: 'g' }));
            act(() => dispatchKeydown({ key: 'n' }));

            expect(action).toHaveBeenCalledTimes(1);
        });

        test('only the last few keys are remembered', () => {
            const action = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });
            registerSequence(result, 'a b c d', action);

            ['a', 'b', 'c', 'd'].forEach((key) =>
                act(() => dispatchKeydown({ key })),
            );

            expect(action).not.toHaveBeenCalled();
        });

        test('a matched sequence resets, so the same keys do not fire twice', () => {
            const action = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });
            registerSequence(result, 'g d', action);

            act(() => dispatchKeydown({ key: 'g' }));
            act(() => dispatchKeydown({ key: 'd' }));
            act(() => dispatchKeydown({ key: 'd' }));

            expect(action).toHaveBeenCalledTimes(1);
        });

        test('a modifier combo clears a half-typed sequence', () => {
            const action = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });
            registerSequence(result, 'g d', action);

            act(() => dispatchKeydown({ key: 'g' }));
            act(() => dispatchKeydown({ key: 'z', ctrlKey: true }));
            act(() => dispatchKeydown({ key: 'd' }));

            expect(action).not.toHaveBeenCalled();
        });

        test('sequences are ignored while typing in an input', () => {
            const action = vi.fn();
            const { result } = renderHook(() => useShortcuts(), { wrapper });
            registerSequence(result, 'g d', action);
            const input = document.createElement('input');
            document.body.appendChild(input);

            ['g', 'd'].forEach((key) =>
                act(() => {
                    input.dispatchEvent(
                        new KeyboardEvent('keydown', {
                            key,
                            bubbles: true,
                            cancelable: true,
                        }),
                    );
                }),
            );

            expect(action).not.toHaveBeenCalled();
            document.body.removeChild(input);
        });
    });
});
