# Keep content safe through the markdown round trip

The description is stored as plain markdown, so **everything the editor
can produce has to be written as markdown and read back the same.** A
node or mark that can't is lost on the next load, silently. This guide
records what went wrong with tables, how it was fixed, and the check to
run before adding anything to the editor.

## What went wrong

`tiptap-markdown` writes a table only in the plain shape — a header row,
one paragraph per cell, no merged cells. For anything else it falls back
to the node's HTML, and because the editor runs with `html: false` that
fallback is the placeholder text **`[table]`**. So after a save:

- a table **without a header row** (e.g. one built from a markdown
  paste or by deleting the header row) turned into `[table]`;
- a cell where the user pressed Enter (two paragraphs) or Shift+Enter
  (a hard break) turned the whole table into `[table]`;
- a `|` typed in a cell was not escaped, so the row grew an extra column
  and the table no longer parsed — the raw `| a | b | c |` showed as text.

Separately, `StarterKit` ships an **underline** mark. Markdown has no
underline, so `Ctrl+U` looked fine while editing and vanished on save.

## The fix

- `resources/js/utils/markdownTable.ts` defines `MarkdownTable`, the
  `Table` node with its own `addStorage().markdown.serialize`.
  `EditableMarkdown` uses `TableKit.configure({ table: false })` plus
  `MarkdownTable`. It always writes valid GFM: an empty header row is
  added when there is none, merged cells (across columns or rows) keep their text and
  leave the columns they cover empty, a cell's paragraphs and hard breaks collapse to one line, and
  `|` becomes `\|`. Parsing is still markdown-it's.
- `StarterKit.configure({ underline: false })`.

Multi-line cells are flattened on save — GFM cannot hold them — which is
the one thing a user can still notice, and far better than losing the
table.

## Check any new node or mark

1. In a test, build a real `Editor` with the same extensions as
   `EditableMarkdown` (`Markdown.configure({ html: false })` included).
2. Produce the content the way a user would (commands, not a pre-baked
   string) in every shape you can think of: empty, with formatting,
   nested, with `|`, `*`, `[`, `<`.
3. Assert `storage.markdown.getMarkdown()` contains no `[nodeName]`,
   and that **saving, reloading the saved text and saving again gives
   the same text** (see `markdownTable.test.ts`'s `roundTrip`).
4. If it can't be expressed in markdown, don't offer it: disable the
   extension (like underline) or leave it out of the toolbar and the
   `/` menu.

## When you write a serializer

`tiptap-markdown` serializer functions get a `state` (no types ship; see
the small interface in `markdownTable.ts`). Two things bite:

- Call `state.write()` first. It flushes the blank line owed to the
  previous block; without it, text before the node is glued to it.
- To get a child's markdown as a string, render it and slice `state.out`
  back off, as `cellMarkdown` does — but only after that flush, or the
  slice removes the blank line too.
