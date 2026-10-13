# Add a new permission

The general, step-by-step pattern for adding **any** new
`projects.*`/`issues.*`/`comments.*` permission and getting it to show
up correctly in Settings → Roles & management — deciding who can do
what in a project, independent of which feature area the permission
belongs to. Worked example: the two permissions the integrations
system actually uses today, `projects.integrations.view` and
`projects.integrations.update` — but every step below applies
verbatim to a permission for any other feature.

## Step 1 — Add the enum case

File: `app/Enums/Permissions/Permission.php`

```php
enum Permission: string
{
    // ... existing cases ...

    case SETTINGS_VIEW = 'projects.settings.view';
    case SETTINGS_UPDATE = 'projects.settings.update';

    case INTEGRATIONS_VIEW = 'projects.integrations.view';
    case INTEGRATIONS_UPDATE = 'projects.integrations.update';
}
```

The string value's **dot structure matters** on the frontend (see step
5) — `group.subgroup.action` renders as a "Group" card with a
"Subgroup" section inside it. Stick to the existing `projects.`,
`issues.`, `comments.` prefixes unless you're introducing a genuinely
new top-level area.

## Step 2 — Decide who gets it by default

File: `app/Services/RoleService.php`

Every project gets four system roles (Owner, Admin, Member, Viewer).
Owner and Admin get **every permission that exists** —
`defaultPermissionIdsFor()` grants them `Permission::cases()` in full,
so you never need to touch anything in `RoleService` for those two
tiers *in new projects*. Projects whose system roles already exist are
not topped up automatically, though — see step 6 for the one-liner
that fixes that. You decide what **Member** and **Viewer** get by
default, by adding the new case(s) to the relevant
`*_DEFAULT_PERMISSIONS` constant(s):

```php
private const array MEMBER_DEFAULT_PERMISSIONS = [
    Permission::PROJECT_VIEW,
    Permission::MEMBERS_VIEW,
    Permission::ROLES_VIEW,
    Permission::SETTINGS_VIEW,
    Permission::INTEGRATIONS_VIEW, // <- added
    Permission::ISSUES_VIEW,
    // ...
];

private const array VIEWER_DEFAULT_PERMISSIONS = [
    Permission::PROJECT_VIEW,
    Permission::MEMBERS_VIEW,
    Permission::ROLES_VIEW,
    Permission::INTEGRATIONS_VIEW, // <- added
    Permission::ISSUES_VIEW,
];
```

Rule of thumb used throughout this codebase: give Member/Viewer the
`*_VIEW` half of a pair by default, never the `*_UPDATE`/`*_CREATE`/
`*_DELETE` half — mutating abilities are Owner/Admin-only (or granted
explicitly via a custom role) unless you have a specific reason to
open them up further. These defaults are seeded only when a project's
system role is first created (`ensureSystemRoles()`), so a new entry
reaches new projects only; existing projects keep whatever their admins
configured.

## Step 3 — Add the authorization check

Two options, pick based on whether the ability is about an existing
model or a whole feature area:

**Option A — add a method to an existing Policy** (most common). File:
`app/Policies/ProjectPolicy.php`:

```php
public function viewIntegrations(User $user, Project $project): bool
{
    return $project->hasPermission($user, Permission::INTEGRATIONS_VIEW);
}

public function updateIntegrations(User $user, Project $project): bool
{
    return $project->hasPermission($user, Permission::INTEGRATIONS_UPDATE);
}
```

`hasPermission()` (on `App\Models\Project`) is the **only** check —
there is no tier allow-list to maintain. Owner always passes; every
other member passes when any of their roles (their system role or a
custom role) has been granted the specific `Permission` through the
`permission_role` pivot. What Admin/Member/Viewer can do is therefore
decided purely by the permissions on those roles (the defaults from
step 2, as edited in Settings → Roles).

Call it from a controller with `$this->authorize('updateIntegrations', $project);`
(Laravel resolves `ProjectPolicy::updateIntegrations` automatically —
no explicit policy registration needed, see `app/Policies/*.php` for
the existing convention).

**Option B — create a dedicated Policy** when the ability is about
creating a not-yet-existing child resource (mirrors
`app/Policies/RolePolicy.php::create`):

```php
$this->authorize('create', [Role::class, $project]);
```

with

```php
public function create(User $user, Project $project): bool
{
    return $this->hasRolesOrSettingsAccess($user, $project, Permission::ROLES_CREATE);
}
```

Use Option B only when there's no instance yet to check against (e.g.
"can this user create a new X for this project" before the X exists).

## Step 4 — Expose it to the frontend

File: `app/Http/Controllers/SettingsController.php`

Compute the boolean **directly off the `Project` model**
(`hasPermission`) in the action for the tab that
needs it — each settings tab has its own action (see
[`../settings-tabs/README.md`](../settings-tabs/README.md)) — and
don't route through the Policy for these; Policies here are reserved
for authorizing actual mutating requests (`$this->authorize(...)` in a
controller action), while `SettingsController` computes plain booleans
for the UI to conditionally render:

```php
$hasIntegrationsAccess = $selectedProject?->hasPermission($user, PermissionEnum::INTEGRATIONS_VIEW) ?? false;
$canUpdateIntegrations = $hasIntegrationsAccess
    && $selectedProject->hasPermission($user, PermissionEnum::INTEGRATIONS_UPDATE);
```

The controller's private `can()` helper wraps the same
`hasPermission()` call (null-safe for "no project selected") for the
common case. Add both booleans to that action's
`Inertia::render(...)` props array — and only to that action's, so no
other tab pays for them — then thread them through the tab's page
(e.g. `Settings/Integrations.tsx`) into your tab component exactly the
way `canUpdateIntegrations` already is
(see [`../integrations/04-frontend-backend-wiring-overview.md`](../integrations/04-frontend-backend-wiring-overview.md)
for the full prop-threading list).

## Step 5 — Make it render well in Settings → Roles & management

The permission will show up **automatically**, grouped correctly, the
moment it exists in the `permissions` DB table (see step 6) — no
frontend grouping code needs to change. But its **label and
description** need a manual entry or it renders as a bare,
context-free word.

File: `resources/js/utils/permissions.ts` — add to `PERMISSION_META`:

```ts
'projects.integrations.view': {
    label: 'View integrations',
    description: 'See which integrations are connected to the project.',
},
'projects.integrations.update': {
    label: 'Manage integrations',
    description:
        'Connect, configure, or disconnect third-party integrations.',
},
```

Why this is needed: `getPermissionLabel()` looks up this map by the
full dotted key; if missing, it falls back to just the **last**
dot-segment, humanized — so `projects.integrations.view` without an
entry renders as the bare word **"View"** (colliding visually with
every other `*.view` permission) and an empty description. Always add
the entry in the same PR/commit that adds the enum case.

You only need to touch `resources/js/utils/permissionGroups.ts`
(`GROUP_META`) if you're introducing a **new top-level group** (the
part before the first dot) — `projects`, `issues`, and `comments`
already have entries. A new `projects.integrations.*` permission
reuses the existing `projects` group entry and gets its own
"Integrations" **subsection** for free, because
`getPermissionSection()` in `resources/js/utils/permissions.ts`
auto-derives the subsection label from the second dot-segment
(`humanize(parts[1])`) — no map needed for that part.

## Step 6 — Seed it into the database (don't skip this!)

`database/seeders/PermissionSeeder.php` loops `Permission::cases()` and
`updateOrCreate`s a row per case — it's what actually makes a new enum
case queryable via `PermissionModel`/`PermissionService::getAll()`. It
is **not** re-run automatically when you add an enum case:

- **Tests** are fine — `tests/Pest.php` calls
  `$this->seed(PermissionSeeder::class)` in a global `beforeEach`, so
  every test run always has every current enum case as a row.
- **Your local dev database (and every real environment) is not fine**
  until you run it yourself:
  ```bash
  php artisan db:seed --class=PermissionSeeder
  # or, inside Docker:
  make shell
  php artisan db:seed --class=PermissionSeeder
  ```
  This is idempotent (`updateOrCreate` keyed on `key`) — safe to run
  as often as you like, including in production after a deploy that
  adds new permission cases.

Seeding only creates the `permissions` row. Existing projects' Owner
and Admin system roles do **not** get it automatically (they are only
populated when first created), so also grant it to them:

```bash
php artisan permissions:grant-to-existing-roles projects.integrations.view projects.integrations.update
# default is --roles=owner,admin; the command is additive and safe to re-run
```

(Implemented in `app/Console/Commands/GrantPermissionsToExistingRoles.php`.)
Skip this and Admins of existing projects will be denied the new
ability until someone ticks it in Settings → Roles. Owner is never
affected — it passes every `hasPermission()` check unconditionally.

If you skip the seeding, `getPermissionLabel`/the whole Roles UI won't be
"broken" — the permission just won't exist as a row at all, so it
silently never appears in the list, and no role can ever be granted
it. If you ever see "I added a permission but it's nowhere in the UI",
this is almost always the reason — check with:

```bash
php artisan tinker --execute="App\Models\Permission::where('key', 'like', 'projects.integrations%')->get(['key','group'])"
```

## Step 7 — Tests

- `tests/Feature/PermissionSeederTest.php` — no change needed, it
  already asserts the seeder is idempotent and covers all current
  cases generically.
- `tests/Feature/RoleServiceTest.php` — the
  `'it creates the owner, admin, member and viewer system roles with
  their default permissions'` test asserts exact permission-id sets
  per tier; if you added the new case to `MEMBER_DEFAULT_PERMISSIONS`/
  `VIEWER_DEFAULT_PERMISSIONS`, update the expected list there.
- Whatever Policy method you added — cover it directly if it has
  interesting branching, or (more commonly) it's covered implicitly by
  the Controller test for the action it guards (see
  `tests/Feature/ProjectIntegrationControllerTest.php`'s "member
  without the integrations.update permission cannot toggle an
  integration" test for the shape to copy).
- `tests/Feature/SettingsControllerTest.php` — add
  `'settings page grants a[n] X access to Y'` tests hitting the tab's
  own route (`/settings/<tab>`) and asserting the new
  boolean prop for Owner/Admin (true), a plain Member (view-only:
  view=true, update=false), and a Viewer with no synced system role
  (false) — see the three `*integrations*` tests already there for the
  exact pattern.
