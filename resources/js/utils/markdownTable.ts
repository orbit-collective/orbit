import { Table } from '@tiptap/extension-table';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

/**
 * The slice of tiptap-markdown's serializer state this file touches (the
 * library ships no types). `out` is the markdown written so far.
 */
interface SerializerState {
    out: string;
    inTable: boolean;
    renderInline: (node: ProseMirrorNode) => void;
    write: (text?: string) => void;
    ensureNewLine: () => void;
    closeBlock: (node: ProseMirrorNode) => void;
}

/**
 * One cell as a single line of inline markdown. A GFM cell cannot hold
 * several blocks or a line break, so paragraphs and hard breaks collapse to a
 * space, and a "|" is escaped so it can't split the cell in two.
 */
const cellMarkdown = (state: SerializerState, cell: ProseMirrorNode) => {
    const parts: string[] = [];

    cell.forEach((block) => {
        const start = state.out.length;

        if (block.isTextblock) state.renderInline(block);
        else state.out += block.textContent.replace(/[\\`*_[\]]/g, '\\$&');

        parts.push(state.out.slice(start));
        state.out = state.out.slice(0, start);
    });

    return parts
        .join(' ')
        .replace(/\\?\n/g, ' ')
        .replace(/\|/g, '\\|')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Writes a table as GFM, whatever shape it has. tiptap-markdown only handles
 * the plain shape (a header row, single-paragraph cells, no spans) and writes
 * the placeholder `[table]` for anything else - the whole table is lost on
 * the next load. Here a table without a header row gets an empty one (GFM
 * requires it), spans are flattened and multi-paragraph cells become one line.
 */
function serializeTable(state: SerializerState, table: ProseMirrorNode): void {
    // Writing nothing still flushes the blank line owed to the previous block;
    // done first, because the cells below trim what they wrote from `out`.
    state.write();

    const rows: string[][] = [];
    let firstRowIsHeader = false;
    // How many more rows each column is covered by a cell above it that spans
    // rows. ProseMirror leaves such a column out of the rows below, so without
    // this the later cells would slide one column to the left.
    const covered: number[] = [];

    table.forEach((row, _offset, index) => {
        const cells: string[] = [];
        let headers = 0;
        let column = 0;

        const skipCovered = () => {
            while ((covered[column] ?? 0) > 0) {
                cells[column] = '';
                covered[column]--;
                column++;
            }
        };

        row.forEach((cell) => {
            skipCovered();

            if (cell.type.name === 'tableHeader') headers++;

            const colspan = cell.attrs.colspan ?? 1;
            const rowspan = cell.attrs.rowspan ?? 1;

            // A merged cell keeps its text and pads the columns it covers.
            for (let extra = 0; extra < colspan; extra++) {
                cells[column + extra] =
                    extra === 0 ? cellMarkdown(state, cell) : '';

                if (rowspan > 1) covered[column + extra] = rowspan - 1;
            }

            column += colspan;
        });

        skipCovered();

        if (index === 0)
            firstRowIsHeader = headers > 0 && headers === row.childCount;

        rows.push(cells);
    });

    const columns = Math.max(1, ...rows.map((cells) => cells.length));
    const line = (cells: string[]) =>
        `| ${Array.from({ length: columns }, (_, i) => cells[i] ?? '').join(' | ')} |`;

    const lines = firstRowIsHeader ? rows : [[], ...rows];

    lines.forEach((cells, index) => {
        state.write(line(cells));
        state.ensureNewLine();

        if (index === 0) {
            state.write(`| ${Array(columns).fill('---').join(' | ')} |`);
            state.ensureNewLine();
        }
    });

    state.closeBlock(table);
}

/** The table node with the serializer above (parsing stays with markdown-it). */
export const MarkdownTable = Table.extend({
    addStorage() {
        return {
            markdown: {
                serialize: serializeTable,
                parse: {},
            },
        };
    },
});
