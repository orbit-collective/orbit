# Add image paste & drop uploads

Walkthrough of the pipeline that lets an issue description accept an
image pasted with `Ctrl+V` or dragged onto the page — every layer of
it, in the order you'd build it: `attachments` table → repository →
service → controller → route → moderation → the Tiptap paste/drop
handlers. Read it before wiring a *second* surface (comments, issue
type templates); the worked examples in
[`03-add-image-uploads-to-another-surface.md`](./03-add-image-uploads-to-another-surface.md)
assume everything below already exists and only reuse it.

The one thing that shapes every decision here: an image never lives
inside the markdown. The upload is a separate round-trip that stores
the file and answers with a URL, and the editor then writes a plain
`![alt](/storage/...)` into the same `TEXT` column it always wrote.
Nothing about the storage format of a description, comment body or
template body changes.

## Step 1 — The migration

File: `database/migrations/2026_09_14_120000_create_attachments_table.php`

```php
Schema::create('attachments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('project_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
    $table->string('disk')->default('public');
    $table->string('path');
    $table->string('url');
    $table->string('original_name');
    $table->string('mime_type');
    $table->unsignedBigInteger('size');
    $table->timestamps();

    $table->index(['project_id', 'created_at']);
});
```

An attachment is scoped to a **project**, not to the issue, comment
or template it happens to be referenced from. That is deliberate:
the markdown body is free text that can be copied between an issue
and a comment, so there is no reliable owner to hang a foreign key
off. The project is the permission boundary that actually matters —
it is what the upload endpoint authorizes against — and it is what
makes `cascadeOnDelete()` correct: deleting a project takes its
uploads with it.

`disk` and `path` are stored next to `url` so a file can still be
deleted (or moved to another disk later) without parsing the public
URL back into a storage path the way
`UserService::updateProfile()` has to with avatars.

## Step 2 — The model and the project relation

File: `app/Models/Attachment.php`

```php
class Attachment extends Model
{
    /** @use HasFactory<AttachmentFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'user_id',
        'disk',
        'path',
        'url',
        'original_name',
        'mime_type',
        'size',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

File: `app/Models/Project.php`

```php
public function attachments(): HasMany
{
    return $this->hasMany(Attachment::class);
}
```

Plus `database/factories/AttachmentFactory.php`, needed by the tests
in the last step.

## Step 3 — The repository

File: `app/Repositories/AttachmentRepository.php`

```php
class AttachmentRepository
{
    public function create(Project $project, array $data): Attachment
    {
        return $project->attachments()->create($data);
    }

    public function findForProject(Project $project, int $id): ?Attachment
    {
        return $project->attachments()->whereKey($id)->first();
    }

    /**
     * @return Collection<int, Attachment>
     */
    public function getForProject(Project $project): Collection
    {
        return $project->attachments()->latest()->get();
    }

    public function delete(Attachment $attachment): void
    {
        $attachment->delete();
    }
}
```

Every query goes through the project relation rather than
`Attachment::query()->where('project_id', ...)`, so a lookup can
never accidentally return another project's file — the same shape
`LabelRepository` uses.

## Step 4 — The service

File: `app/Services/AttachmentService.php`

```php
class AttachmentService
{
    public function __construct(
        protected AttachmentRepository $attachmentRepository
    ) {}

    /**
     * Stores an uploaded image on the public disk and records it against the
     * project, so the markdown body only ever has to carry the returned URL.
     */
    public function storeImage(Project $project, UploadedFile $file, User $uploader): Attachment
    {
        $path = $file->store("attachments/{$project->id}", 'public');

        return $this->attachmentRepository->create($project, [
            'user_id' => $uploader->id,
            'disk' => 'public',
            'path' => $path,
            'url' => Storage::url($path),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);
    }

    public function delete(Attachment $attachment): void
    {
        Storage::disk($attachment->disk)->delete($attachment->path);

        $this->attachmentRepository->delete($attachment);
    }
}
```

Storage handling mirrors `UserService::updateProfile()` — the
`public` disk, `Storage::url()` for what gets persisted and handed
to the frontend, never the raw storage path. Files are foldered per
project (`attachments/{project}/…`) so one project's uploads can be
inspected or purged on their own.

Unlike most services here this one writes **no** `ActivityLog` entry.
A paste-heavy description would otherwise flood a project's activity
feed with one row per screenshot; the meaningful event is the
description edit that follows, which `IssueService` already logs.

## Step 5 — The controller

File: `app/Http/Controllers/AttachmentController.php`

```php
class AttachmentController extends Controller
{
    public function __construct(
        protected AttachmentService $attachmentService
    ) {}

    /**
     * Unlike every other mutating endpoint in the app this one answers with
     * JSON rather than a redirect: the caller is the Tiptap editor's
     * paste/drop handler, which needs the stored URL back to insert an image
     * node - there is no page re-render to hang the result off.
     */
    public function store(Request $request, Project $project, NsfwDetectionService $nsfwDetection): JsonResponse
    {
        $this->authorize('view', $project);

        $request->validate([
            'file' => [
                'required',
                'image',
                'mimes:jpeg,png,gif,webp',
                'max:5120',
            ],
        ]);

        $file = $request->file('file');

        try {
            $isValid = $nsfwDetection->validate($file);
        } catch (Throwable $e) {
            Log::error('NSFW detection service failure during attachment upload: '.$e->getMessage(), [
                'exception' => $e,
                'project_id' => $project->id,
                'user_id' => $request->user()?->id,
            ]);

            return response()->json([
                'message' => 'Unable to verify image safety right now. Please try again later.',
            ], 503);
        }

        if (! $isValid) {
            return response()->json([
                'message' => 'This image cannot be used.',
            ], 422);
        }

        $attachment = $this->attachmentService->storeImage($project, $file, $request->user());

        return response()->json([
            'url' => $attachment->url,
            'name' => $attachment->original_name,
        ], 201);
    }
}
```

Three things worth copying verbatim into any future upload point:

- **`$this->authorize('view', $project)`** — uploading is gated on
  project membership, not on an issue/comment permission. The same
  endpoint serves descriptions, comments and templates, and each of
  those surfaces is already gated by its own policy before the editor
  is even editable.
- **The NSFW block** is the exact `try`/`catch` shape
  `UserController::uploadAvatar()` uses, with the same two distinct
  messages (service unreachable vs. image actually rejected), and it
  calls `validate()` rather than re-implementing
  `classify()`/`isUnsafe()`. See
  [`../content-moderation/01-add-moderation-to-a-new-upload-point.md`](../content-moderation/01-add-moderation-to-a-new-upload-point.md)
  — it fails **closed**: if the classifier is down, nothing is
  stored.
- **The service is called only after both gates pass**, so a
  rejected image never reaches the disk.

## Step 6 — The route

File: `routes/web.php`

```php
Route::post('/projects/{project}/attachments', [AttachmentController::class, 'store'])->name('projects.attachments.store');
```

Inside the existing `Route::middleware('auth')` group — the uploader
is the logged-in session, not a token; `axios` sends the session
cookie and Laravel's CSRF token like any other request from the page.

## Step 7 — Let this one route render JSON errors

File: `bootstrap/app.php`

```php
// Attachment uploads are the one web route answered with JSON rather
// than an Inertia redirect (the Tiptap paste/drop handler needs the
// stored URL back), so its failures - validation, a policy denial, a
// moderation rejection - have to come back as JSON too.
$exceptions->shouldRenderJsonWhen(
    fn (Request $request) => $request->is('api/*')
        || $request->is('projects/*/attachments'),
);
```

**This is the step that is easy to miss and impossible to debug from
the frontend.** `shouldRenderJsonWhen` is an app-wide override: with
only `$request->is('api/*')` in it, a failed `validate()` on a web
route redirects back with the errors in the session no matter what
`Accept` header the caller sent — so the paste handler would see a
`302` and an HTML body instead of a `422` and a message, and the user
would get a generic "could not be uploaded" toast for every distinct
failure. The path is matched (rather than `routeIs()`) because
validation can be thrown before the route is bound.

One consequence to be aware of: a **guest** hitting this route now
gets a `401` instead of a redirect to `/login`, which is what the
matching test asserts.

## Step 8 — The upload hook

File: `resources/js/hooks/useImageUpload.ts`

```ts
/**
 * Uploads an image to a project's attachment endpoint and resolves with the
 * stored URL, ready to be dropped into a markdown body.
 *
 * Every failure path (validation, NSFW rejection, the moderation service
 * being unreachable) surfaces as a toast here and re-throws, so the editor
 * that called it only has to care about the happy path.
 */
export const useImageUpload = (projectId: number) => {
    const { addAlert } = useAlert();
    const [isUploading, setIsUploading] = useState(false);

    const uploadImage = useCallback(
        async (file: File): Promise<string> => {
            const formData = new FormData();
            formData.append('file', file);

            setIsUploading(true);

            try {
                const { data } = await axios.post<{ url: string }>(
                    route('projects.attachments.store', projectId),
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data' } },
                );

                return data.url;
            } catch (error) {
                addAlert(resolveUploadError(error), 'error');

                throw error;
            } finally {
                setIsUploading(false);
            }
        },
        [projectId, addAlert],
    );

    return { uploadImage, isUploading };
};
```

This is the **single** place any surface talks to the upload
endpoint. It is deliberately plain `axios` rather than
`router.post()`: an Inertia visit re-renders the page from the
server's redirect and gives the caller nothing back, and a paste has
to continue in the editor that is still open and still focused.

Error text comes straight from the server where there is one —
`resolveUploadError()` prefers the validation message
(`errors.file[0]`, e.g. "The file must be an image."), falls back to
`message` (the moderation and service-failure strings from Step 5),
and only then to a generic sentence. Because it re-throws after
alerting, the editor's own handler needs no `catch` of its own beyond
skipping the insertion.

## Step 9 — Pull the image files out of a paste or drop

File: `resources/js/utils/imagePaste.ts`

```ts
/**
 * Pulls the image files out of a paste or drop payload.
 *
 * `files` is preferred and `items` is only consulted when it yields nothing:
 * a pasted screenshot is exposed through `items` alone in some browsers, but
 * in the ones that populate both, the very same image arrives twice - and the
 * two File objects can't be compared for identity (`getAsFile()` hands back a
 * fresh object, with its own `lastModified`), so the duplicate has to be
 * avoided rather than filtered out afterwards.
 */
export const extractImageFiles = (
    data: DataTransfer | null | undefined,
): File[] => {
    if (!data) return [];

    const isImage = (file: File) => file.type.startsWith('image/');

    const fromFiles = Array.from(data.files ?? []).filter(isImage);

    if (fromFiles.length > 0) return fromFiles;

    return Array.from(data.items ?? [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null && isImage(file));
};
```

Knowing about both `files` and `items` is what lets one helper serve
paste *and* drop: a screenshot pasted from the clipboard is exposed
only through `items` in several browsers, while a file dragged from
the file manager always lands in `files`.

**The order matters, and getting it wrong pastes every image twice.**
Plenty of browsers populate `files` *and* `items` for the same
clipboard image, and the two `File` objects cannot be recognised as
the same one after the fact: `getAsFile()` builds a fresh object with
its own `lastModified`, so any dedupe key including a timestamp lets
the pair through and the editor uploads and inserts the image twice.
Preferring `files` outright and only falling back to `items` when it
yields no image sidesteps the comparison entirely — and still reads
both sources, so neither browser shape is left out. Don't replace this
with a merge-then-dedupe.

Filtering on `type.startsWith('image/')` is what makes a pasted text
snippet, a copied Word fragment or a dropped PDF fall through
untouched to the editor's own default handling.

## Step 10 — Wire paste and drop into the editor

File: `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.tsx`

The component takes one new optional prop —
`onImageUpload?: (file: File) => Promise<string>` (declared on
`EditableMarkdownProps` in `resources/js/types/Components.ts`).
Leaving it out is what disables uploads for an instance, which is
exactly what the read-only integration-overview usage wants.

Paste goes through Tiptap's own `editorProps`:

```tsx
editorProps: {
    attributes: {
        class: 'prose max-w-none text-sm focus:outline-none',
    },
    handlePaste: (_view, event) => {
        const files = extractImageFiles(event.clipboardData);

        if (!canUploadImages() || files.length === 0) return false;

        event.preventDefault();
        void insertImages(files);

        return true;
    },
},
```

Returning `false` (no uploader, or nothing image-shaped in the
clipboard) hands the event back to Tiptap untouched, so pasting text,
HTML or a markdown snippet keeps working exactly as before.

Drop is handled on the **wrapper**, not through Tiptap's
`handleDrop`:

```tsx
/**
 * Drop is handled on the wrapper rather than through Tiptap's
 * `handleDrop`, because a file can be dropped onto the rendered
 * (non-editable) description too - that has to open the editor first.
 */
const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    setIsDraggingOver(false);

    const files = extractImageFiles(event.dataTransfer);

    if (!canUploadImages() || files.length === 0) return;

    event.preventDefault();

    startEditing();

    const droppedAt = editor?.view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
    })?.pos;

    void insertImages(files, droppedAt);
};
```

The editor spends most of its life with `editable: false` (that is
the whole click-to-edit design described in
[`README.md`](./README.md)), and a drop onto a non-editable
ProseMirror view is not delivered to `handleDrop`. Handling it on the
React wrapper means a drop anywhere on the rendered description opens
the editor and inserts at the drop point —
`view.posAtCoords()` translates the mouse position into a document
position, falling back to the caret when the drop lands outside any
text node.

The insertion itself:

```tsx
/**
 * Uploads sequentially and inserts each image as soon as its URL comes
 * back, so a multi-image paste doesn't wait for the slowest file - the
 * position is re-read from the live document every time rather than
 * pre-computed, because earlier insertions have already shifted it.
 */
const insertImages = async (files: File[], at?: number) => {
    if (!editor || !onImageUpload) return;

    setPendingUploads((count) => count + files.length);
    pendingUploadsRef.current += files.length;

    let position = at;

    for (const file of files) {
        try {
            const url = await onImageUpload(file);

            const target = Math.min(
                position ?? editor.state.selection.to,
                editor.state.doc.content.size,
            );

            editor
                .chain()
                .focus()
                .insertContentAt(target, {
                    type: 'image',
                    attrs: { src: url, alt: file.name },
                })
                .run();

            if (position !== undefined) {
                position = editor.state.selection.to;
            }
        } catch {
            // The uploader already reported the failure to the user; the
            // remaining files in this batch still get their turn.
        } finally {
            setPendingUploads((count) => Math.max(0, count - 1));
            pendingUploadsRef.current = Math.max(
                0,
                pendingUploadsRef.current - 1,
            );
        }
    }
};
```

`insertContentAt` with `{ type: 'image' }` needs the `Image`
extension that is already in the extension list; nothing new is
registered. `tiptap-markdown` serializes that node to
`![alt](url)`, so the saved column stays plain markdown and the
alt text is the original filename.

### Clicking a rendered image opens it

The wrapper's click handler is also what makes a stored image
behave like one — without this, clicking a screenshot in a
description opens the editor on top of it:

```tsx
/**
 * Clicking a rendered image opens the file instead of starting an edit -
 * the same behaviour a comment's images have. While editing it stays out
 * of the way, so the image node can still be selected and deleted.
 */
const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const image = (event.target as HTMLElement).closest?.('img');

    if (!isEditing && image?.src) {
        event.preventDefault();
        window.open(image.src, '_blank', 'noopener,noreferrer');

        return;
    }

    startEditing();
};
```

wired as `onClick={handleClick}` in place of the bare
`onClick={startEditing}`. The `!isEditing` guard is the whole
subtlety: while editing, a click has to reach ProseMirror so the
image node can be selected and deleted, and opening a tab on every
click would make the image impossible to remove.

The affordance goes in `resources/css/global.css`, since the wrapper
advertises click-to-edit with a text cursor:

```css
.tiptap img {
    cursor: zoom-in;
    border-radius: 0.5rem;
    border: 1px solid var(--border-color);
    max-height: 20rem;
}
```

Comments reach the same behaviour differently — their images are
real `<a target="_blank">` elements with `stopPropagation`, because
there the body is rendered by React rather than by ProseMirror (see
[`03-add-image-uploads-to-another-surface.md`](./03-add-image-uploads-to-another-surface.md)).

### The gotcha: blur must not end the edit mid-upload

`EditableMarkdown` commits on blur. Clicking away — or just the focus
shuffle a browser file dialog causes — while an upload is in flight
would run `commit()`, set `editable: false` and save, and the image
would then be inserted into an editor nobody is editing and never
persisted. Hence the ref, read by both exits:

```tsx
const commit = (ed: NonNullable<typeof editor>) => {
    if (pendingUploadsRef.current > 0) return;

    setIsEditing(false);
    ed.setEditable(false);

    const markdown = ed.storage.markdown.getMarkdown();
    if (markdown !== (value || '')) {
        onSave(markdown);
    }
};
```

A **ref**, not the `pendingUploads` state, because `commit()` is
called from a Tiptap callback that closed over an older render. The
state exists only for the "Uploading N images..." hint and the
drag-over ring.

## Step 11 — Use it on a page

File: `resources/js/Pages/Issues/Show.tsx`

```tsx
const { uploadImage } = useImageUpload(project.id);
```

```tsx
<EditableMarkdown
    value={issue.description || ''}
    onSave={(value) => updateIssue({ description: value })}
    onImageUpload={uploadImage}
    placeholder="Add a description..."
/>
```

That is the whole page-level wiring: the hook needs the project id,
the editor needs the uploader.

## Tests

- `tests/Feature/AttachmentControllerTest.php` — bind a
  `Mockery::mock(NsfwDetectionService::class)` into the container with
  `app()->instance(...)` and cover: a member uploading (asserts `201`,
  the `/storage/attachments/{project}/…` URL, the DB row and
  `Storage::disk('public')->assertExists()`), an unsafe image
  (`422`, nothing stored, nothing on disk), a classifier failure
  (`503`, nothing stored), a non-image (`422` with
  `assertJsonValidationErrors('file')`), a non-member (`403`) and a
  guest (`401`). Note two testing quirks: post files with
  `$this->post($uri, $data, ['Accept' => 'application/json',
  'X-Requested-With' => 'XMLHttpRequest'])` rather than `postJson()`
  (which cannot carry an `UploadedFile`), and build fixtures with
  `UploadedFile::fake()->create('shot.png', 100, 'image/png')`
  rather than `->image()`, which needs the GD extension.
- `tests/Feature/AttachmentServiceTest.php` — under
  `Storage::fake('public')`, assert `storeImage()` writes under
  `attachments/{project}/`, records disk/url/original name, and that
  `delete()` removes both the file and the row.
- `tests/Feature/AttachmentRepositoryTest.php` — `create()` scoping,
  `findForProject()` returning `null` for another project's
  attachment, `getForProject()` ordering newest-first, `delete()`.
- `tests/Feature/Models/AttachmentTest.php` — the `project`/`user`
  relations and that deleting a project cascades its attachments away.
- `resources/js/utils/imagePaste.test.ts` — files-only, items-only,
  a genuine multi-file drop returning every image, that non-images and
  non-file items are dropped, and — the regression that matters — that
  the same image offered through `files` *and* `items` as two distinct
  `File` objects comes back once.
- `resources/js/hooks/useImageUpload.test.ts` — mock `axios` and
  `@/context/AlertContext`; assert the `FormData` carries `file`, the
  `isUploading` flag flips around the request, and each error shape
  (`errors.file[0]`, `message`, non-HTTP) produces the right toast.
- `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.test.tsx` —
  the existing `FakeEditor` needs `chain().focus().insertContentAt()`,
  `state.selection`/`state.doc`, and a `view.posAtCoords()` stub, plus
  capturing `options.editorProps.handlePaste` in the `useEditor`
  mock. Cover: paste inserts at the caret, paste without an uploader
  or without an image returns `false`, a failed upload inserts
  nothing, drop starts editing and inserts at the drop position, drop
  while `disabled` does nothing, and blur during an in-flight upload
  does not call `onSave`. For the click behaviour the mock
  `EditorContent` also renders an `<img>` per markdown image link
  (standing in for the real `Image` extension's output), which lets
  three more cases assert that clicking an image calls `window.open`
  and does not start an edit, that clicking the text still does start
  one, and that clicking an image while editing opens nothing.
