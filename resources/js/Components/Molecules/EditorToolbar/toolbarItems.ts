import type { ChainedCommands, Editor } from '@tiptap/core';
import type { icons } from 'lucide-react';

/**
 * The buttons of the description editor's formatting bar, as data: a
 * translation key (never text), an icon, the keyboard shortcut Tiptap already
 * binds (shown in the tooltip) and what the button does. A new button is one
 * more entry here, its text in `lang/{en,pl}/editor_toolbar.php` and its icon
 * in `utils/iconRegistry.ts`.
 */
export interface ToolbarItem {
    id: string;
    icon: keyof typeof icons;
    labelKey: string;
    /** In the `mod+shift+b` form `formatBindingParts` understands. */
    shortcut?: string;
    isActive: (editor: Editor) => boolean;
    /**
     * Applies the button to a chain. The bar runs it on `editor.chain()` to
     * act and on `editor.can().chain()` to learn whether the button applies
     * where the caret is (no bold inside a code block).
     */
    apply: (chain: ChainedCommands) => ChainedCommands;
    /** Extra reasons to disable it, e.g. a table cannot hold a table. */
    isDisabled?: (editor: Editor) => boolean;
    /** Starts something besides a plain command; the bar handles it itself. */
    kind?: 'link' | 'image';
}

export type ToolbarGroup = ToolbarItem[];

const heading = (level: 1 | 2 | 3): ToolbarItem => ({
    id: `heading_${level}`,
    icon: `Heading${level}`,
    labelKey: `editor_toolbar.heading_${level}`,
    shortcut: `mod+alt+${level}`,
    isActive: (editor) => editor.isActive('heading', { level }),
    apply: (chain) => chain.toggleHeading({ level }),
});

export const TOOLBAR_GROUPS: ToolbarGroup[] = [
    [
        {
            id: 'bold',
            icon: 'LetterB',
            labelKey: 'editor_toolbar.bold',
            shortcut: 'mod+b',
            isActive: (editor) => editor.isActive('bold'),
            apply: (chain) => chain.toggleBold(),
        },
        {
            id: 'italic',
            icon: 'Italic',
            labelKey: 'editor_toolbar.italic',
            shortcut: 'mod+i',
            isActive: (editor) => editor.isActive('italic'),
            apply: (chain) => chain.toggleItalic(),
        },
        {
            id: 'strike',
            icon: 'Strikethrough',
            labelKey: 'editor_toolbar.strike',
            shortcut: 'mod+shift+s',
            isActive: (editor) => editor.isActive('strike'),
            apply: (chain) => chain.toggleStrike(),
        },
        {
            id: 'code',
            icon: 'Code',
            labelKey: 'editor_toolbar.code',
            shortcut: 'mod+e',
            isActive: (editor) => editor.isActive('code'),
            apply: (chain) => chain.toggleCode(),
        },
    ],
    [heading(1), heading(2), heading(3)],
    [
        {
            id: 'bullet_list',
            icon: 'List',
            labelKey: 'editor_toolbar.bullet_list',
            shortcut: 'mod+shift+8',
            isActive: (editor) => editor.isActive('bulletList'),
            apply: (chain) => chain.toggleBulletList(),
        },
        {
            id: 'ordered_list',
            icon: 'ListOrdered',
            labelKey: 'editor_toolbar.ordered_list',
            shortcut: 'mod+shift+7',
            isActive: (editor) => editor.isActive('orderedList'),
            apply: (chain) => chain.toggleOrderedList(),
        },
        {
            id: 'task_list',
            icon: 'ListTodo',
            labelKey: 'editor_toolbar.task_list',
            shortcut: 'mod+shift+9',
            isActive: (editor) => editor.isActive('taskList'),
            apply: (chain) => chain.toggleTaskList(),
        },
    ],
    [
        {
            id: 'link',
            icon: 'Link',
            labelKey: 'editor_toolbar.link',
            kind: 'link',
            isActive: (editor) => editor.isActive('link'),
            // Setting a link needs an address; this only asks whether a link
            // can go here at all (not inside a code block).
            apply: (chain) => chain.setLink({ href: 'https://example.com' }),
        },
        {
            id: 'quote',
            icon: 'Quote',
            labelKey: 'editor_toolbar.quote',
            shortcut: 'mod+shift+b',
            isActive: (editor) => editor.isActive('blockquote'),
            apply: (chain) => chain.toggleBlockquote(),
        },
        {
            id: 'code_block',
            icon: 'SquareCode',
            labelKey: 'editor_toolbar.code_block',
            shortcut: 'mod+alt+c',
            isActive: (editor) => editor.isActive('codeBlock'),
            apply: (chain) => chain.toggleCodeBlock(),
        },
        {
            id: 'table',
            icon: 'Table',
            labelKey: 'editor_toolbar.table',
            isActive: (editor) => editor.isActive('table'),
            isDisabled: (editor) => editor.isActive('table'),
            apply: (chain) =>
                chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
        },
        {
            id: 'divider',
            icon: 'Minus',
            labelKey: 'editor_toolbar.divider',
            isActive: () => false,
            apply: (chain) => chain.setHorizontalRule(),
        },
        {
            id: 'image',
            icon: 'ImagePlus',
            labelKey: 'editor_toolbar.image',
            kind: 'image',
            isActive: () => false,
            apply: (chain) => chain,
        },
    ],
];

/** Where an address typed into the link field is allowed to point. */
const SAFE_LINK = /^(https?:|mailto:|tel:|\/|#)/i;

/**
 * The href for what was typed: an address without a scheme gets `https://`,
 * and anything that is not a web, mail, phone or relative link (a
 * `javascript:` URL) is refused with `null`.
 */
export const normalizeLinkHref = (input: string): string | null => {
    const value = input.trim();

    if (value === '' || /\s/.test(value)) return null;

    if (SAFE_LINK.test(value)) return value;

    // Another scheme ("javascript:", "data:") is not a bare domain.
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^[^/]+:\d+(\/|$)/.test(value)) {
        return null;
    }

    return `https://${value}`;
};
