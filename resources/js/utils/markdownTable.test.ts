import { Editor } from '@tiptap/core';
import { TableKit } from '@tiptap/extension-table';
import { CellSelection } from '@tiptap/pm/tables';
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

    describe('merged cells', () => {
        const GRID =
            '| a | b | c |\n| --- | --- | --- |\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |\n';

        /** Positions of every cell, by row and column (merging needs a cell selection). */
        const cellPositions = (current: Editor) => {
            const rows: number[][] = [];

            current.state.doc.descendants((node, pos) => {
                if (node.type.name === 'tableRow') rows.push([]);
                if (['tableCell', 'tableHeader'].includes(node.type.name)) {
                    rows[rows.length - 1].push(pos);
                }
            });

            return rows;
        };

        /** Merges the block of cells from `from` to `to` ([row, column]) for real. */
        const merge = (
            current: Editor,
            from: [number, number],
            to: [number, number],
        ) => {
            const cells = cellPositions(current);

            current.view.dispatch(
                current.state.tr.setSelection(
                    CellSelection.create(
                        current.state.doc,
                        cells[from[0]][from[1]],
                        cells[to[0]][to[1]],
                    ),
                ),
            );

            return current.commands.mergeCells();
        };

        test('a cell spanning columns keeps its text and pads the columns it covered', () => {
            const current = create(GRID);

            expect(merge(current, [1, 0], [1, 1])).toBe(true);

            const saved = markdownOf(current).split('\n');

            // "1" and "2" are joined into the merged cell, column 2 is untouched.
            expect(saved[0]).toBe('| a | b | c |');
            expect(saved[2]).toBe('| 1 2 |  | 3 |');
            expect(saved.join('\n')).not.toContain('[table]');
        });

        test('a cell spanning rows leaves its columns in place on the rows it covers', () => {
            const current = create(GRID);

            expect(merge(current, [1, 0], [2, 0])).toBe(true);

            const saved = markdownOf(current).split('\n');

            // The second row has no cell of its own in column 0 (the merged
            // "1 4" covers it), so "5" and "6" stay in columns 1 and 2.
            expect(saved[2]).toBe('| 1 4 | 2 | 3 |');
            expect(saved[3]).toBe('|  | 5 | 6 |');
        });

        test('a block of rows and columns pads both ways', () => {
            const current = create(GRID);

            expect(merge(current, [1, 0], [2, 1])).toBe(true);

            const saved = markdownOf(current).split('\n');

            expect(saved[2].split('|').length).toBe(5);
            expect(saved[3]).toBe('|  |  | 6 |');
        });

        test('a table with merged cells survives a reload', () => {
            const current = create(GRID);
            merge(current, [1, 0], [2, 0]);
            const saved = markdownOf(current);
            current.destroy();

            expect(tableRows(create(saved))).toHaveLength(3);
            expect(markdownOf(editor!)).toBe(saved);
        });
    });

    describe('backslashes', () => {
        const cellOf = (content: object[]) => {
            const current = create();
            current.commands.insertTable({
                rows: 2,
                cols: 2,
                withHeaderRow: true,
            });
            current.commands.insertContent(content);
            const saved = markdownOf(current);
            current.destroy();

            const reloaded = create(saved);
            const table = reloaded
                .getJSON()
                .content?.find((node) => node.type === 'table') as {
                content: { content: { content: unknown[] }[] }[];
            };

            return {
                saved,
                columns: table.content[0].content.length,
                text: reloaded.state.doc.textBetween(
                    0,
                    reloaded.state.doc.content.size,
                    ' ',
                ),
            };
        };

        test.each([
            ['a backslash before a pipe', 'a\\|b'],
            ['a backslash ending the cell', 'a\\'],
            ['two backslashes before a pipe', 'a\\\\|b'],
        ])('%s reads back as typed, without a new column', (_, typed) => {
            const { columns, text } = cellOf([{ type: 'text', text: typed }]);

            expect(columns).toBe(2);
            expect(text).toContain(typed);
        });

        test('the same inside inline code', () => {
            const { columns, text } = cellOf([
                {
                    type: 'text',
                    text: 'a\\|b',
                    marks: [{ type: 'code' }],
                },
            ]);

            expect(columns).toBe(2);
            expect(text).toContain('a\\|b');
        });
    });

    test('text around a table is untouched', () => {
        const markdown =
            'Before\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nAfter';

        expect(roundTrip(markdown).saved).toBe(`${markdown}`);
    });
});
