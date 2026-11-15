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

    table.forEach((row, _offset, index) => {
        const cells: string[] = [];
        let headers = 0;

        row.forEach((cell) => {
            if (cell.type.name === 'tableHeader') headers++;

            cells.push(cellMarkdown(state, cell));

            // A merged cell keeps its text and pads the columns it covered.
            for (let extra = 1; extra < (cell.attrs.colspan ?? 1); extra++) {
                cells.push('');
            }
        });

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
