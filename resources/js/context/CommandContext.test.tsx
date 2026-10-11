import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Command } from '@/types/Commands';

vi.mock('@/context/ModalContext', () => ({
    useModal: () => ({ openModal: vi.fn() }),
}));

vi.mock('@/Components/Organisms/ShortcutHelpModal/ShortcutHelpModal', () => ({
    ShortcutHelpModal: () => null,
}));

import { useCommands } from '@/hooks/useCommands';
import { CommandProvider, useCommandPalette } from './CommandContext';
import { ShortcutProvider, useShortcuts } from './ShortcutContext';

const wrapper = ({ children }: { children: ReactNode }) => (
    <ShortcutProvider>
        <CommandProvider>{children}</CommandProvider>
    </ShortcutProvider>
);

const makeCommand = (
    overrides: Partial<Command> & Pick<Command, 'id'>,
): Command => ({
    title: overrides.id,
    group: 'navigation',
    icon: 'Search',
    ...overrides,
});

const dispatchKeydown = (init: KeyboardEventInit) => {
    window.dispatchEvent(
        new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            ...init,
        }),
    );
};

const setup = (commands: Command[] = []) =>
    renderHook(
        () => ({
            palette: useCommands(commands),
            shortcuts: useShortcuts(),
        }),
        { wrapper },
    );

describe('CommandContext', () => {
    test('useCommandPalette throws outside a CommandProvider', () => {
        expect(() => renderHook(() => useCommandPalette())).toThrow(
            'useCommandPalette must be used within a CommandProvider',
        );
    });

    describe('registry', () => {
        test('useCommands registers commands and removes them on unmount', () => {
            const commands = [
                makeCommand({ id: 'a' }),
                makeCommand({ id: 'b' }),
            ];
            const { result, unmount } = renderHook(
                () => ({
                    registered: useCommands(commands),
                    palette: useCommandPalette(),
                }),
                { wrapper },
            );

            expect(result.current.palette.commands.map((c) => c.id)).toEqual([
                'a',
                'b',
            ]);

            unmount();
        });

        test('cleanup removes exactly the commands that were registered', () => {
            const { result } = setup();
            const first = [makeCommand({ id: 'a' })];
            const second = [makeCommand({ id: 'b' })];

            let unregisterFirst = () => {};
            act(() => {
                unregisterFirst = result.current.palette.register(first);
                result.current.palette.register(second);
            });
            expect(result.current.palette.commands).toHaveLength(2);

            act(() => unregisterFirst());
            expect(result.current.palette.commands.map((c) => c.id)).toEqual([
                'b',
            ]);
        });

        test('registering an empty list is a no-op', () => {
            const { result } = setup();

            act(() => {
                result.current.palette.register([])();
            });

            expect(result.current.palette.commands).toEqual([]);
        });

        test('the latest registration wins when two share an id', () => {
            const { result } = setup();

            act(() => {
                result.current.palette.register([
                    makeCommand({ id: 'dup', title: 'Old' }),
                ]);
                result.current.palette.register([
                    makeCommand({ id: 'dup', title: 'New' }),
                ]);
            });

            expect(result.current.palette.commands).toHaveLength(1);
            expect(result.current.palette.commands[0].title).toBe('New');
        });
    });

    describe('open state', () => {
        test('openPalette / closePalette / togglePalette', () => {
            const { result } = setup();
            expect(result.current.palette.isOpen).toBe(false);

            act(() => result.current.palette.openPalette());
            expect(result.current.palette.isOpen).toBe(true);
            expect(result.current.palette.mode).toBe('default');

            act(() => result.current.palette.closePalette());
            expect(result.current.palette.isOpen).toBe(false);

            act(() => result.current.palette.togglePalette());
            expect(result.current.palette.isOpen).toBe(true);
            act(() => result.current.palette.togglePalette());
            expect(result.current.palette.isOpen).toBe(false);
        });

        test('openPalette stores the mode and clears nested pages', () => {
            const { result } = setup();

            act(() => {
                result.current.palette.openPalette();
                result.current.palette.pushPage({
                    id: 'x',
                    title: 'X',
                    commands: [],
                });
            });
            expect(result.current.palette.pages).toHaveLength(1);

            act(() => result.current.palette.openPalette('search'));
            expect(result.current.palette.mode).toBe('search');
            expect(result.current.palette.pages).toEqual([]);
        });

        test('closePalette clears nested pages', () => {
            const { result } = setup();

            act(() => {
                result.current.palette.openPalette();
                result.current.palette.pushPage({
                    id: 'x',
                    title: 'X',
                    commands: [],
                });
            });
            act(() => result.current.palette.closePalette());

            expect(result.current.palette.pages).toEqual([]);
        });

        test('pushPage / popPage maintain the page stack', () => {
            const { result } = setup();
            const page = (id: string) => ({ id, title: id, commands: [] });

            act(() => {
                result.current.palette.pushPage(page('one'));
                result.current.palette.pushPage(page('two'));
            });
            expect(result.current.palette.pages.map((p) => p.id)).toEqual([
                'one',
                'two',
            ]);

            act(() => result.current.palette.popPage());
            expect(result.current.palette.pages.map((p) => p.id)).toEqual([
                'one',
            ]);
        });
    });

    describe('runCommand', () => {
        test('runs a registered command by id and closes the palette', () => {
            const perform = vi.fn();
            const { result } = setup([makeCommand({ id: 'go', perform })]);

            act(() => result.current.palette.openPalette());
            act(() => result.current.palette.runCommand('go'));

            expect(perform).toHaveBeenCalledTimes(1);
            expect(result.current.palette.isOpen).toBe(false);
        });

        test('ignores an unknown id', () => {
            const { result } = setup();

            expect(() =>
                act(() => result.current.palette.runCommand('nope')),
            ).not.toThrow();
        });

        test('does not run a command whose when() is false', () => {
            const perform = vi.fn();
            const { result } = setup([
                makeCommand({ id: 'hidden', perform, when: () => false }),
            ]);

            act(() => result.current.palette.runCommand('hidden'));

            expect(perform).not.toHaveBeenCalled();
        });

        test('runs a command object that is not in the registry', () => {
            const perform = vi.fn();
            const { result } = setup();

            act(() =>
                result.current.palette.runCommand(
                    makeCommand({ id: 'nested', perform }),
                ),
            );

            expect(perform).toHaveBeenCalledTimes(1);
        });

        test('a command with children pushes a page instead of performing', () => {
            const perform = vi.fn();
            const child = makeCommand({ id: 'child' });
            const { result } = setup([
                makeCommand({
                    id: 'parent',
                    title: 'Parent',
                    perform,
                    children: () => [child],
                }),
            ]);

            act(() => result.current.palette.openPalette());
            act(() => result.current.palette.runCommand('parent'));

            expect(perform).not.toHaveBeenCalled();
            expect(result.current.palette.isOpen).toBe(true);
            expect(result.current.palette.pages).toEqual([
                { id: 'parent', title: 'Parent', commands: [child] },
            ]);
        });

        test('a command with children opens a closed palette on its page', () => {
            const { result } = setup([
                makeCommand({
                    id: 'parent',
                    title: 'Parent',
                    children: () => [makeCommand({ id: 'child' })],
                }),
            ]);

            act(() => result.current.palette.runCommand('parent'));

            expect(result.current.palette.isOpen).toBe(true);
            expect(result.current.palette.pages).toHaveLength(1);
        });
    });

    describe('shortcut bridge', () => {
        test('a command shortcut triggers the command on keydown', () => {
            const perform = vi.fn();
            const { result } = setup([
                makeCommand({ id: 'go', title: 'Go', shortcut: 'g', perform }),
            ]);

            expect(
                result.current.shortcuts.shortcuts.some(
                    (s) => s.description === 'Go' && s.key === 'g',
                ),
            ).toBe(true);

            act(() => dispatchKeydown({ key: 'g' }));
            expect(perform).toHaveBeenCalledTimes(1);
        });

        test('the shortcut stops existing when the command is unregistered', () => {
            const perform = vi.fn();
            const { result } = setup();
            const hasShortcut = () =>
                result.current.shortcuts.shortcuts.some(
                    (s) => s.description === 'Go',
                );

            let unregister = () => {};
            act(() => {
                unregister = result.current.palette.register([
                    makeCommand({
                        id: 'go',
                        title: 'Go',
                        shortcut: 'g',
                        perform,
                    }),
                ]);
            });
            expect(hasShortcut()).toBe(true);

            act(() => unregister());
            expect(hasShortcut()).toBe(false);

            act(() => dispatchKeydown({ key: 'g' }));
            expect(perform).not.toHaveBeenCalled();
        });

        test('array shortcuts, scope and explicit category carry over', () => {
            const { result } = setup([
                makeCommand({
                    id: 'issue.create',
                    title: 'Create issue',
                    group: 'creation',
                    shortcut: ['c', 'ctrl+i'],
                    scope: 'project',
                }),
                makeCommand({
                    id: 'view.board',
                    title: 'Board view',
                    shortcut: '2',
                    category: 'View',
                }),
                makeCommand({
                    id: 'help',
                    title: 'Help',
                    group: 'help',
                    shortcut: 'h',
                }),
            ]);

            const byTitle = (title: string) =>
                result.current.shortcuts.shortcuts.find(
                    (s) => s.description === title,
                );

            expect(byTitle('Create issue')).toMatchObject({
                key: ['c', 'ctrl+i'],
                scope: 'project',
                category: 'Creation',
            });
            expect(byTitle('Board view')?.category).toBe('View');
            expect(byTitle('Help')?.category).toBe('Action');
        });

        test('a shortcut does nothing while the command when() is false', () => {
            const perform = vi.fn();
            const { result } = setup([
                makeCommand({
                    id: 'go',
                    title: 'Go',
                    shortcut: 'g',
                    perform,
                    when: () => false,
                }),
            ]);

            act(() => dispatchKeydown({ key: 'g' }));

            expect(perform).not.toHaveBeenCalled();
            expect(result.current.palette.isOpen).toBe(false);
        });

        test('mod+k toggles the palette', () => {
            const { result } = setup();

            act(() => dispatchKeydown({ key: 'k', ctrlKey: true }));
            expect(result.current.palette.isOpen).toBe(true);

            act(() => result.current.palette.closePalette());
            expect(result.current.palette.isOpen).toBe(false);
        });

        test('"/" opens the palette in search mode', () => {
            const { result } = setup();

            act(() => dispatchKeydown({ key: '/' }));

            expect(result.current.palette.isOpen).toBe(true);
            expect(result.current.palette.mode).toBe('search');
        });
    });
});
