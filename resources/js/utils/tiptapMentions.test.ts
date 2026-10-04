import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { afterEach, describe, expect, test } from 'vitest';
import {
    createMentionNode,
    sanitizeMentionLabel,
    UserMention,
} from './tiptapMentions';

const IssueMention = createMentionNode('issue');
let editor: Editor | null = null;

const markdownRoundTrip = (markdown: string) => {
    editor = new Editor({
        element: document.createElement('div'),
        extensions: [
            StarterKit,
            Markdown.configure({ html: false }),
            UserMention,
            IssueMention,
        ],
        content: markdown,
    });

    return editor.storage.markdown.getMarkdown() as string;
};

const mentionNodes = () => {
    const found: { type: string; attrs: Record<string, unknown> }[] = [];

    editor?.state.doc.descendants((node) => {
        if (node.type.name.endsWith('Mention')) {
            found.push({ type: node.type.name, attrs: node.attrs });
        }
    });

    return found;
};

afterEach(() => {
    editor?.destroy();
    editor = null;
});

describe('description mentions', () => {
    test('a user token becomes a mention node and serializes back unchanged', () => {
        const markdown = 'ping @[Jane Cooper](5) please';

        expect(markdownRoundTrip(markdown)).toBe(markdown);
        expect(mentionNodes()).toEqual([
            {
                type: 'userMention',
                attrs: { id: '5', label: 'Jane Cooper' },
            },
        ]);
    });

    test('an issue token keeps its id and project number', () => {
        const markdown = 'see #[Login bug](201:3)';

        expect(markdownRoundTrip(markdown)).toBe(markdown);
        expect(mentionNodes()[0]).toEqual({
            type: 'issueMention',
            attrs: { id: '201', label: 'Login bug', number: '3' },
        });
    });

    test('an older issue token without a number still loads and is kept as is', () => {
        const markdown = 'see #[Old issue](42)';

        expect(markdownRoundTrip(markdown)).toBe(markdown);
        expect(mentionNodes()[0].attrs).toMatchObject({
            id: '42',
            label: 'Old issue',
        });
    });

    test('several mentions in one paragraph are all kept', () => {
        const markdown = '@[A](1) and @[B](2) on #[C](9:4)';

        expect(markdownRoundTrip(markdown)).toBe(markdown);
        expect(mentionNodes()).toHaveLength(3);
    });

    test('a plain "@name" or "#12" in text is not turned into a mention', () => {
        markdownRoundTrip('mail me @home, issue #12 is open');

        expect(mentionNodes()).toHaveLength(0);
    });

    test('a heading is still a heading, not an issue mention', () => {
        const markdown = markdownRoundTrip('# Title');

        expect(markdown).toBe('# Title');
        expect(mentionNodes()).toHaveLength(0);
    });

    test('a label containing html is escaped, not rendered', () => {
        markdownRoundTrip('@[<b>x</b>](3)');

        const container = document.createElement('div');
        container.innerHTML = editor?.getHTML() ?? '';

        expect(container.querySelector('b')).toBeNull();
        expect(container.textContent).toBe('@<b>x</b>');
        expect(mentionNodes()[0].attrs.label).toBe('<b>x</b>');
    });
});

describe('sanitizeMentionLabel', () => {
    test('strips brackets that would break the token', () => {
        expect(sanitizeMentionLabel('Fix [urgent] bug', '#1')).toBe(
            'Fix urgent bug',
        );
    });

    test('falls back when nothing is left', () => {
        expect(sanitizeMentionLabel('[]', '#7')).toBe('#7');
    });
});
