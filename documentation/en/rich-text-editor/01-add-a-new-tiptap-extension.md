# Add a new Tiptap extension

Worked example: adding text highlighting
(`@tiptap/extension-highlight`) to the issue description editor —
an extension not currently installed, following the exact pattern
every existing one (`Image`, `Placeholder`, `TaskList`/`TaskItem`,
`TableKit`) already uses.

## Step 1 — Install the package

```bash
npm install @tiptap/extension-highlight
```

Pin it to the same major/minor range as the other `@tiptap/*`
packages already in `package.json` (`^3.x`) — Tiptap extensions are
versioned together, and mixing major versions across extensions used
by the same editor instance is unsupported.

## Step 2 — Add it to the editor's extension list

File: `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.tsx`

```tsx
import { EditableMarkdownProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect, useState } from 'react';
import { Markdown } from 'tiptap-markdown';

const EditableMarkdown: React.FC<EditableMarkdownProps> = ({
    value,
    onSave,
    placeholder = 'Add a description...',
    disabled = false,
    className,
}) => {
    const [isEditing, setIsEditing] = useState(false);

    const editor = useEditor({
        editable: false,
        content: value || '',
        extensions: [
            StarterKit.configure({
                link: { openOnClick: false },
            }),
            Markdown.configure({ html: false }),
            Placeholder.configure({
                placeholder,
                showOnlyWhenEditable: false,
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            TableKit,
            Image,
            Highlight,
        ],
        editorProps: {
            attributes: {
                class: 'prose max-w-none text-sm focus:outline-none',
            },
        },
        onBlur: ({ editor }) => commit(editor),
    });

    // ...rest of the component is unchanged...
```

That's the entire integration — Tiptap extensions are self-contained;
adding one to the array is what registers its commands, its
schema additions, and (for `Highlight` specifically) its keyboard
shortcut (`Ctrl+Shift+H` by default) all at once. No separate toolbar
button is wired up anywhere in this editor today (formatting happens
via Markdown-style typing shortcuts and keyboard shortcuts, not a
button bar), so a new extension needs no additional UI wiring unless
you're also adding a toolbar, which doesn't exist yet.

## Step 3 — Confirm it survives the markdown round-trip

`tiptap-markdown`'s `Markdown` extension is what actually serializes
editor content to the plain-text markdown stored on the backend (via
`editor.storage.markdown.getMarkdown()`, called from `commit()`) — a
new mark/node extension only stores and restores correctly if
`tiptap-markdown` knows how to (de)serialize it. `Highlight`'s output
is standard `==highlighted text==` markdown syntax, which
`tiptap-markdown` supports out of the box; a more exotic extension
(a custom node type with no standard markdown representation) might
need its own explicit markdown serialization rules — check the
extension's own documentation for a `markdown`/`storage` option before
assuming it round-trips for free.

## Step 4 — Style it, if the defaults don't fit the theme

New content type rendered by `.prose` (see `global.css`'s
`--tw-prose-*` token overrides, already pointing every other markdown
element at [theme colors](../theme-colors/README.md)) may need its
own rule if Tiptap's default `<mark>` styling clashes with the dark/
light theme — e.g.:

```css
.prose mark {
    background-color: var(--accent-color-opacity);
    color: inherit;
}
```

added to `resources/css/global.css` near the existing `.prose`/
`.tiptap` rules, following
[`../theme-colors/03-use-a-theme-color-in-a-component.md`](../theme-colors/03-use-a-theme-color-in-a-component.md)'s
convention of a CSS variable over a hardcoded color.

## Tests

- `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.test.tsx` —
  add a case asserting the editor round-trips `==highlighted==`
  markdown correctly (set `value` to a string containing it, assert
  `editor.storage.markdown.getMarkdown()` returns it unchanged after a
  no-op edit/blur cycle), mirroring the existing "committing on blur
  calls onSave when the markdown changed" test's setup shape.
- No backend test changes are needed — the stored column is still
  plain text; the backend has no opinion on what markdown syntax it
  contains.
