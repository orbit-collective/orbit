# Add a new system role tier

Worked example: adding a fifth tier, **Contributor**, sitting between
Member and Viewer — it can view everything a Member can and create
issues/comments, but can't delete anything or manage members/roles/
settings. No migration is needed anywhere in this guide: a role's
`role` column is just a string, so a new `RoleType` case is valid the
moment the enum knows about it.

Tiers are intentionally hardcoded in a handful of places rather than
driven by an ordered table, so this touches more files than adding a
plain permission does (see
[`./01-add-a-new-permission.md`](./01-add-a-new-permission.md)
for that, much shorter, guide). Do every step below — skipping one
doesn't crash anything, it just leaves Contributor unable to do
something Member-adjacent that it should be able to do.

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

## Step 3 — Audit every tier-gated Policy check

Every `hasPermissionOrTier($user, $permission, $tiers)` call hardcodes
its own allow-list of tiers, so a new tier is invisible to a check
until you explicitly decide it belongs there. These are every existing
call site — go through each and decide whether Contributor should be
included:

- `app/Policies/IssuePolicy.php` — `MODIFY_TIERS = [OWNER, ADMIN, MEMBER]`
- `app/Policies/CommentPolicy.php` — `OWN_TIERS = [OWNER, ADMIN, MEMBER]`, `ANY_TIERS = [OWNER, ADMIN]`
- `app/Policies/ProjectPolicy.php` — `updateDetails`, `inviteMembers`, `updateMemberRole`, `removeMember`, `viewIntegrations`, `updateIntegrations`
- `app/Http/Controllers/SettingsController.php` — `$viewTiers` and the two inline tier arrays for `PROJECT_UPDATE`/`PROJECT_DELETE`

For this worked example, Contributor gets issue/comment creation and
its own edits, but not moderation or deletion, so:

```php
// app/Policies/IssuePolicy.php
private const array MODIFY_TIERS = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER, RoleType::CONTRIBUTOR];
```

leave `CommentPolicy::ANY_TIERS` and every `ProjectPolicy`/
`SettingsController` tier list **unchanged** — Contributor relies on
its `CONTRIBUTOR_DEFAULT_PERMISSIONS` (`COMMENTS_CREATE`,
`COMMENTS_UPDATE_OWN`) for comments instead of a tier fast-path, and
has no business managing members/settings/integrations. This is the
judgment call this step exists for: a tier doesn't have to appear in
every allow-list, only the ones matching what you decided it can do in
Step 2.

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

## Step 6 — Seed permissions before testing manually

The `permissions` table needs no changes for a new tier (it's already
fully seeded via `PermissionSeeder`, see
[`./01-add-a-new-permission.md`](./01-add-a-new-permission.md)
step 6) — Contributor's row gets created and its defaults synced
automatically, the first time `ensureSystemRoles()` runs for any
project (on project creation, or the next time any member's role
changes). To see it immediately on an existing local project:

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
  the pivot correctly for the new tier.
- `tests/Feature/Models/RoleTest.php` — if it enumerates `RoleType`
  cases anywhere, add Contributor to the expected list.
- Any Policy behavior you changed in Step 3 (`IssuePolicy::MODIFY_TIERS`
  in this example) is covered implicitly through
  `tests/Feature/IssueControllerTest.php` — add a "a contributor can
  create an issue but cannot delete one" test there, mirroring the
  existing Member-tier tests.
- `resources/js/utils/roleTheme.test.ts` (if present) or whichever test
  iterates `ROLE_TYPE_THEME`/`RoleTypeValue` — add `contributor` so a
  missing theme entry fails loudly instead of rendering blank.
