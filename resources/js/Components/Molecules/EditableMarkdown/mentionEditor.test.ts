import { act, renderHook } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import axios from 'axios';
import { Markdown } from 'tiptap-markdown';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createMentionNode, UserMention } from '@/utils/tiptapMentions';
import { useMentionSuggestions } from './useMentionSuggestions';

vi.mock('axios');

const users = [
    { id: 1, name: 'Jane Cooper' },
    { id: 2, name: 'Bob' },
] as never;

let editor: Editor | null = null;

/** A real Tiptap editor wired to the real suggestion hook, as EditableMarkdown does. */
const setup = (content = '') => {
    const hook = renderHook(() =>
        useMentionSuggestions({ users, projectId: 7 }),
    );

    editor = new Editor({
        element: document.createElement('div'),
        content,
        extensions: [
            StarterKit,
            Markdown.configure({ html: false }),
            UserMention.configure({
                suggestion: hook.result.current.userSuggestion,
            }),
            createMentionNode('issue').configure({
                projectId: 7,
                suggestion: hook.result.current.issueSuggestion,
            }),
        ],
    });

    return hook;
};

const type = async (text: string) => {
    await act(async () => {
        editor!.commands.focus('end');
        editor!.commands.insertContent(text);
        // Suggestion resolves its items asynchronously.
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
};

const markdown = () => editor!.storage.markdown.getMarkdown() as string;

beforeEach(() => {
    globalThis.route = vi.fn(
        (name: string, id: unknown) => `/${name}/${id}`,
    ) as unknown as typeof globalThis.route;
});

afterEach(() => {
    editor?.destroy();
    editor = null;
});

describe('mentions in a real editor', () => {
    test('typing "@" opens the member menu and picking one stores a user token', async () => {
        const hook = setup();

        await type('hi @ja');

        expect(hook.result.current.menu).toMatchObject({ kind: 'user' });
        expect(hook.result.current.menu?.users).toEqual([users[0]]);

        act(() => hook.result.current.menu!.select(0));

        expect(markdown()).toBe('hi @[Jane Cooper](1) ');
        expect(hook.result.current.menu).toBeNull();
    });

    test('typing "#" and a number searches issues and stores an issue token', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: [{ id: 201, number: 3, title: 'Login bug' }],
        });
        const hook = setup();

        await type('see #3');

        expect(hook.result.current.menu).toMatchObject({ kind: 'issue' });

        act(() => hook.result.current.menu!.select(0));

        expect(markdown()).toBe('see #[Login bug](201:3) ');
    });

    test('an email address does not open the member menu', async () => {
        const hook = setup();

        await type('mail jane@example.com');

        expect(hook.result.current.menu).toBeNull();
    });

    test('the menu closes when the trigger text is deleted', async () => {
        const hook = setup();

        await type('hi @b');
        expect(hook.result.current.menu?.users).toEqual([users[1]]);

        await act(async () => {
            editor!.commands.deleteRange({
                from: editor!.state.doc.content.size - 3,
                to: editor!.state.doc.content.size - 1,
            });
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(hook.result.current.menu).toBeNull();
    });

    test('existing mentions in loaded content survive a round trip untouched', () => {
        setup('@[Bob](2) fix #[Login bug](201:3)');

        expect(markdown()).toBe('@[Bob](2) fix #[Login bug](201:3)');
    });
});
