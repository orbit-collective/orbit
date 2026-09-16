# Add image uploads to another surface

Two worked examples, neither built yet, of extending the upload
pipeline from
[`02-add-image-paste-and-drop-uploads.md`](./02-add-image-paste-and-drop-uploads.md)
to the app's other markdown-bearing fields: **Part A** an issue
comment, **Part B** an issue type's template body.

Read Part A first even if you only care about templates — it
introduces the textarea helper Part B reuses.

**No backend work is needed for either.** `POST
/projects/{project}/attachments` is deliberately scoped to a project
rather than to an issue, so the same endpoint, the same
`AttachmentService`, the same NSFW screening and the same
`useImageUpload` hook serve every surface. If you find yourself
adding a second controller or a `comment_id` column, stop — that is
the design being worked around, not extended.

## The one thing both parts have to deal with

Neither surface is Tiptap. Both the comment box
(`resources/js/Components/Molecules/CommentForm/CommentForm.tsx`) and
the template body
(`resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsTemplatesModal.tsx`)
are plain `TextArea` atoms holding markdown as a string. So there is
no `insertContentAt` to call: the upload has to splice
`![name](url)` into the string at the caret and then put the caret
back after it — a `<textarea>` loses its selection the moment React
re-renders it with a new `value`.

## Step 1 — A splice helper for textareas

File: `resources/js/utils/imagePaste.ts`

Add alongside the existing `extractImageFiles`:

```ts
/**
 * Splices a markdown image link into a textarea's value, replacing whatever
 * the given range covers, and reports where the caret has to be restored -
 * a textarea drops its selection as soon as React re-renders it with a new
 * value.
 */
export const insertMarkdownImage = (
    body: string,
    range: { start: number; end: number },
    file: File,
    url: string,
): { body: string; caret: number; length: number } => {
    const snippet = `![${file.name}](${url})`;

    return {
        body: body.slice(0, range.start) + snippet + body.slice(range.end),
        caret: range.start + snippet.length,
        length: snippet.length,
    };
};
```

Alt text is the original filename, the same choice
`EditableMarkdown` makes when it builds an `image` node — so a
screenshot pasted into a description and one pasted into a comment
produce identical markdown.

## Part A — Issue comments

### Step A1 — Accept an uploader in the comment form

File: `resources/js/Components/Molecules/CommentForm/CommentForm.tsx`

Add `onImageUpload?: (file: File) => Promise<string>` to
`CommentFormProps` in `resources/js/types/Components.ts` (exactly as
`EditableMarkdownProps` declares it), then destructure it alongside
`onSubmit`, `users` and `isSubmitting`.

### Step A2 — Insert the upload result, and keep the mention ranges honest

This is where a comment differs from every other surface, and it is
the part that will silently corrupt data if you skip it.

`CommentForm` tracks each `@mention` as a **character range** into
the body (`mentionRanges`), and reconciles those ranges against every
edit through `applyRangeEdit(prev, start, end, insertedLength)`.
An insertion that doesn't go through that reconciliation shifts every
mention that comes after it, and the ranges are what
`tokenizeMentionRanges()` uses at submit time to turn display names
back into user ids — so the comment would notify the wrong person,
with nothing visibly wrong on screen.

There is a second trap in the same component: `handleChange` drops
**all** tracked ranges whenever a change arrives without a captured
edit range (see its comment about IME, drag-and-drop and undo). A
programmatic `setBody()` never reaches `handleChange` at all, so the
reconciliation has to be done here by hand:

```tsx
const insertImage = async (file: File, range: { start: number; end: number }) => {
    if (!onImageUpload) return;

    const url = await onImageUpload(file);

    setBody((current) => {
        const result = insertMarkdownImage(current, range, file, url);

        setMentionRanges((prev) =>
            applyRangeEdit(prev, range.start, range.end, result.length),
        );
        setPendingCaret(result.caret);

        return result.body;
    });
};
```

`setPendingCaret` is the component's existing mechanism — the
`useEffect` watching `[body, pendingCaret]` re-focuses the textarea
and restores the selection after the re-render.

### Step A3 — Hook up paste and drop

`CommentForm` already has an `onPaste` handler (`handlePaste`), whose
only job today is `captureEditRange`. Extend it rather than adding a
second one:

```tsx
const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.clipboardData);

    if (onImageUpload && files.length > 0) {
        e.preventDefault();

        const { selectionStart: start, selectionEnd: end } = e.currentTarget;
        // Consumed by the insertion below, not by handleChange - which never
        // runs for a paste we've prevented.
        editRangeRef.current = null;

        files.forEach((file) => void insertImage(file, { start, end }));

        return;
    }

    captureEditRange(e.currentTarget);
};

const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.dataTransfer);

    if (!onImageUpload || files.length === 0) return;

    e.preventDefault();

    const caret = e.currentTarget.selectionStart;

    files.forEach((file) => void insertImage(file, { start: caret, end: caret }));
};
```

and add `onDrop={handleDrop}` to the `TextArea`. A drop onto a
textarea does not move the caret first, so the insertion point is
wherever the caret already was — unlike the Tiptap surface, there is
no `posAtCoords()` equivalent worth reaching for.

Note that `files.forEach` fires the uploads in parallel and each one
splices independently. That is safe **only** because each
`setBody`/`setMentionRanges` call is a functional update reading the
latest state; never hoist `body` into the closure.

### Step A4 — Pass the uploader from the page

File: `resources/js/Pages/Issues/Show.tsx`

The page already calls `useImageUpload(project.id)` for the
description (Step 11 of the previous guide), so the same
`uploadImage` goes straight to both the new-comment form and the
edit-a-comment form inside `CommentList`:

```tsx
<CommentList
    comments={issue.comments || []}
    users={users}
    onEdit={editComment}
    onDelete={deleteComment}
    onImageUpload={uploadImage}
/>
<CommentForm onSubmit={addComment} users={users} onImageUpload={uploadImage} />
```

`CommentList` passes it down to whatever it renders for an edit
session; if that editing UI is a second `TextArea`, it needs the same
Step A2/A3 treatment.

### Step A5 — Nothing to change on the backend

`CommentController::store()` keeps validating `body` as
`required|string`; the image is already stored and the body just
contains a markdown link to it. `App\Policies\CommentPolicy` is
untouched too — the upload was authorized as "can view this project"
when it happened, and posting the comment is authorized separately as
it always was.

## Part B — Issue type templates

A template's `description` is the markdown a new issue of that type
starts from (see
[`../issue-types/README.md`](../issue-types/README.md)), which means
an image pasted into a template shows up in every issue created from
it — the attachment is written once and referenced from every one of
those descriptions. That is fine by design: attachments are owned by
the project, not by the issue, so no issue "owns" the file and
deleting one issue can never break another's image.

### Step B1 — Upload from the modal

File: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsTemplatesModal.tsx`

The modal already receives `projectId` and already uses `useAlert`,
so the hook drops straight in:

```tsx
const { uploadImage } = useImageUpload(projectId);
const descriptionRef = useRef<HTMLTextAreaElement>(null);
```

The `ref` is new: unlike `CommentForm` this component holds no
textarea ref today, and the caret has to be restored after the
splice.

### Step B2 — Paste and drop on the description textarea

```tsx
const insertImage = async (file: File, range: { start: number; end: number }) => {
    const url = await uploadImage(file);

    setDescription((current) => {
        const result = insertMarkdownImage(current, range, file, url);

        requestAnimationFrame(() => {
            descriptionRef.current?.focus();
            descriptionRef.current?.setSelectionRange(result.caret, result.caret);
        });

        return result.body;
    });
};

const handleDescriptionPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.clipboardData);

    if (files.length === 0) return;

    e.preventDefault();

    const { selectionStart: start, selectionEnd: end } = e.currentTarget;

    files.forEach((file) => void insertImage(file, { start, end }));
};

const handleDescriptionDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.dataTransfer);

    if (files.length === 0) return;

    e.preventDefault();

    const caret = e.currentTarget.selectionStart;

    files.forEach((file) => void insertImage(file, { start: caret, end: caret }));
};
```

and on the existing description field:

```tsx
<TextArea
    ref={descriptionRef}
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    onPaste={handleDescriptionPaste}
    onDrop={handleDescriptionDrop}
    placeholder="Description every new issue of this type starts from"
    variant="modal"
    className="min-h-[120px] font-mono text-xs"
/>
```

The `requestAnimationFrame` stands in for `CommentForm`'s
`pendingCaret` effect — this component has no such mechanism and
doesn't need a general one for a single field.

`uploadImage` already toasts and re-throws on failure, so leaving
`insertImage`'s promise unawaited (`void`) is deliberate: a rejected
upload surfaces to the user and inserts nothing.

### Step B3 — Guard it behind the existing permission

The modal renders the form only when `canManageTemplates` is true,
which is the frontend mirror of
`$this->authorize('updateIssueTypes', $project)` in
`IssueTypeTemplateController`. Keep the paste/drop handlers inside
that same conditional block — the upload endpoint only checks project
membership, so a member who is not allowed to manage templates must
not be given a textarea to paste into in the first place.

### Step B4 — Nothing to change on the backend

`IssueTypeTemplateController` keeps validating `description` as
`nullable|string`, and
`IssueTypeTemplateService::createTemplate()`/`updateTemplate()` are
untouched. An issue created from the template copies the markdown
verbatim, image links and all.

## Tests

- `resources/js/utils/imagePaste.test.ts` — add cases for
  `insertMarkdownImage`: inserting at a collapsed caret, replacing a
  selected range, and the reported `caret`/`length`.
- `resources/js/Components/Molecules/CommentForm/CommentForm.test.tsx` —
  pasting an image calls `onImageUpload` and puts `![name](url)` in
  the submitted body; **and** a case that is the whole point of Step
  A2: type a mention, move the caret before it, paste an image, then
  submit, asserting `mentioned_user_ids` still carries that user's
  id. Mirror the existing mention-tracking tests' setup.
- `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsTemplatesModal.test.tsx` —
  pasting an image into the description posts a `description`
  containing the markdown link; and that nothing is uploaded when
  `canManageTemplates` is false.
- `tests/Feature/CommentControllerTest.php` /
  `tests/Feature/IssueTypeTemplateControllerTest.php` — add one case
  each storing a body/description containing `![shot.png](/storage/…)`
  and asserting it round-trips unchanged. There is nothing else to
  test on the backend: no new route, no new validation, no new
  service.
