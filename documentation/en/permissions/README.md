# Roles & permissions (RBAC)

Every project has its own role-based access control: four built-in
**system role tiers** (Owner, Admin, Member, Viewer) plus any number of
project-defined **custom roles**, both built out of the same
`Role`/`Permission` pivot chain. This category documents that whole
system — the data model, how a check actually resolves, and the two
things you're most likely to need to extend: a brand-new tier, and a
new place in the app that grants a role.

## Guides, in the order you'd actually need them

1. **[Add a new permission](./01-add-a-new-permission.md)** — the
   general pattern for adding a brand-new `projects.*`/`issues.*`/
   `comments.*` `Permission` case: who can do what, and how it shows up
   in Settings → Roles & management. Start here for "I need to gate a
   new action behind its own permission."
2. **[Add a new system role tier](./02-add-a-new-role-tier.md)** —
   worked example adding a fifth tier (`Contributor`, between Member
   and Viewer) end to end: the enum, its default permission set, the
   backfill of a system role for every existing project, the frontend
   types, and the tests that pin down the tier list.
3. **[Grant a custom role in bulk](./03-grant-a-custom-role-in-bulk.md)**
   — worked example adding a new place that assigns a custom role to
   members (a "grant to all current members" action), covering the
   critical `syncRoles` (replace) vs. `attachRoles` (additive) distinction.
4. **[Add own-vs-any authorization to a new resource](./04-add-own-vs-any-authorization-to-a-new-resource.md)**
   — the `CommentPolicy` pattern (two permissions, `*_own` and
   `*_any`, checked after an ownership comparison) applied to a
   resource that doesn't have it yet (`SavedFilter`), plus when to
   expose the resulting boolean as a model-appended attribute instead
   of a Controller-computed prop.

## The architecture in one paragraph

A project's four system tiers (`App\Enums\Permissions\RoleType`: Owner,
Admin, Member, Viewer) are lazily materialized as real `roles` rows
(`is_system = true`) by `RoleService::ensureSystemRoles()` — so a
tier's permissions live in the exact same `permission_role` pivot table
as any user-created **custom role** (`role = 'custom'`,
`is_system = false`), just seeded with sensible defaults
(`RoleService`'s `MEMBER_DEFAULT_PERMISSIONS`/
`VIEWER_DEFAULT_PERMISSIONS`; Owner and Admin get every permission)
the first time the tier's row is created. There is no separate
"tier" column anywhere: a member's tier **is** their single *system
role*, assigned through the same `project_user_role` pivot as their
custom roles (`project_user` → `project_user_role` → `roles` →
`permission_role` → `permissions`). A pending invitation works the
same way — its tier is stored as a system role in
`project_invitation_role`, next to any custom roles
(`ProjectInvitation::tier()` / `customRoleIds()`). The legacy string
columns `project_user.role` and `project_invitations.role` no longer
exist.

Every authorization check goes through one method,
`Project::hasPermission($user, Permission::X)`: Owner short-circuits
to `true` (and the Owner system role is reset back to "every
permission" on every `ensureSystemRoles()` call and can never be
edited — `RoleService::assertNotOwnerRole()`), and everything else is
the union of the permissions of all the member's roles, resolved from
a per-user membership cache (`Project::membershipOf()`, invalidated
via `CacheVersion::MEMBERSHIP`). There are no tier allow-lists in
Policies or Controllers: editing a system role (anything but Owner)
in Settings → Roles really changes what its members can do.
`Project::roleOf()` still returns the tier string
(`owner`/`admin`/`member`/`viewer`), derived from the system role —
it is for display and for the few places that really are tier based
(e.g. an issue type's `restricted_role_types`, which still stores tier
strings and is compared against `roleOf()`).

A member can hold their one system role *and* any number of custom
roles simultaneously. Tier changes only go through
`RoleService::syncSystemRoleForMember()` (member role change,
ownership transfer, project creation, invitation accept); the
free-form roles sync endpoint and an invitation's `roleIds` only
accept custom roles (`RoleService::customRoleIds()`), and
`ProjectMemberRepository::syncRoles()` keeps the member's system role
untouched.

## Upgrading from the old model

Before the role migration, the tier was a string column
(`project_user.role`, `project_invitations.role`) and Policies called
`hasPermissionOrTier($user, $permission, $tiers)` with hardcoded
`*_TIERS` allow-lists. Two migrations moved existing data over:

- `2026_10_13_100000_backfill_system_roles_for_existing_members.php`
  created the four system roles for **every existing project**,
  assigned every member and every pending invitation the system role
  matching its old tier, topped up Owner/Admin with every permission,
  and gave ownerless projects an owner (the earliest member, then
  alphabetical).
- `2026_10_13_110000_drop_legacy_role_columns.php` dropped the two
  legacy columns.

`Project::hasPermissionOrTier()` and every `*_TIERS` constant were
removed. In tests, add members with `addProjectMember()` from
`tests/Pest.php` (membership row + system role), never
`attach(['role' => ...])`.
