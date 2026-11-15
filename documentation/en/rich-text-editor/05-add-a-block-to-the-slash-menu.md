# Add a block to the "/" menu

Typing `/` at the start of a line (or after a space) in the issue
description opens a list of blocks — headings, lists, a task list, a
quote, a code block, a table, a divider and an image. This guide shows
how the menu is built and, as the worked example, how to add a new
block to it. It also records how the editing frame around the editor
(Save/Cancel, keyboard, touch) behaves, because the menu relies on it.

## The editing frame in one minute

- Clicking the description, or its **Edit** button, starts editing.
  The button is revealed on hover and on keyboard focus, and is always
  shown (and larger) on touch screens, where there is no hover.
- Editing ends only through **Save** (or `Ctrl/Cmd+Enter`) or
  **Cancel** (or `Escape`). Leaving the editor — clicking away, tabbing
  on, a file dialog — does **not** save. Focus returns to the Edit
  button afterwards.
- The Save/Cancel row and the keyboard hints (`sm` and up) only exist
  while editing; both buttons are disabled while an image uploads.
- `Ctrl/Cmd+Enter` is handled in the editor's `editorProps.handleKeyDown`
  (not on the wrapper) so it runs before Tiptap's own keymap, which
  would otherwise also insert a hard break.

## Use the editor as a form field

`EditableMarkdown` has two variants. The default, `inline`, is what the
issue page uses: rendered text, click or **Edit** to open, **Save** /
**Cancel** to end. `variant="field"` is an editor that is **always
open**, for a form (the issue type template body):

```tsx
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import EditableMarkdown from '@/Components/Molecules/EditableMarkdown/EditableMarkdown';
import { useImageUpload } from '@/hooks/useImageUpload';

interface TemplateBodyFieldProps {
    projectId: number;
    initialDescription: string;
}

export default function TemplateBodyField({
    projectId,
    initialDescription,
}: TemplateBodyFieldProps) {
    const { t } = useLaravelReactI18n();
    const { uploadImage } = useImageUpload(projectId);
    const [description, setDescription] = useState(initialDescription);

    return (
        <EditableMarkdown
            variant="field"
            value={description}
            onChange={setDescription}
            onImageUpload={uploadImage}
            placeholder={t(
                'workspace_settings_templates_modal.description_placeholder',
            )}
        />
    );
}
```

It has no Edit/Save/Cancel; every change calls `onChange` with the
markdown, and a `value` the parent swaps in (another record opened) is
loaded into the editor — the echo of its own text is ignored.
`Escape` and `Ctrl/Cmd+Enter` are left to the surrounding form or modal.
The frame, toolbar, `/` menu and image upload are the same.
`disabled` makes it read-only. For a rendered, non-editable preview use
`disabled` without the variant, as the template list does.

## The pieces

| File (`resources/js/Components/Molecules/EditableMarkdown/`) | Role                                                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `slashCommands.ts`                                           | The list of blocks (`SLASH_COMMANDS`) and `filterSlashCommands()`. **Data only**: translation keys, an icon, what the block does. |
| `slashExtension.ts`                                          | `SlashCommands`, a Tiptap extension wrapping the suggestion plugin with trigger `/` and its own `pluginKey`.                      |
| `useSlashCommands.ts`                                        | Bridges the suggestion lifecycle (start/update/keydown/exit) to React state; supplies `items`, `allow` and `command`.             |
| `../SlashCommandMenu/SlashCommandMenu.tsx`                   | The floating list, built from `DropdownPanel` / `DropdownOption`.                                                                 |

Rules the hook already follows, keep them for anything similar:

- **`Escape` closes only the menu.** The wrapper cancels editing on
  `Escape`, so the hook calls `stopPropagation()` — even when nothing
  matched and no menu is showing. Inside a modal this relies on
  `Modal`, whose Escape listener runs first (capture phase) and so
  ignores the key while the focused field has `aria-activedescendant`,
  which `EditableMarkdown` sets only while a menu with options is open.
- **Rows swallow `mousedown`** so the editor keeps its selection and the
  suggestion stays alive while a row is clicked or tapped.
- **No match hides the menu but keeps the trigger live**, so deleting a
  letter brings it back; the next `Enter` is then a normal new line.
- **No `/` inside a code block** (`allow`), and none after a letter
  (`allowedPrefixes`), so `and/or` and URLs are plain text.
- **Accessibility:** the editor surface is a `role="textbox"`; while a
  menu is open `EditableMarkdown` points its `aria-activedescendant` /
  `aria-controls` at the active option (`${id}-option-${index}`), so a
  screen reader announces the row the arrows landed on.

## Worked example — a "Callout" block

## Step 1 — Add the texts (both languages)

Files: `lang/en/editable_markdown.php`, `lang/pl/editable_markdown.php`,
inside the `slash` array:

```php
'callout' => [
    'title' => 'Callout',
    'description' => 'Highlight a note for the reader',
    'keywords' => 'note tip info warning',
],
```

`keywords` are extra words the query matches (a word _starting with_
the query matches), in the language of the file.

## Step 2 — Add the icon to the registry

File: `resources/js/utils/iconRegistry.ts`. Import the icon from
`lucide-react/icons/<name>` and add it to the map (the first bundle only
carries the icons listed there). `utils/lucideIconNames.ts` needs no
change unless lucide itself was upgraded.

## Step 3 — Add the block

File: `slashCommands.ts`. Add an entry to `SLASH_COMMANDS`; the order
here is the order in the menu.

```ts
// resources/js/Components/Molecules/EditableMarkdown/slashCommands.ts
export const SLASH_COMMANDS: SlashCommand[] = [
    // ...the existing blocks, in menu order...
    {
        id: 'callout',
        icon: 'MessageSquareExclamationPoint',
        titleKey: 'editable_markdown.slash.callout.title',
        descriptionKey: 'editable_markdown.slash.callout.description',
        keywordsKey: 'editable_markdown.slash.callout.keywords',
        // Optional: hide it where it makes no sense.
        // isAvailable: (editor) => !editor.isActive('table'),
        run: (editor, range) =>
            void editor
                .chain()
                .focus()
                .deleteRange(range)
                .toggleBlockquote()
                .run(),
    },
];
```

`run` receives the editor and the range of the typed `/query`; always
delete that range first. A block that needs a node the editor doesn't
have yet needs its Tiptap extension added to the list in
`EditableMarkdown.tsx` first (guide 1) — and a way to survive the
markdown round trip (guide 1, step 3), because the description is
stored as plain markdown.

A block that needs the browser (like **Image**, which opens the file
picker) sets `requiresUpload: true` for the "only when uploads are on"
filter and is finished by the component: `onPickImage` in
`useSlashCommands` is wired to a hidden file input in
`EditableMarkdown`. Follow that shape for anything else that needs UI
after the block is chosen.

## Step 4 — Tests and story

- `slashCommands.test.ts`: add the block to the "what each block does"
  group (a real `Editor`, `run()` on a `/` line, assert the document or
  markdown) and, if it has keywords, a `filterSlashCommands` case.
- `SlashCommandMenu.stories.tsx` only needs a change when the menu's
  own look changes; the list comes from `SLASH_COMMANDS`.
- `translations.test.ts` already checks that both languages define the
  same keys.

## The formatting bar

While editing, `EditorToolbar` (`Components/Molecules/EditorToolbar/`)
sits above the text: bold, italic, strikethrough, inline code,
headings 1–3, bulleted / numbered / task lists, link, quote, code block,
table, divider and — only when uploads are on — image. It is a WAI-ARIA
toolbar: one tab stop, `←`/`→`/`Home`/`End` move between buttons,
buttons are `aria-pressed` when the format is active and disabled where
it cannot apply (no bold in a code block, no table in a table). It
scrolls sideways on a narrow screen, and the buttons grow on touch
screens. Pressing a button swallows `mousedown` so the editor keeps its
selection.

The buttons are data in `toolbarItems.ts` (`TOOLBAR_GROUPS`): a label
key in `lang/{en,pl}/editor_toolbar.php`, an icon from the registry, the
Tiptap shortcut shown in the tooltip, `isActive` and `apply(chain)`.
`apply` runs on `editor.chain()` to act and on `editor.can().chain()` to
decide whether the button is enabled, so write it as one chained
command. A new button is one more entry there plus its text and icon.

The **link** button swaps the bar for an address field. An address is
normalised by `normalizeLinkHref`: a bare domain gets `https://`, and
anything but web / mail / phone / relative links (`javascript:`) is
refused. `Escape` closes only the field.

## Checklist

- [ ] Texts in `lang/en` and `lang/pl` (`slash.<id>.{title,description,keywords}`).
- [ ] Icon in `utils/iconRegistry.ts`.
- [ ] Entry in `SLASH_COMMANDS`, deleting the typed range first.
- [ ] Extension + markdown round trip if it is a new node type.
- [ ] Test in `slashCommands.test.ts`; `npm run knip` and `npm test` green.
- [ ] For a formatting-bar button instead: entry in `toolbarItems.ts`, text in `lang/*/editor_toolbar.php`, icon in the registry, a case in `EditorToolbar.test.tsx`.
