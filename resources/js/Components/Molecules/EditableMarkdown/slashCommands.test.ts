import { Editor } from '@tiptap/core';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { afterEach, describe, expect, test } from 'vitest';
import { loadTranslations } from '@/tests/langFiles';
import { filterSlashCommands, SLASH_COMMANDS } from './slashCommands';

const en = loadTranslations('en');
const translate = (key: string) => en[key] ?? key;
const ids = (query: string) =>
    filterSlashCommands(SLASH_COMMANDS, query, translate).map(
        (command) => command.id,
    );

let editor: Editor | null = null;

afterEach(() => {
    editor?.destroy();
    editor = null;
});

/** A real editor holding "/" (as typed at the start of a line) plus the extensions the blocks need. */
const editorWithSlash = () => {
    editor = new Editor({
        element: document.createElement('div'),
        content: '/',
        extensions: [
            StarterKit,
            Markdown.configure({ html: false }),
            TaskList,
            TaskItem.configure({ nested: true }),
            TableKit,
        ],
    });

    return editor;
};

const run = (id: string) => {
    const current = editorWithSlash();
    const command = SLASH_COMMANDS.find((candidate) => candidate.id === id)!;

    command.run(current, { from: 1, to: 2 });

    return current.storage.markdown.getMarkdown() as string;
};

describe('filterSlashCommands', () => {
    test('an empty query lists every block', () => {
        expect(ids('')).toEqual(SLASH_COMMANDS.map((command) => command.id));
        expect(ids('  ')).toHaveLength(SLASH_COMMANDS.length);
    });

    test('matches the start of a word of the title', () => {
        expect(ids('bul')).toEqual(['bullet_list']);
        expect(ids('list')).toEqual([
            'bullet_list',
            'numbered_list',
            'task_list',
        ]);
    });

    test('matches the extra keywords', () => {
        expect(ids('h2')).toEqual(['heading_2']);
        expect(ids('todo')).toEqual(['task_list']);
        expect(ids('hr')).toEqual(['divider']);
    });

    test('ignores case and finds nothing for gibberish', () => {
        expect(ids('TABLE')).toEqual(['table']);
        expect(ids('zzz')).toEqual([]);
    });

    test('does not match the middle of a word', () => {
        expect(ids('ist')).toEqual([]);
    });
});

describe('what each block does to the document', () => {
    test.each([
        ['heading_1', '#'],
        ['heading_2', '##'],
        ['heading_3', '###'],
    ])('%s turns the line into a heading', (id, hashes) => {
        const current = editorWithSlash();
        SLASH_COMMANDS.find((c) => c.id === id)!.run(current, {
            from: 1,
            to: 2,
        });
        current.commands.insertContent('Title');

        expect(current.storage.markdown.getMarkdown()).toBe(`${hashes} Title`);
    });

    test('lists, quote and code block replace the typed slash', () => {
        expect(run('bullet_list')).not.toContain('/');
        expect(editor!.isActive('bulletList')).toBe(true);

        run('numbered_list');
        expect(editor!.isActive('orderedList')).toBe(true);

        run('task_list');
        expect(editor!.isActive('taskList')).toBe(true);

        run('quote');
        expect(editor!.isActive('blockquote')).toBe(true);

        run('code_block');
        expect(editor!.isActive('codeBlock')).toBe(true);
    });

    test('the table is a 3 x 3 grid with a header row', () => {
        run('table');

        const table = editor!
            .getJSON()
            .content?.find((node) => node.type === 'table') as
            | { content: { content: { type: string }[] }[] }
            | undefined;

        expect(table?.content).toHaveLength(3);
        expect(table?.content[0].content).toHaveLength(3);
        expect(table?.content[0].content[0].type).toBe('tableHeader');
    });

    test('the divider inserts a horizontal rule', () => {
        expect(run('divider')).toContain('---');
    });

    test('the image block only clears the typed text, the picker comes from the editor', () => {
        const markdown = run('image');

        expect(markdown.trim()).toBe('');
    });

    test('a table cannot be offered inside a table', () => {
        const current = editorWithSlash();
        const table = SLASH_COMMANDS.find((c) => c.id === 'table')!;

        expect(table.isAvailable?.(current)).toBe(true);

        current.commands.insertTable();

        expect(table.isAvailable?.(current)).toBe(false);
    });
});
