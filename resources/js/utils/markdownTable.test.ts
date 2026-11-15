import { Editor } from '@tiptap/core';
import { TableKit } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { afterEach, describe, expect, test } from 'vitest';
import { MarkdownTable } from './markdownTable';

let editor: Editor | null = null;

afterEach(() => {
    editor?.destroy();
    editor = null;
});

const create = (content = '') => {
    editor = new Editor({
        element: document.createElement('div'),
        content,
        extensions: [
            StarterKit,
            Markdown.configure({ html: false }),
            TableKit.configure({ table: false }),
            MarkdownTable,
        ],
    });

    return editor;
};

const markdownOf = (current: Editor) =>
    current.storage.markdown.getMarkdown() as string;

/** Saves, reloads the saved text and saves again, like an edit followed by a page load. */
const roundTrip = (markdown: string) => {
    const saved = markdownOf(create(markdown));
    editor!.destroy();

    return { saved, reloaded: markdownOf(create(saved)) };
};

const tableRows = (current: Editor) =>
    (
        current.getJSON().content?.find((node) => node.type === 'table') as
            | { content: { content: unknown[] }[] }
            | undefined
    )?.content;

describe('markdown tables', () => {
    test('a plain table is written as GFM and survives a reload', () => {
        const markdown = '| a | b |\n| --- | --- |\n| 1 | 2 |\n';

        expect(roundTrip(markdown)).toEqual({
            saved: markdown,
            reloaded: markdown,
        });
    });

    test('an inserted table with empty cells survives a reload', () => {
        const current = create();
        current.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
        const saved = markdownOf(current);
        current.destroy();

        expect(saved).toBe(
            '|  |  |  |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |\n',
        );
        expect(tableRows(create(saved))).toHaveLength(3);
    });

    test('a table without a header row gets an empty one instead of vanishing', () => {
        const current = create();
        current.commands.insertTable({
            rows: 2,
            cols: 2,
            withHeaderRow: false,
        });
        current.commands.insertContent({ type: 'text', text: 'x' });
        const saved = markdownOf(current);
        current.destroy();

        expect(saved).toBe('|  |  |\n| --- | --- |\n| x |  |\n|  |  |\n');
        expect(saved).not.toContain('[table]');
        expect(tableRows(create(saved))).toHaveLength(3);
    });

    test('a cell with several lines becomes one line', () => {
        const current = create();
        current.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
        current.commands.insertContent({ type: 'text', text: 'one' });
        current.commands.splitBlock();
        current.commands.insertContent({ type: 'text', text: 'two' });
        current.commands.setHardBreak();
        current.commands.insertContent({ type: 'text', text: 'three' });
        const saved = markdownOf(current);
        current.destroy();

        expect(saved.split('\n')[0]).toBe('| one two three |  |');
        expect(tableRows(create(saved))).toHaveLength(2);
    });

    test('a pipe in a cell is escaped so the table does not break', () => {
        const current = create();
        current.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
        current.commands.insertContent({ type: 'text', text: 'a | b' });
        const saved = markdownOf(current);
        current.destroy();

        expect(saved.split('\n')[0]).toBe('| a \\| b |  |');

        const reloaded = create(saved);
        expect(tableRows(reloaded)).toHaveLength(2);
        expect(reloaded.getText()).toContain('a | b');
    });

    test('inline formatting inside a cell is kept', () => {
        const { saved, reloaded } = roundTrip(
            '| **bold** | [link](http://x.y) |\n| --- | --- |\n| `code` | *it* |\n',
        );

        expect(saved).toBe(reloaded);
        expect(saved).toContain('**bold**');
        expect(saved).toContain('`code`');
    });

    test('a merged cell keeps its text and pads the columns it covered', () => {
        const current = create(
            '| a | b | c |\n| --- | --- | --- |\n| 1 | 2 | 3 |\n',
        );
        current.commands.setTextSelection(4);
        current.commands.mergeCells();
        const saved = markdownOf(current);

        expect(saved).not.toContain('[table]');
        expect(saved.split('\n')[0].split('|').length).toBe(5);
    });

    test('text around a table is untouched', () => {
        const markdown =
            'Before\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nAfter';

        expect(roundTrip(markdown).saved).toBe(`${markdown}`);
    });
});
