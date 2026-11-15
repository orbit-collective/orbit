import { act, renderHook } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SlashCommands } from './slashExtension';
import { useSlashCommands } from './useSlashCommands';

const rect = { top: 100, bottom: 120, left: 50 } as DOMRect;

const keyEvent = (key: string) => {
    const event = new KeyboardEvent('keydown', { key });
    vi.spyOn(event, 'stopPropagation');

    return event;
};

const setup = (options = {}) =>
    renderHook(() =>
        useSlashCommands({
            canInsertImage: true,
            onPickImage: vi.fn(),
            ...options,
        }),
    );

const renderer = (hook: ReturnType<typeof setup>) =>
    hook.result.current.slashSuggestion.render!()!;

const start = (
    hook: ReturnType<typeof setup>,
    items: unknown[],
    command = vi.fn(),
) =>
    act(() =>
        renderer(hook).onStart!({
            items,
            query: '',
            command,
            clientRect: () => rect,
        } as never),
    );

const blocks = [
    {
        id: 'heading_1',
        icon: 'Heading1',
        titleKey: 'editable_markdown.slash.heading_1.title',
        descriptionKey: 'editable_markdown.slash.heading_1.description',
    },
    {
        id: 'table',
        icon: 'Table',
        titleKey: 'editable_markdown.slash.table.title',
        descriptionKey: 'editable_markdown.slash.table.description',
    },
];

describe('useSlashCommands menu', () => {
    test('shows the matching blocks, translated, under the caret', () => {
        const hook = setup();

        start(hook, blocks);

        expect(hook.result.current.menu).toMatchObject({
            activeIndex: 0,
            position: { top: 124, lineTop: 96, left: 50 },
            items: [
                { id: 'heading_1', title: 'Heading 1' },
                { id: 'table', title: 'Table' },
            ],
        });
    });

    test('hides while nothing matches, and comes back with the next update', () => {
        const hook = setup();

        start(hook, []);
        expect(hook.result.current.menu).toBeNull();

        start(hook, blocks);
        expect(hook.result.current.menu).not.toBeNull();
    });

    test('hides without a caret to anchor to', () => {
        const hook = setup();

        act(() =>
            renderer(hook).onStart!({
                items: blocks,
                query: '',
                command: vi.fn(),
                clientRect: () => null,
            } as never),
        );

        expect(hook.result.current.menu).toBeNull();
    });

    test('the arrows move the active row and wrap around', () => {
        const hook = setup();
        start(hook, blocks);

        act(() => {
            renderer(hook).onKeyDown!({
                event: keyEvent('ArrowDown'),
            } as never);
        });
        expect(hook.result.current.menu?.activeIndex).toBe(1);

        act(() => {
            renderer(hook).onKeyDown!({
                event: keyEvent('ArrowDown'),
            } as never);
        });
        expect(hook.result.current.menu?.activeIndex).toBe(0);

        act(() => {
            renderer(hook).onKeyDown!({ event: keyEvent('ArrowUp') } as never);
        });
        expect(hook.result.current.menu?.activeIndex).toBe(1);
    });

    test('Enter and Tab insert the active block', () => {
        const command = vi.fn();
        const hook = setup();
        start(hook, blocks, command);

        let handled = false;
        act(() => {
            renderer(hook).onKeyDown!({
                event: keyEvent('ArrowDown'),
            } as never);
        });
        act(() => {
            handled = renderer(hook).onKeyDown!({
                event: keyEvent('Enter'),
            } as never) as boolean;
        });

        expect(handled).toBe(true);
        expect(command).toHaveBeenCalledWith(blocks[1]);

        act(() => {
            renderer(hook).onKeyDown!({ event: keyEvent('Tab') } as never);
        });
        expect(command).toHaveBeenCalledTimes(2);
    });

    test('other keys are left to the editor', () => {
        const hook = setup();
        start(hook, blocks);

        expect(
            renderer(hook).onKeyDown!({ event: keyEvent('a') } as never),
        ).toBe(false);
    });

    test('Escape closes the menu without cancelling the edit, even with no menu showing', () => {
        const hook = setup();
        start(hook, blocks);

        const event = keyEvent('Escape');
        act(() => {
            renderer(hook).onKeyDown!({ event } as never);
        });

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(hook.result.current.menu).toBeNull();

        const noMenu = keyEvent('Escape');
        expect(renderer(hook).onKeyDown!({ event: noMenu } as never)).toBe(
            true,
        );
        expect(noMenu.stopPropagation).toHaveBeenCalled();
    });

    test('hovering sets the active row, exiting closes the menu', () => {
        const hook = setup();
        start(hook, blocks);

        act(() => hook.result.current.setActiveIndex(1));
        expect(hook.result.current.menu?.activeIndex).toBe(1);

        act(() => renderer(hook).onExit!({} as never));
        expect(hook.result.current.menu).toBeNull();

        act(() => hook.result.current.setActiveIndex(0));
        expect(hook.result.current.menu).toBeNull();
    });

    test('the menu follows the caret when a container scrolls', () => {
        const hook = setup();
        let caret = { top: 100, bottom: 120, left: 50 } as DOMRect;

        act(() =>
            renderer(hook).onStart!({
                items: blocks,
                query: '',
                command: vi.fn(),
                clientRect: () => caret,
            } as never),
        );
        expect(hook.result.current.menu?.position.top).toBe(124);

        caret = { top: 40, bottom: 60, left: 50 } as DOMRect;
        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });

        expect(hook.result.current.menu?.position).toEqual({
            top: 64,
            lineTop: 36,
            left: 50,
        });
    });

    test('stops listening for scrolls once the menu is closed', () => {
        const remove = vi.spyOn(window, 'removeEventListener');
        const hook = setup();
        start(hook, blocks);

        act(() => renderer(hook).onExit!({} as never));

        expect(remove).toHaveBeenCalledWith(
            'scroll',
            expect.any(Function),
            true,
        );
        remove.mockRestore();
    });

    test('closeMenu hides an open menu', () => {
        const hook = setup();
        start(hook, blocks);
        expect(hook.result.current.menu).not.toBeNull();

        act(() => hook.result.current.closeMenu());

        expect(hook.result.current.menu).toBeNull();
    });

    test('select ignores an index with no block', () => {
        const command = vi.fn();
        const hook = setup();
        start(hook, blocks, command);

        act(() => hook.result.current.menu?.select(9));

        expect(command).not.toHaveBeenCalled();
    });
});

let editor: Editor | null = null;

afterEach(() => {
    editor?.destroy();
    editor = null;
});

const withEditor = (options = {}, content = '') => {
    const hook = setup(options);

    editor = new Editor({
        element: document.createElement('div'),
        content,
        extensions: [
            StarterKit,
            Markdown.configure({ html: false }),
            SlashCommands.configure({
                suggestion: hook.result.current.slashSuggestion,
            }),
        ],
    });

    return hook;
};

const type = async (text: string) => {
    await act(async () => {
        editor!.commands.insertContent({ type: 'text', text });
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
};

describe('useSlashCommands in a real editor', () => {
    test('items offer the image block only when images can be inserted', () => {
        const withImages = withEditor();
        const offered = withImages.result.current.slashSuggestion.items!({
            query: '',
            editor: editor!,
            signal: new AbortController().signal,
        }) as { id: string }[];
        expect(offered.map((block) => block.id)).toContain('image');
        editor!.destroy();

        const withoutImages = withEditor({ canInsertImage: false });
        const without = withoutImages.result.current.slashSuggestion.items!({
            query: '',
            editor: editor!,
            signal: new AbortController().signal,
        }) as { id: string }[];
        expect(without.map((block) => block.id)).not.toContain('image');
    });

    test('typing "/" at the start of a line opens the menu and narrows with the query', async () => {
        // jsdom has no layout, so the caret rectangle must be faked.
        Range.prototype.getBoundingClientRect = () => rect;
        Range.prototype.getClientRects = () =>
            ({ item: () => rect, length: 1, 0: rect }) as never;

        const hook = withEditor();

        await type('/');
        expect(hook.result.current.menu?.items.length).toBeGreaterThan(5);

        await type('tab');
        expect(hook.result.current.menu?.items.map((item) => item.id)).toEqual([
            'table',
        ]);
    });

    test('picking a block replaces the typed text', async () => {
        Range.prototype.getBoundingClientRect = () => rect;
        Range.prototype.getClientRects = () =>
            ({ item: () => rect, length: 1, 0: rect }) as never;

        const hook = withEditor();

        await type('/h2');
        act(() => hook.result.current.menu?.select(0));
        await type('Title');

        expect(editor!.storage.markdown.getMarkdown()).toBe('## Title');
    });

    test('picking the image block asks for the file picker', async () => {
        Range.prototype.getBoundingClientRect = () => rect;
        Range.prototype.getClientRects = () =>
            ({ item: () => rect, length: 1, 0: rect }) as never;
        const onPickImage = vi.fn();
        const hook = withEditor({ onPickImage });

        await type('/image');
        act(() => hook.result.current.menu?.select(0));

        expect(onPickImage).toHaveBeenCalledTimes(1);
        expect(editor!.storage.markdown.getMarkdown().trim()).toBe('');
    });

    test('a slash after a letter or inside a code block is just a slash', async () => {
        Range.prototype.getBoundingClientRect = () => rect;
        Range.prototype.getClientRects = () =>
            ({ item: () => rect, length: 1, 0: rect }) as never;

        const hook = withEditor();

        await type('and/or');
        expect(hook.result.current.menu).toBeNull();

        editor!.commands.clearContent();
        editor!.commands.setCodeBlock();
        await type('/');
        expect(hook.result.current.menu).toBeNull();
    });
});
