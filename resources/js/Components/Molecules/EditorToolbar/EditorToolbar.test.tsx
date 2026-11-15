import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '@tiptap/core';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MarkdownTable } from '@/utils/markdownTable';
import EditorToolbar from './EditorToolbar';
import { normalizeLinkHref } from './toolbarItems';

let editor: Editor | null = null;

afterEach(() => {
    editor?.destroy();
    editor = null;
});

const setup = (content = 'hello world', onPickImage?: () => void) => {
    editor = new Editor({
        element: document.createElement('div'),
        content,
        extensions: [
            StarterKit.configure({ link: { openOnClick: false } }),
            Markdown.configure({ html: false }),
            TaskList,
            TaskItem.configure({ nested: true }),
            TableKit.configure({ table: false }),
            MarkdownTable,
        ],
    });

    render(<EditorToolbar editor={editor} onPickImage={onPickImage} />);

    return editor;
};

const markdown = () => editor!.storage.markdown.getMarkdown() as string;
const button = (name: string | RegExp) => screen.getByRole('button', { name });

describe('EditorToolbar', () => {
    test('is a labelled toolbar with the formatting buttons', () => {
        setup();

        expect(
            screen.getByRole('toolbar', { name: 'Text formatting' }),
        ).toBeInTheDocument();
        expect(button('Bold')).toBeInTheDocument();
        expect(button('Heading 2')).toBeInTheDocument();
        expect(button('Task list')).toBeInTheDocument();
        expect(button('Table')).toBeInTheDocument();
    });

    test('the tooltip carries the keyboard shortcut', () => {
        setup();

        expect(button('Bold')).toHaveAttribute(
            'title',
            expect.stringMatching(/^Bold \((CTRL|⌘)\+B\)$/),
        );
    });

    test('bold wraps the selection and shows as pressed', async () => {
        setup();
        editor!.commands.selectAll();

        await userEvent.click(button('Bold'));

        expect(markdown()).toBe('**hello world**');
        expect(button('Bold')).toHaveAttribute('aria-pressed', 'true');

        await userEvent.click(button('Bold'));

        expect(markdown()).toBe('hello world');
        expect(button('Bold')).toHaveAttribute('aria-pressed', 'false');
    });

    test('headings and lists change the block under the caret', async () => {
        setup();

        await userEvent.click(button('Heading 1'));
        expect(markdown()).toBe('# hello world');

        await userEvent.click(button('Heading 1'));
        await userEvent.click(button('Bulleted list'));
        expect(markdown()).toBe('- hello world');
        expect(button('Bulleted list')).toHaveAttribute('aria-pressed', 'true');
    });

    test('a table cannot be inserted inside a table', async () => {
        setup();

        await userEvent.click(button('Table'));

        expect(button('Table')).toBeDisabled();
    });

    test('marks are unavailable inside a code block', async () => {
        setup();

        await userEvent.click(button('Code block'));

        expect(button('Bold')).toBeDisabled();
    });

    test('pressing a button does not take the focus from the editor', () => {
        setup();

        // `fireEvent` returns false when the event was default-prevented.
        expect(fireEvent.mouseDown(button('Bold'))).toBe(false);
    });

    test('has a single tab stop and the arrows move between buttons', async () => {
        setup();

        const stops = screen
            .getAllByRole('button')
            .filter((item) => item.getAttribute('tabindex') === '0');
        expect(stops).toHaveLength(1);

        await userEvent.tab();
        expect(button('Bold')).toHaveFocus();

        await userEvent.keyboard('{ArrowRight}');
        expect(button('Italic')).toHaveFocus();

        await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
        expect(button('Divider')).toHaveFocus();

        await userEvent.keyboard('{Home}');
        expect(button('Bold')).toHaveFocus();

        await userEvent.keyboard('{End}');
        expect(button('Divider')).toHaveFocus();
    });

    test('the image button only exists when uploads are on', async () => {
        const onPickImage = vi.fn();
        setup('x', onPickImage);

        await userEvent.click(button('Image'));

        expect(onPickImage).toHaveBeenCalledTimes(1);
    });

    test('there is no image button without an uploader', () => {
        setup();

        expect(
            screen.queryByRole('button', { name: 'Image' }),
        ).not.toBeInTheDocument();
    });
});

describe('EditorToolbar link field', () => {
    test('links the selected text', async () => {
        setup();
        editor!.commands.selectAll();

        await userEvent.click(button('Link'));
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Link address' }),
            'example.com{Enter}',
        );

        expect(markdown()).toBe('[hello world](https://example.com)');
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    test('with nothing selected the address itself becomes the link', async () => {
        setup('');

        await userEvent.click(button('Link'));
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Link address' }),
            'https://example.com{Enter}',
        );

        // Text identical to the address is written as an autolink.
        expect(markdown()).toBe('<https://example.com>');
    });

    test('a caret next to an existing link adds a link instead of replacing the linked text', async () => {
        setup('hello [site](https://old.example)');
        // Right before "site", where the link starts.
        editor!.commands.setTextSelection(7);

        await userEvent.click(button('Link'));
        await userEvent.type(
            screen.getByRole('textbox', { name: 'Link address' }),
            'new.example{Enter}',
        );

        expect(markdown()).toContain('[site](https://old.example)');
        expect(markdown()).toContain('https://new.example');
    });

    test('an unsafe address is refused and flagged', async () => {
        setup();
        editor!.commands.selectAll();

        await userEvent.click(button('Link'));
        const field = screen.getByRole('textbox', { name: 'Link address' });
        await userEvent.type(field, 'javascript:alert(1){Enter}');

        expect(field).toHaveAttribute('aria-invalid', 'true');
        expect(markdown()).toBe('hello world');
    });

    test('Escape closes only the field and hands focus back', async () => {
        setup();
        const outer = vi.fn();
        document.body.addEventListener('keydown', outer);

        await userEvent.click(button('Link'));
        await userEvent.keyboard('{Escape}');

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(button('Link')).toBeInTheDocument();
        // stopPropagation: the editing wrapper never sees the Escape.
        expect(outer).not.toHaveBeenCalled();

        document.body.removeEventListener('keydown', outer);
    });

    test('an existing link can be edited and removed', async () => {
        setup('[site](https://old.example)');
        editor!.commands.setTextSelection(2);

        await userEvent.click(button('Link'));
        const field = screen.getByRole('textbox', { name: 'Link address' });
        expect(field).toHaveValue('https://old.example');

        await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

        expect(markdown()).toBe('site');
    });

    test('Cancel closes the field without changing anything', async () => {
        setup();

        await userEvent.click(button('Link'));
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(markdown()).toBe('hello world');
    });
});

describe('normalizeLinkHref', () => {
    test.each([
        ['https://a.b', 'https://a.b'],
        ['http://a.b/x?y=1', 'http://a.b/x?y=1'],
        ['example.com', 'https://example.com'],
        ['localhost:3000/x', 'https://localhost:3000/x'],
        ['mailto:me@a.b', 'mailto:me@a.b'],
        ['tel:+48123', 'tel:+48123'],
        ['/projects/1', '/projects/1'],
        ['#section', '#section'],
        ['  spaced.dev  ', 'https://spaced.dev'],
    ])('%s -> %s', (input, expected) => {
        expect(normalizeLinkHref(input)).toBe(expected);
    });

    test.each([
        '',
        '   ',
        'javascript:alert(1)',
        'data:text/html,x',
        'a b.com',
    ])('refuses %j', (input) => {
        expect(normalizeLinkHref(input)).toBeNull();
    });
});
