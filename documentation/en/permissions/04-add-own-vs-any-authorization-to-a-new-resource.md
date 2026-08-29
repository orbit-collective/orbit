# Add own-vs-any authorization to a new resource

Worked example: giving `SavedFilter` the same "you can always manage
your own, but need a broader permission to manage anyone else's"
shape `Comment` already has — closing the gap
[`../saved-filters/README.md`](../saved-filters/README.md) flags
(today, any project member can delete *any* saved filter, with no
ownership distinction at all).

## The pattern, as `CommentPolicy` already establishes it

File: `app/Policies/CommentPolicy.php`

```php
private const array OWN_TIERS = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER];

private const array ANY_TIERS = [RoleType::OWNER, RoleType::ADMIN];

public function update(User $user, Comment $comment): bool
{
    $project = $comment->issue->project;

    if ($comment->user_id === $user->id) {
        return $project->hasPermissionOrTier($user, Permission::COMMENTS_UPDATE_OWN, self::OWN_TIERS);
    }

    return $project->hasPermissionOrTier($user, Permission::COMMENTS_UPDATE_ANY, self::ANY_TIERS);
}
```

The shape is always the same: check who owns the resource first, then
branch to one of **two separate permissions** — a `*_own` one with a
wider tier allow-list (every tier that can act at all) and a `*_any`
one with a narrower one (only tiers trusted to touch other people's
things) — never a single permission with an ownership check bolted on
inline. This is what lets a custom role grant "edit your own comments"
without also granting "edit anyone's."

## Step 1 — Add an owner column

New migration:

```php
Schema::table('saved_filters', function (Blueprint $table) {
    $table->foreignId('user_id')->nullable()->after('project_id')->constrained()->nullOnDelete();
});
```

Nullable, so existing rows created before this change don't need a
backfill to remain valid — an "unowned" saved filter simply never
matches the "own" branch below and always falls through to the `_any`
check.

## Step 2 — Add the two permissions

Following
[`01-add-a-new-permission.md`](./01-add-a-new-permission.md)'s
pattern exactly:

```php
// app/Enums/Permissions/Permission.php
case SAVED_FILTERS_DELETE_OWN = 'saved_filters.delete_own';
case SAVED_FILTERS_DELETE_ANY = 'saved_filters.delete_any';
```

```php
// app/Services/RoleService.php
private const array MEMBER_DEFAULT_PERMISSIONS = [
    // ...existing entries...
    Permission::SAVED_FILTERS_DELETE_OWN,
];
```

Only `_OWN` goes into `MEMBER_DEFAULT_PERMISSIONS` (Viewer gets
neither, matching its read-only default posture) — `_ANY` is
deliberately left out of every non-Owner/Admin default, exactly the
comment permissions' precedent.

## Step 3 — Write the Policy

New file: `app/Policies/SavedFilterPolicy.php`

```php
<?php

namespace App\Policies;

use App\Enums\Permissions\Permission;
use App\Enums\Permissions\RoleType;
use App\Models\SavedFilter;
use App\Models\User;

class SavedFilterPolicy
{
    private const array OWN_TIERS = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER];

    private const array ANY_TIERS = [RoleType::OWNER, RoleType::ADMIN];

    public function delete(User $user, SavedFilter $savedFilter): bool
    {
        $project = $savedFilter->project;

        if ($savedFilter->user_id === $user->id) {
            return $project->hasPermissionOrTier($user, Permission::SAVED_FILTERS_DELETE_OWN, self::OWN_TIERS);
        }

        return $project->hasPermissionOrTier($user, Permission::SAVED_FILTERS_DELETE_ANY, self::ANY_TIERS);
    }
}
```

File: `app/Http/Controllers/SavedFilterController.php`

```php
public function destroy(SavedFilter $savedFilter): RedirectResponse
{
    $this->authorize('delete', $savedFilter);

    $this->savedFilterService->delete($savedFilter);

    return redirect()->back()->with('success', 'Saved filters has been deleted successfully.');
}
```

replacing the old `$this->authorize('view', $savedFilter->project)` —
this is why the pattern belongs in a dedicated Policy method rather
than inline in the Controller: `authorize('delete', $savedFilter)`
resolves to `SavedFilterPolicy::delete` automatically (Laravel's
Policy auto-discovery, keyed on the model class), no explicit
registration needed, same as every other Policy in this codebase.

## Step 4 — Store the owner on create

File: `app/Services/SavedFilterService.php` (see
[`../saved-filters/01-extract-the-service-layer.md`](../saved-filters/01-extract-the-service-layer.md)
if this doesn't exist yet in your checkout)

```php
public function create(Project $project, array $data): SavedFilter
{
    $filter = $this->savedFilterRepository->create([
        ...$data,
        'user_id' => auth()->id(),
    ]);

    $this->activityLogService->log($project->id, "Saved a new filter: \"{$filter->name}\"");

    return $filter;
}
```

## Step 5 — Expose it to the frontend, if the UI needs to know

Following the same convention
[`01-add-a-new-permission.md`](./01-add-a-new-permission.md)'s step 4
uses — compute the boolean directly off the model/Gate for a
UI-facing prop, the same way `Comment` does it as a **model-appended
attribute** rather than a Controller-computed one:

```php
// app/Models/SavedFilter.php
protected $appends = ['can_delete'];

public function getCanDeleteAttribute(): bool
{
    return auth()->check() && Gate::forUser(auth()->user())->allows('delete', $this);
}
```

Add `use Illuminate\Support\Facades\Gate;` to the model's imports.
Reach for this **model-appended-attribute** shape (rather than
computing the boolean in the Controller and threading it through as a
separate prop, the way `SettingsController` does for
`canUpdateIntegrations`) specifically when the resource is already
serialized as a list of model instances sent straight to the frontend
— `can_delete` then travels for free with every filter in the array,
with no separate parallel array of ids-that-are-deletable to keep in
sync.

## Tests

- `tests/Feature/SavedFilterControllerTest.php` — add "the owner can
  delete their own saved filter", "a non-owner member without
  `saved_filters.delete_any` cannot delete someone else's filter", and
  "an admin can delete any member's saved filter", mirroring
  `tests/Feature/CommentControllerTest.php`'s own/any test shapes
  exactly.
- `tests/Feature/Models/SavedFilterTest.php` — add a test asserting
  `can_delete` reflects the Policy decision for both the owner and a
  non-owner, mirroring `tests/Feature/Models/CommentTest.php`'s
  `can_edit`/`can_delete` coverage.
- `tests/Feature/RoleServiceTest.php` — update the exact
  permission-id-set assertions for Member/Viewer defaults to include
  the two new cases, the same update
  [`01-add-a-new-permission.md`](./01-add-a-new-permission.md)'s own
  tests section calls out.
