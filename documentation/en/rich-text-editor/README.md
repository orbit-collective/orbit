# Rich text editor

Issue descriptions (and, in read-only/disabled mode, an integration's
catalog `overview` copy) are edited/rendered through
[Tiptap](https://tiptap.dev/), configured once in
`EditableMarkdown.tsx` and stored as plain markdown text on the
backend — there's no separate rich-content column or JSON document
format, just a `TEXT` column holding whatever markdown Tiptap's
`tiptap-markdown` extension serializes.

## Guides, in the order you'd actually need them

1. **[Add a new Tiptap extension](./01-add-a-new-tiptap-extension.md)**
   — worked example adding text highlighting (`@tiptap/extension-highlight`,
   not currently installed) to the editor's extension list.
2. **[Add image paste & drop uploads](./02-add-image-paste-and-drop-uploads.md)**
   — the full pipeline behind pasting or dragging an image into an
   issue description: the `attachments` table, repository, service and
   JSON upload endpoint, the NSFW screening it shares with avatar
   uploads, and the editor's paste/drop handlers.
3. **[Add image uploads to another surface](./03-add-image-uploads-to-another-surface.md)**
   — how that pipeline reaches surfaces that are plain textareas
   rather than Tiptap: issue comments (composing, editing, rendering,
   and the mention-range trap) and an issue type's template body —
   the two shapes any further surface will take.

## The architecture in one paragraph

`EditableMarkdown` (`resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.tsx`)
wraps a single `useEditor()` call from `@tiptap/react`, always
mounted but toggling `editable: false`/`true` on click rather than
conditionally rendering a separate read/edit component — clicking the
rendered content calls `startEditing()` (sets `editable: true`,
focuses the end), and losing focus (`onBlur`) or pressing `Escape`
exits editing, calling `onSave(markdown)` only if the content actually
changed (compared via `tiptap-markdown`'s `editor.storage.markdown.getMarkdown()`
against the last-saved `value` prop). The extension list —
`StarterKit` (bold/italic/lists/headings/code/etc., with `link`
configured not to open on click while editing), `Markdown` (the
serializer itself, `html: false` so pasted/typed HTML never leaks
into the stored markdown), `Placeholder`, `TaskList`/`TaskItem`,
`TableKit`, and `Image` — is the single place that decides what
formatting is possible; nothing else in the app has its own separate
Tiptap configuration. A **separate** rendering path,
`react-markdown`/`remark-gfm` (see
[`../architecture/01-tech-stack-and-project-structure.md`](../architecture/01-tech-stack-and-project-structure.md)),
handles markdown that's never editable at all (the integrations
catalog's static `overview` field) — don't reach for Tiptap for
read-only markdown display; it's a heavier tool for a job
`react-markdown` already does.

Images are the one thing that doesn't live in that `TEXT` column.
Pasting or dropping one uploads it to `POST
/projects/{project}/attachments`
(`AttachmentController` → `AttachmentService` → `AttachmentRepository`,
screened by `NsfwDetectionService` exactly like an avatar), and only
the returned URL goes into the markdown as a plain `![alt](url)`.
Attachments are owned by the **project**, not by the issue, comment
or template that references them, which is what lets one endpoint
serve every editing surface in the app. Issue descriptions get images
for free through Tiptap's `Image` node; comments — plain textareas,
not Tiptap — do the same work by hand with `insertMarkdownImage` and
`splitMarkdownImages` in `resources/js/utils/imagePaste.ts`, which is
what guide 3 walks through.
