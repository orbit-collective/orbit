# Add moderation to a new upload point

Worked example: adding a project **cover image** upload — a feature
that doesn't exist yet — with the exact same NSFW screening
`UserController::uploadAvatar()` already applies to profile photos.
Avatar upload is the *only* upload point in the app today; this guide
is the pattern for a second one.

## Step 1 — Add the migration + fillable field

New migration, and an addition to `Project`'s `$fillable`:

```php
Schema::table('projects', function (Blueprint $table) {
    $table->string('cover_image')->nullable()->after('color');
});
```

```php
// app/Models/Project.php
protected $fillable = [
    'id',
    'name',
    'slug',
    'description',
    'color',
    'cover_image', // new
    'columns',
    'role',
    'is_system',
];
```

## Step 2 — Add the Service method

File: `app/Services/ProjectService.php`

```php
public function updateCoverImage(Project $project, ?UploadedFile $coverImageFile): Project
{
    if ($project->cover_image) {
        Storage::disk('public')->delete(str_replace('/storage/', '', $project->cover_image));
    }

    $path = $coverImageFile->store('project-covers', 'public');

    $updatedProject = $this->projectRepository->update($project, [
        'cover_image' => Storage::url($path),
    ]);

    $this->activityLogService->log($project->id, 'Uploaded a new cover image');

    return $updatedProject;
}
```

This mirrors `UserService::updateProfile()`'s storage handling exactly
— delete the old file first (if any), `store()` the new one on the
`public` disk, save the public URL, not the raw storage path.

## Step 3 — Validate + classify in the Controller

File: `app/Http/Controllers/ProjectController.php`

```php
public function uploadCoverImage(Request $request, Project $project, NsfwDetectionService $nsfwDetection): RedirectResponse
{
    $this->authorize('updateDetails', $project);

    $request->validate([
        'cover_image' => [
            'required',
            'image',
            'mimes:jpeg,png,gif',
            'max:5120',
        ],
    ]);

    $coverImage = $request->file('cover_image');

    try {
        $isValid = $nsfwDetection->validate($coverImage);
    } catch (Throwable $e) {
        Log::error('NSFW detection service failure during cover image upload: '.$e->getMessage(), [
            'exception' => $e,
            'project_id' => $project->id,
        ]);

        return back()->withErrors([
            'cover_image' => 'Unable to verify image safety right now. Please try again later.',
        ])->with('error', 'Unable to verify image safety right now. Please try again later.');
    }

    if (! $isValid) {
        return back()->withErrors([
            'cover_image' => 'This image cannot be used.',
        ])->with('error', 'This image cannot be used.');
    }

    $this->projectService->updateCoverImage($project, $coverImage);

    return redirect()->back()->with('success', 'Project cover image updated successfully.');
}
```

Every piece of this — the validation rules (`image`, `mimes`, `max`),
the `try`/`catch` shape, the two distinct error messages (service
failure vs. actually-unsafe image), and reusing `$nsfwDetection->validate()`
rather than calling `classify()`/`isUnsafe()` directly — is copied
verbatim from `UserController::uploadAvatar()`. Don't reimplement the
classify/threshold logic per upload point; `validate()` is the one
public entry point every caller should use, exactly like every
existing call site does.

Add `use App\Services\NsfwDetectionService;`, `use Illuminate\Support\Facades\Log;`,
and `use Throwable;` to the controller's imports if not already
present.

## Step 4 — Route

File: `routes/web.php`

```php
Route::post('/projects/{project}/cover-image', [ProjectController::class, 'uploadCoverImage'])->name('projects.cover-image.update');
```

## Tests

There is, surprisingly, **no existing test at all** for
`uploadAvatar()`, `NsfwDetectionService`, or the NSFW-rejection path
today — `tests/Feature/UserControllerTest.php` covers onboarding,
renaming, password changes, and sessions, but nothing exercises the
avatar upload endpoint. Don't take "there's nothing to mirror" as a
sign it doesn't need covering — write both a fresh set for this new
endpoint and, ideally, the missing avatar-upload coverage while you're
in the area:

- `tests/Feature/ProjectControllerTest.php` — add, for
  `uploadCoverImage()`: a valid-image case (mock
  `NsfwDetectionService::validate()` to return `true`, assert the
  project's `cover_image` is updated), a rejected-image case (mock it
  to return `false`, assert the `422`/validation error and that
  `cover_image` is unchanged), and a service-failure case (mock
  `classify()`/`validate()` to throw, assert the "try again later"
  error and that nothing was stored).
- `tests/Feature/ProjectServiceTest.php` — a test for
  `updateCoverImage()` asserting the old file is deleted (via
  `Storage::fake('public')` and `Storage::disk('public')->assertMissing(...)`)
  when one existed, the new path is stored, and an `ActivityLog` entry
  is written.
- `tests/Feature/NsfwDetectionServiceTest.php` (new file, if adding
  this alongside — it doesn't exist yet either) — unit-test
  `isUnsafe()`'s threshold logic directly with fixture prediction
  arrays: at/above/below `NSFW_THRESHOLD` for `Porn`/`Hentai`, and the
  separate `0.90` cutoff for `Sexy`.
