# Add image uploads to another surface

How the upload pipeline from
[`02-add-image-paste-and-drop-uploads.md`](./02-add-image-paste-and-drop-uploads.md)
reaches the app's markdown fields that are **not** Tiptap: **Part A**
issue comments and **Part B** an issue type's template body. Both are
built; together they are the two shapes any further surface will
take — one that has to render the markdown itself (comments) and one
whose rendering is somebody else's problem (templates).

Read Part A first even if you only care about templates — every
helper Part B uses comes from it, and the two differ in exactly the
ways listed in Part B's opening.

**No backend work is needed for either.** `POST
/projects/{project}/attachments` is deliberately scoped to a project
rather than to an issue, so the same endpoint, the same
`AttachmentService`, the same NSFW screening and the same
`useImageUpload` hook serve every surface. If you find yourself
adding a second controller or a `comment_id` column, stop — that is
the design being worked around, not extended.

## The three jobs a non-Tiptap surface has to do itself

Neither the comment box nor the template body is a Tiptap editor;
both are plain `TextArea` atoms holding markdown as a string. So
there is no `insertContentAt` to call and no `Image` node to render,
and each surface needs all three of:

1. **Splice** `![name](url)` into the string at the caret, then put
   the caret back — a `<textarea>` loses its selection the moment
   React re-renders it with a new `value`.
2. **Do that for the edit path too**, not just for composing.
3. **Render** the stored markdown as an actual image, or the reader
   sees literal `![shot.png](/storage/…)` text.

Part A does all three; miss the third and everything looks like it
works until you reload. Part B only does the first two, for the
reason given there.

## Step 1 — The shared textarea helpers

File: `resources/js/utils/imagePaste.ts`

`extractImageFiles` (guide 02, step 9) already serves paste and drop.
Two more helpers live next to it, and both surfaces use them
unchanged:

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

Alt text is the original filename, put through `markdownImageAlt()`,
which drops the brackets, parentheses and backslashes that would
close the link early — a file named `screen](old).png` would
otherwise produce a body that no longer parses as an image at all.
`EditableMarkdown` runs the same function over the `alt` attribute of
its image node, so a screenshot pasted into a description and one
pasted into a comment produce identical markdown.

`length` exists for one caller only: `CommentForm`, which has to tell
its mention bookkeeping how many characters appeared (step 3).

The third helper is what makes a multi-file paste come out in order:

```ts
/**
 * Where the next image of a batch has to land: a collapsed point right after
 * the one just inserted. Uploading a batch in parallel and reusing the
 * original range for every file inserts them in reverse order, and - when the
 * range covered a selection - lets a later insertion cut through the markdown
 * an earlier one already wrote.
 */
export const nextImageRange = (
    range: { start: number; end: number },
    file: File,
    url: string,
): { start: number; end: number } => {
    const caret = range.start + markdownImage(file, url).length;

    return { start: caret, end: caret };
};
```

It works out the next insertion point from the snippet rather than
from the new body, which is what lets the caller advance without
reading state back out of React.

And, for rendering:

```ts
export interface MarkdownImageSegment {
    type: 'text' | 'image';
    /** The raw text, or - for an image - its alt text. */
    value: string;
    url?: string;
}

// Deliberately narrow: no whitespace in the URL and no nested brackets in the
// alt text, so a line of prose that merely contains brackets and parentheses
// is never mistaken for an image.
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

/**
 * Splits a markdown body into plain-text runs and the image links between
 * them, so a renderer can turn `![alt](url)` into an actual `<img>` while
 * leaving everything else (mentions included) to the existing text handling.
 */
export const splitMarkdownImages = (body: string): MarkdownImageSegment[] => {
    if (!body) return [{ type: 'text', value: body }];

    const segments: MarkdownImageSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    MARKDOWN_IMAGE_PATTERN.lastIndex = 0;
    while ((match = MARKDOWN_IMAGE_PATTERN.exec(body)) !== null) {
        const [full, alt, url] = match;

        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                value: body.slice(lastIndex, match.index),
            });
        }

        segments.push({ type: 'image', value: alt, url });

        lastIndex = match.index + full.length;
    }

    if (lastIndex < body.length) {
        segments.push({ type: 'text', value: body.slice(lastIndex) });
    }

    return segments;
};
```

This is a deliberately tiny parser, not a markdown renderer: comments
are otherwise plain text with mention tokens, and pulling in
`react-markdown` for them would change how every existing comment
renders. Anything that isn't an image link stays untouched text.

## Part A — Issue comments (built)

### Step 2 — Props and the `TextArea` atom

`onImageUpload?: (file: File) => Promise<string>` is added, in
`resources/js/types/Components.ts`, to `CommentFormProps`,
`CommentListProps`, `CommentItemProps` and `EditableTextProps` —
optional everywhere, so a surface that leaves it out simply has no
uploads.

`TextArea` is a controlled atom that forwards only the handlers it
declares, so drop had to be added to it:

```tsx
onPaste,
onCut,
onBlur,
onDrop,
```

...and passed through to the `<textarea>`. `onPaste` was already
forwarded.

### Step 3 — Composing a comment: insert, and keep the mention ranges honest

File: `resources/js/Components/Molecules/CommentForm/CommentForm.tsx`

This is where a comment differs from every other surface, and it is
the part that silently corrupts data if you skip it.

`CommentForm` tracks each `@mention` as a **character range** into
the body (`mentionRanges`) and reconciles those ranges against every
edit through `applyRangeEdit(prev, start, end, insertedLength)`. The
ranges are what `tokenizeMentionRanges()` uses at submit time to turn
display names back into user ids, so an insertion that skips the
reconciliation shifts every mention after it and the comment
notifies the wrong person — with nothing visibly wrong on screen.

There is a second trap in the same component: `handleChange` drops
**all** tracked ranges whenever a change arrives without a captured
edit range (see its comment about IME, drag-and-drop and undo). A
programmatic `setBody()` never reaches `handleChange` at all, so the
reconciliation is done by hand, inside the functional update:

```tsx
/**
 * Uploads a batch one at a time and moves the insertion point past each
 * image as it lands, so several files pasted at once keep their order
 * instead of every one of them splicing into the original range.
 */
const insertImages = async (
    files: File[],
    range: { start: number; end: number },
) => {
    if (!onImageUpload) return;

    let target = range;

    for (const file of files) {
        const at = target;

        try {
            const url = await onImageUpload(file);

            setBody((current) => {
                const result = insertMarkdownImage(current, at, file, url);

                setMentionRanges((prev) =>
                    applyRangeEdit(prev, at.start, at.end, result.length),
                );
                setPendingCaret(result.caret);

                return result.body;
            });

            target = nextImageRange(at, file, url);
        } catch {
            // The uploader already reported the failure to the user; the
            // remaining files in this batch still get their turn.
        }
    }
};
```

`setPendingCaret` is the component's existing mechanism — the
`useEffect` watching `[body, pendingCaret]` re-focuses the textarea
and restores the selection after the re-render.

The paste handler already existed (its only job was
`captureEditRange`), so it is extended rather than duplicated:

```tsx
const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.clipboardData);

    if (onImageUpload && files.length > 0) {
        e.preventDefault();

        const { selectionStart: start, selectionEnd: end } =
            e.currentTarget;
        // Consumed by the insertion below, not by handleChange - which never
        // runs for a paste we've prevented.
        editRangeRef.current = null;

        void insertImages(files, { start, end });

        return;
    }

    captureEditRange(e.currentTarget);
};

const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.dataTransfer);

    if (!onImageUpload || files.length === 0) return;

    e.preventDefault();

    const caret = e.currentTarget.selectionStart;

    void insertImages(files, { start: caret, end: caret });
};
```

with `onDrop={handleDrop}` on the `TextArea`. Falling through to
`captureEditRange` when there is no uploader or no image is what
keeps an ordinary text paste behaving exactly as before.

A drop onto a textarea does not move the caret first, so the
insertion point is wherever the caret already was — unlike the Tiptap
surface, there is no `posAtCoords()` equivalent worth reaching for.

**Upload the batch sequentially, not with `files.forEach`.** Firing
the uploads in parallel and letting each one splice independently
looks fine — every `setBody`/`setMentionRanges` call is a functional
update reading the latest state — but the *range* each one captured
is the original. Two pasted images then both insert at the same
point, so they land in reverse order, and over a selection the second
one cuts through the markdown the first already wrote. Awaiting each
file in turn and advancing through `nextImageRange()` is what keeps
them in order. Still never hoist `body` into the closure: the splice
has to read the latest state, since the user can type between
uploads.

### Step 4 — Editing an existing comment

File: `resources/js/Components/Atoms/EditableText/EditableText.tsx`

An existing comment is edited through `EditableText` in `multiline`
mode, so the upload support lives in that atom rather than in
`CommentItem` — which also means any other multiline `EditableText`
gets it by passing one prop.

```tsx
const insertImages = async (
    files: File[],
    range: { start: number; end: number },
) => {
    if (!onImageUpload) return;

    pendingUploadsRef.current += files.length;

    let target = range;

    for (const file of files) {
        const at = target;

        try {
            const url = await onImageUpload(file);

            setDraft((current) => {
                const result = insertMarkdownImage(current, at, file, url);

                setPendingCaret(result.caret);

                return result.body;
            });

            target = nextImageRange(at, file, url);
        } catch {
            // The uploader already reported the failure to the user.
        } finally {
            pendingUploadsRef.current = Math.max(
                0,
                pendingUploadsRef.current - 1,
            );
        }
    }
};
```

`handlePaste`/`handleDrop` are the same shape as `CommentForm`'s,
minus the mention bookkeeping, and are wired onto the multiline
`TextArea` next to the existing `onBlur={commit}`. Note the counter
is raised by the whole batch up front, so the blur guard below holds
for the entire sequence rather than only for the file in flight.

**The gotcha, identical to the Tiptap one:** `EditableText` commits
on blur. Losing focus mid-upload would run `commit()`, leave edit
mode and save the draft as it was — and the image would then be
spliced into a draft nobody is editing and never persisted. Hence:

```tsx
const commit = () => {
    if (pendingUploadsRef.current > 0) return;

    setIsEditing(false);
    if (draft !== value) {
        onSave(draft);
    }
};
```

A **ref**, not state, because `commit` is the handler the textarea
already holds.

`CommentList` and `CommentItem` do nothing but pass `onImageUpload`
down — `Pages/Issues/Show.tsx` hands the same `uploadImage` from
`useImageUpload(project.id)` to `CommentList` and `CommentForm` that
it already gives the description editor.

### Step 5 — Rendering the image in the posted comment

File: `resources/js/Components/Molecules/CommentItem/CommentItem.tsx`

Without this step everything above stores correctly and displays as
literal `![shot.png](/storage/…)`. The body is rendered in two
passes: images first, then the existing mention splitting over each
text run between them.

```tsx
const renderBody = (value: string) =>
    splitMarkdownImages(value).map((segment, index) =>
        segment.type === 'image' ? (
            // Stops the click from reaching EditableText's edit-on-click
            // wrapper - clicking a picture opens it, it doesn't start an
            // edit the way clicking the text around it does.
            <a
                key={index}
                href={segment.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="my-1 block w-fit"
            >
                <img
                    src={segment.url}
                    alt={segment.value}
                    className="max-h-80 max-w-full rounded-lg border border-[var(--border-color)]"
                />
            </a>
        ) : (
            renderText(segment.value, String(index))
        ),
    );
```

`renderText` is the previous `renderBody` body, unchanged except for
a key prefix — mentions keep rendering exactly as they did, including
inside the text that surrounds an image.

The `stopPropagation` matters because the comment body *is* a click
target: `EditableText` starts an edit when its display area is
clicked, and without it a click on the picture would open the
textarea instead of the image.

### Step 6 — Nothing to change on the backend

`CommentController::store()` and `update()` keep validating `body` as
`required|string`; the image is already stored and the body just
contains a markdown link to it. `App\Policies\CommentPolicy` is
untouched too — the upload was authorized as "can view this project"
when it happened, and posting or editing the comment is authorized
separately as it always was.

## Part B — Issue type templates (built)

A template's `description` is the markdown a new issue of that type
starts from (see
[`../issue-types/README.md`](../issue-types/README.md)), which means
an image pasted into a template shows up in every issue created from
it — the attachment is written once and referenced from every one of
those descriptions. That is fine by design: attachments are owned by
the project, not by the issue, so no issue "owns" the file and
deleting one issue can never break another's image.

Two things make this the simpler of the two surfaces, and they are
what to look for when judging a new one:

- **Rendering is somebody else's problem.** A template body is only
  ever displayed after it has been copied into an issue description,
  and that is rendered by `EditableMarkdown` — Tiptap draws the image
  natively. Nothing here needs `splitMarkdownImages`.
- **There are no mentions**, so no range bookkeeping: the splice is
  just `setDescription`.

### Step B1 — Upload from the modal

File: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsTemplatesModal.tsx`

The modal already receives `projectId` and already uses `useAlert`,
so the hook drops straight in — note both go above the
`if (!issueType) return null;` early return, like every other hook in
the component:

```tsx
const { uploadImage } = useImageUpload(projectId);
const descriptionRef = useRef<HTMLTextAreaElement>(null);
```

The `ref` is new: unlike `CommentForm` this component holds no
textarea ref today, and the caret has to be restored after the
splice.

### Step B2 — Paste and drop on the description textarea

```tsx
const insertImages = async (
    files: File[],
    range: { start: number; end: number },
) => {
    let target = range;

    for (const file of files) {
        const at = target;

        try {
            const url = await uploadImage(file);

            setDescription((current) => {
                const result = insertMarkdownImage(current, at, file, url);

                // This component has no pendingCaret effect the way
                // CommentForm does, and needs none for a single field - the
                // textarea is still mounted, it just lost its selection to
                // the re-render.
                requestAnimationFrame(() => {
                    descriptionRef.current?.focus();
                    descriptionRef.current?.setSelectionRange(
                        result.caret,
                        result.caret,
                    );
                });

                return result.body;
            });

            target = nextImageRange(at, file, url);
        } catch {
            // The uploader already reported the failure to the user.
        }
    }
};

const handleDescriptionPaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
) => {
    const files = extractImageFiles(e.clipboardData);

    if (files.length === 0) return;

    e.preventDefault();

    const { selectionStart: start, selectionEnd: end } = e.currentTarget;

    void insertImages(files, { start, end });
};

const handleDescriptionDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = extractImageFiles(e.dataTransfer);

    if (files.length === 0) return;

    e.preventDefault();

    const caret = e.currentTarget.selectionStart;

    void insertImages(files, { start: caret, end: caret });
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

`uploadImage` already toasts and re-throws on failure, so the
`catch` here is empty on purpose and `insertImages`'s promise is left
unawaited (`void`): a rejected upload has already been surfaced to
the user, the description is left exactly as it was, and the rest of
the batch still gets its turn.

There is no blur guard here, unlike `EditableText`'s: this form is
saved by an explicit "Add template"/"Save" button, so losing focus
mid-upload commits nothing.

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

Part A's coverage already exists and is what a new surface should be
modelled on:

- `resources/js/utils/imagePaste.test.ts` — `insertMarkdownImage` at
  a collapsed caret, over a selected range and on an empty body, plus
  a round-trip asserting what it produces is what
  `splitMarkdownImages` parses back; `markdownImageAlt` dropping the
  link-breaking characters and falling back to `image` when nothing
  usable is left; `nextImageRange` agreeing with the caret
  `insertMarkdownImage` reports and chaining a batch in order; and
  `splitMarkdownImages` itself: no image, empty body, text around an
  image, two consecutive images with an empty alt, and the two
  negative cases that keep the parser honest (a plain `[link](url)`
  and prose that merely contains brackets).
- `resources/js/Components/Molecules/CommentForm/CommentForm.test.tsx` —
  paste uploads and submits the markdown link; **the mention
  regression**: with a mention already selected, paste an image
  *before* it and assert the submitted body still carries
  `@[Jane Cooper](1)` and `mentioned_user_ids` still carries that id;
  drop at the caret; pasting two images at once landing in order, over
  a selection replacing it exactly once, and a failed first upload not
  stopping the second; and paste left to the browser both when there
  is no uploader and when the clipboard holds no image
  (`defaultPrevented === false`).
- `resources/js/Components/Atoms/EditableText/EditableText.test.tsx` —
  paste at the caret, paste replacing a selection, drop, a failed
  upload leaving the draft untouched, paste without an uploader, and
  blur during an in-flight upload neither committing nor losing the
  image.
- `resources/js/Components/Molecules/CommentItem/CommentItem.test.tsx` —
  a body with an image renders an `<img>` and not the literal
  markdown, the image links to the file without starting an edit, and
  mentions still render alongside it.
- `resources/js/Components/Molecules/CommentList/CommentList.test.tsx` —
  one integration case proving the prop actually reaches the edit
  textarea, since `CommentList`/`CommentItem` only pass it through.
- `tests/Feature/CommentControllerTest.php` — storing and editing a
  body containing `![shot.png](/storage/…)` round-trips unchanged.
  That is all the backend needs: no new route, no new validation, no
  new service.

Part B's equivalents, thinner because there is no rendering and no
mention bookkeeping to protect:

- `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsTemplatesModal.test.tsx` —
  mock `@/hooks/useImageUpload` (the real one calls `axios` and
  `route()`), then assert: pasting inserts the markdown link *and*
  `router.post` receives that `description`; drop inserts at the
  caret; a failed upload leaves the description untouched; a paste
  with no image is left to the browser; and, for the permission
  gate, that `canManageTemplates: false` renders no description field
  at all.
- `tests/Feature/IssueTypeTemplateControllerTest.php` — creating and
  updating a template whose `description` contains
  `![shot.png](/storage/…)` round-trips unchanged.
