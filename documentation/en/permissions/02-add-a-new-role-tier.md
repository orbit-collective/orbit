# Add a new system role tier

Worked example: adding a fifth tier, **Contributor**, sitting between
Member and Viewer — it can view everything a Member can and create
issues/comments, but can't delete anything or manage members/roles/
settings.

A tier is just a **system role** (`roles.is_system = true`,
`roles.role = <RoleType value>`) that every project owns exactly one
row of, so adding one is mostly data: a new `RoleType` case, its
default permission set in `RoleService`, and a data migration that
creates the new system role in every *existing* project (new projects
get it automatically from `ensureSystemRoles()`). There are **no
tier lists to maintain in Policies or Controllers** — every check is
`Project::hasPermission($user, Permission::X)`, so the new tier is
authorized purely by the permissions on its role. No schema change is
needed either: `roles.role` is a plain string, so a new `RoleType`
case is valid the moment the enum knows about it.

For the much shorter "gate a new action" case see
[`./01-add-a-new-permission.md`](./01-add-a-new-permission.md).

## Step 1 — Add the enum case

File: `app/Enums/Permissions/RoleType.php`

```php
<?php

namespace App\Enums\Permissions;

enum RoleType: string
{
    case OWNER = 'owner';
    case ADMIN = 'admin';
    case MEMBER = 'member';
    case CONTRIBUTOR = 'contributor';
    case VIEWER = 'viewer';
    case CUSTOM = 'custom';
}
```

## Step 2 — Register it as a system tier and decide its default permissions

File: `app/Services/RoleService.php`

Add the case to `SYSTEM_ROLE_TYPES` (this is what makes
`ensureSystemRoles()` create/seed a `roles` row for it on every
project) and give it its own `*_DEFAULT_PERMISSIONS` constant:

```php
private const array SYSTEM_ROLE_TYPES = [
    RoleType::OWNER,
    RoleType::ADMIN,
    RoleType::MEMBER,
    RoleType::CONTRIBUTOR,
    RoleType::VIEWER,
];

/**
 * A step down from Member: can view and contribute (issues, comments)
 * but can't delete anything or touch members/roles/settings.
 */
private const array CONTRIBUTOR_DEFAULT_PERMISSIONS = [
    Permission::PROJECT_VIEW,
    Permission::MEMBERS_VIEW,
    Permission::ROLES_VIEW,
    Permission::INTEGRATIONS_VIEW,
    Permission::ISSUES_VIEW,
    Permission::ISSUES_CREATE,
    Permission::ISSUES_UPDATE,
    Permission::COMMENTS_CREATE,
    Permission::COMMENTS_UPDATE_OWN,
];
```

Then add the matching arm to `defaultPermissionIdsFor()`:

```php
private function defaultPermissionIdsFor(RoleType $role): array
{
    $keys = match ($role) {
        RoleType::OWNER, RoleType::ADMIN => array_map(fn (Permission $permission) => $permission->value, Permission::cases()),
        RoleType::MEMBER => array_map(fn (Permission $permission) => $permission->value, self::MEMBER_DEFAULT_PERMISSIONS),
        RoleType::CONTRIBUTOR => array_map(fn (Permission $permission) => $permission->value, self::CONTRIBUTOR_DEFAULT_PERMISSIONS),
        RoleType::VIEWER => array_map(fn (Permission $permission) => $permission->value, self::VIEWER_DEFAULT_PERMISSIONS),
        RoleType::CUSTOM => [],
    };

    return PermissionModel::query()->whereIn('key', $keys)->pluck('id')->all();
}
```

Nothing else in `RoleService` needs to change — `ensureSystemRoles()`,
`syncSystemRoleForMember()`, `createRole()`, `syncPermissions()`, and
the Owner/system-role guards all operate on `SYSTEM_ROLE_TYPES`/
`RoleType` generically.

## Step 3 — Policies need no change

Unlike the old tier-list model, there is nothing to audit here:
`IssuePolicy`, `CommentPolicy`, `ProjectPolicy` and
`SettingsController` all call `hasPermission()` and nothing else, so
Contributor can create issues and comments (and edit its own comments)
because `CONTRIBUTOR_DEFAULT_PERMISSIONS` from Step 2 contains
`ISSUES_CREATE`, `ISSUES_UPDATE`, `COMMENTS_CREATE` and
`COMMENTS_UPDATE_OWN`, and cannot delete or manage anything because it
doesn't contain those. The judgment call that used to be repeated in
every Policy now lives in exactly one place: the default permission
set you chose in Step 2 (which admins can then adjust per project in
Settings → Roles — editing any system role except Owner really
changes what its members can do).

Two places do still look at the tier string itself, via
`Project::roleOf()`: an issue type's `restricted_role_types`
(`IssuePolicy::createOfType()`) stores tier strings, so the new tier
simply becomes an extra value an admin may pick there, and the
display code (badges, dropdowns) that reads the tier. Check
`restricted_role_types` handling if Contributor should be selectable.

## Step 4 — Make it assignable

File: `app/Http/Controllers/ProjectMemberController.php` and
`app/Http/Controllers/ProjectInvitationController.php`

Both already validate the incoming role with
`Rule::enum(RoleType::class)->except([RoleType::OWNER, RoleType::CUSTOM])`
— a **deny-list**, not an allow-list, so a brand new case is assignable
automatically. Nothing to change here unless you want Contributor to
be *unassignable* through these flows (unlikely), in which case add it
to the `except([...])` array in both files.

## Step 5 — Frontend types and theming

File: `resources/js/types/Roles.ts`

```ts
export type RoleTypeValue =
    | 'owner'
    | 'admin'
    | 'member'
    | 'contributor'
    | 'viewer'
    | 'custom';
```

File: `resources/js/types/ProjectMembers.ts`

```ts
export type ProjectMemberRole =
    | 'owner'
    | 'admin'
    | 'member'
    | 'contributor'
    | 'viewer';
export type AssignableProjectMemberRole = Exclude<ProjectMemberRole, 'owner'>;
```

File: `resources/js/utils/roleTheme.ts` — add a `contributor` entry to
`ROLE_TYPE_THEME` (this is what every role badge, the tier dropdown,
and the roles sidebar read to render a label/color/icon — miss this
and Contributor renders with `undefined` styling wherever it's typed
correctly but has no theme entry):

```ts
contributor: {
    label: 'Contributor',
    dot: 'bg-teal-400',
    ring: 'stroke-teal-400',
    badgeClass: 'bg-teal-400/10 text-teal-400',
    gradient: 'from-teal-400/20 to-teal-400/5',
    icon: 'PenLine',
},
```

## Step 6 — Backfill the system role for existing projects

`ensureSystemRoles()` creates the Contributor role for a project the
next time it runs there (project creation, a member's role change, an
invitation), but until then an existing project simply has no
Contributor role, and an admin couldn't pick it. Create it everywhere
with a data migration, modelled on
`database/migrations/2026_10_13_100000_backfill_system_roles_for_existing_members.php`:

```php
return new class extends Migration
{
    public function up(): void
    {
        $roleService = app(RoleService::class);

        Project::query()->chunkById(100, function ($projects) use ($roleService) {
            foreach ($projects as $project) {
                $roleService->ensureSystemRoles($project);
            }
        });

        CacheVersion::bump(CacheVersion::MEMBERSHIP);
    }

    public function down(): void {}
};
```

`ensureSystemRoles()` is idempotent: it only seeds default permissions
for a role it has *just created*, so existing Owner/Admin/Member/Viewer
roles — and any customization admins made to them — are left alone.
Nobody is assigned the new role by this migration; members move onto
it through the normal role-change flow
(`RoleService::syncSystemRoleForMember()`).

The `permissions` table itself needs no change for a new tier (it is
already fully seeded via `PermissionSeeder`, see
[`./01-add-a-new-permission.md`](./01-add-a-new-permission.md)
step 6). To see the role immediately on an existing local project
without migrating:

```bash
php artisan tinker --execute="app(App\Services\RoleService::class)->ensureSystemRoles(App\Models\Project::first())"
# or, inside Docker:
make shell
php artisan tinker --execute="app(App\Services\RoleService::class)->ensureSystemRoles(App\Models\Project::first())"
```

## Step 7 — Tests

- `tests/Feature/RoleServiceTest.php` — the
  `'it creates the owner, admin, member and viewer system roles with
  their default permissions'` test asserts the exact tier key list
  (`['owner', 'admin', 'member', 'viewer']`) and the exact "idempotent,
  4 system roles" count in `'it is idempotent and does not duplicate
  system roles'` — both need updating to 5/`contributor` included.
- `tests/Feature/ProjectMemberServiceTest.php` /
  `tests/Feature/ProjectMemberControllerTest.php` — add a "can promote
  a member to contributor" test mirroring the existing "can promote a
  member to admin" one, and confirm `syncSystemRoleForMember` swaps
  the pivot correctly for the new tier. In tests add members with
  `addProjectMember($project, $userId, 'contributor')` from
  `tests/Pest.php` (membership row + system role), never
  `attach(['role' => ...])`.
- `tests/Feature/Models/RoleTest.php` — if it enumerates `RoleType`
  cases anywhere, add Contributor to the expected list.
- Behavior of the tier itself is covered through the Controller tests
  of the actions it can/can't perform — add "a contributor can create
  an issue but cannot delete one" to `tests/Feature/IssueControllerTest.php`,
  mirroring the existing Member-tier tests. No Policy was changed, so
  this exercises `CONTRIBUTOR_DEFAULT_PERMISSIONS` end to end.
- `resources/js/utils/roleTheme.test.ts` (if present) or whichever test
  iterates `ROLE_TYPE_THEME`/`RoleTypeValue` — add `contributor` so a
  missing theme entry fails loudly instead of rendering blank.
