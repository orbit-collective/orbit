import type { Editor, Range } from '@tiptap/core';
import type { icons } from 'lucide-react';

/**
 * The blocks the "/" menu of the description editor can insert. Each one is
 * data: translation keys (never text), an icon and what it does to the
 * document, so a new block is one more entry here and its texts in
 * `lang/{en,pl}/editable_markdown.php` (`documentation/en/rich-text-editor/`).
 */
export interface SlashCommand {
    id: string;
    icon: keyof typeof icons;
    titleKey: string;
    descriptionKey: string;
    /** Extra words the query also matches, space separated ("h1", "todo"). */
    keywordsKey: string;
    /** Offered only when images can be uploaded; picking it opens the file picker. */
    requiresUpload?: boolean;
    /** Hides the block where it makes no sense, e.g. a table inside a table. */
    isAvailable?: (editor: Editor) => boolean;
    /** Replaces the typed "/query" with the block. */
    run: (editor: Editor, range: Range) => void;
}

const replaceTypedQuery = (editor: Editor, range: Range) =>
    editor.chain().focus().deleteRange(range);

const heading =
    (level: 1 | 2 | 3) =>
    (editor: Editor, range: Range): void => {
        replaceTypedQuery(editor, range).setNode('heading', { level }).run();
    };

export const SLASH_COMMANDS: SlashCommand[] = [
    {
        id: 'heading_1',
        icon: 'Heading1',
        titleKey: 'editable_markdown.slash.heading_1.title',
        descriptionKey: 'editable_markdown.slash.heading_1.description',
        keywordsKey: 'editable_markdown.slash.heading_1.keywords',
        run: heading(1),
    },
    {
        id: 'heading_2',
        icon: 'Heading2',
        titleKey: 'editable_markdown.slash.heading_2.title',
        descriptionKey: 'editable_markdown.slash.heading_2.description',
        keywordsKey: 'editable_markdown.slash.heading_2.keywords',
        run: heading(2),
    },
    {
        id: 'heading_3',
        icon: 'Heading3',
        titleKey: 'editable_markdown.slash.heading_3.title',
        descriptionKey: 'editable_markdown.slash.heading_3.description',
        keywordsKey: 'editable_markdown.slash.heading_3.keywords',
        run: heading(3),
    },
    {
        id: 'bullet_list',
        icon: 'List',
        titleKey: 'editable_markdown.slash.bullet_list.title',
        descriptionKey: 'editable_markdown.slash.bullet_list.description',
        keywordsKey: 'editable_markdown.slash.bullet_list.keywords',
        run: (editor, range) =>
            void replaceTypedQuery(editor, range).toggleBulletList().run(),
    },
    {
        id: 'numbered_list',
        icon: 'ListOrdered',
        titleKey: 'editable_markdown.slash.numbered_list.title',
        descriptionKey: 'editable_markdown.slash.numbered_list.description',
        keywordsKey: 'editable_markdown.slash.numbered_list.keywords',
        run: (editor, range) =>
            void replaceTypedQuery(editor, range).toggleOrderedList().run(),
    },
    {
        id: 'task_list',
        icon: 'ListTodo',
        titleKey: 'editable_markdown.slash.task_list.title',
        descriptionKey: 'editable_markdown.slash.task_list.description',
        keywordsKey: 'editable_markdown.slash.task_list.keywords',
        run: (editor, range) =>
            void replaceTypedQuery(editor, range).toggleTaskList().run(),
    },
    {
        id: 'quote',
        icon: 'Quote',
        titleKey: 'editable_markdown.slash.quote.title',
        descriptionKey: 'editable_markdown.slash.quote.description',
        keywordsKey: 'editable_markdown.slash.quote.keywords',
        run: (editor, range) =>
            void replaceTypedQuery(editor, range).toggleBlockquote().run(),
    },
    {
        id: 'code_block',
        icon: 'SquareCode',
        titleKey: 'editable_markdown.slash.code_block.title',
        descriptionKey: 'editable_markdown.slash.code_block.description',
        keywordsKey: 'editable_markdown.slash.code_block.keywords',
        run: (editor, range) =>
            void replaceTypedQuery(editor, range).toggleCodeBlock().run(),
    },
    {
        id: 'table',
        icon: 'Table',
        titleKey: 'editable_markdown.slash.table.title',
        descriptionKey: 'editable_markdown.slash.table.description',
        keywordsKey: 'editable_markdown.slash.table.keywords',
        isAvailable: (editor) => !editor.isActive('table'),
        run: (editor, range) =>
            void replaceTypedQuery(editor, range)
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run(),
    },
    {
        id: 'divider',
        icon: 'Minus',
        titleKey: 'editable_markdown.slash.divider.title',
        descriptionKey: 'editable_markdown.slash.divider.description',
        keywordsKey: 'editable_markdown.slash.divider.keywords',
        run: (editor, range) =>
            void replaceTypedQuery(editor, range).setHorizontalRule().run(),
    },
    {
        id: 'image',
        icon: 'ImagePlus',
        titleKey: 'editable_markdown.slash.image.title',
        descriptionKey: 'editable_markdown.slash.image.description',
        keywordsKey: 'editable_markdown.slash.image.keywords',
        requiresUpload: true,
        run: (editor, range) => void replaceTypedQuery(editor, range).run(),
    },
];

/**
 * The blocks matching what was typed after the "/": a word of the title or of
 * the extra keywords starting with the query. An empty query lists everything.
 */
export const filterSlashCommands = (
    commands: SlashCommand[],
    query: string,
    translate: (key: string) => string,
): SlashCommand[] => {
    const needle = query.trim().toLowerCase();

    if (needle === '') return commands;

    return commands.filter((command) =>
        `${translate(command.titleKey)} ${translate(command.keywordsKey)}`
            .toLowerCase()
            .split(/\s+/)
            .some((word) => word.startsWith(needle)),
    );
};
