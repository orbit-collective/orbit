# Roles & permissions (RBAC)

Every project has its own role-based access control: four built-in
**system role tiers** (Owner, Admin, Member, Viewer) plus any number of
project-defined **custom roles**, both built out of the same
`Role`/`Permission` pivot chain. This category documents that whole
system — the data model, how a check actually resolves, and the two
things you're most likely to need to extend: a brand-new tier, and a
new place in the app that grants a role.

## Guides, in the order you'd actually need them

1. **[Add a new system role tier](./01-add-a-new-role-tier.md)** —
   worked example adding a fifth tier (`Contributor`, between Member
   and Viewer) end to end: the enum, default permissions, every
   tier-gated Policy check, the frontend types, and the tests that
   pin down the tier list.
2. **[Grant a custom role in bulk](./02-grant-a-custom-role-in-bulk.md)**
   — worked example adding a new place that assigns a custom role to
   members (a "grant to all current members" action), covering the
   critical `syncRoles` (replace) vs. `attachRoles` (additive) distinction.

See [`../integrations/02-add-a-new-permission.md`](../integrations/02-add-a-new-permission.md)
for the general pattern of adding a brand-new `Permission` enum case
(it isn't repeated here since it applies to any `projects.*`/`issues.*`/
`comments.*` permission, not just this category).

## The architecture in one paragraph

A project's four system tiers (`App\Enums\Permissions\RoleType`: Owner,
Admin, Member, Viewer) are lazily materialized as real `roles` rows
(`is_system = true`) by `RoleService::ensureSystemRoles()` — so a
tier's permissions live in the exact same `permission_role` pivot table
as any user-created **custom role** (`role = 'custom'`), just seeded
with sensible defaults the first time the tier's row is created.
Membership itself is a single string column, `project_user.role`,
holding the member's base tier; everything they're actually *granted*
is resolved separately by walking
`project_user` → `project_user_role` → `roles` → `permission_role` →
`permissions` (see `Project::hasPermission()`). Because that walk is a
few joins deep, most authorization checks don't call it directly —
they call `Project::hasPermissionOrTier($user, $permission, $tiers)`,
which first checks the member's base tier against a cheap allow-list
(no query beyond the membership row) and only falls through to the
full permission walk for members whose tier isn't in that list, or who
hold a custom role on top of their tier. Owner is special-cased to
always pass every check, both for performance and because the Owner
system role is reset back to "every permission" on every
`ensureSystemRoles()` call and can never be edited (`RoleService::assertNotOwnerRole()`).
A member can hold their one base tier *and* any number of custom
roles simultaneously — `ProjectMemberService::syncRoles()` /
`ProjectInvitationService::invite()`'s `roleIds` only ever touch the
custom-role side of `project_user_role`, never the tier.
