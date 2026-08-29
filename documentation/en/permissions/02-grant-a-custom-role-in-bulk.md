# Grant a custom role in bulk

Worked example: a new "Grant to all current members" action on a
custom role, so a project owner/admin can hand every existing member a
role (e.g. a newly created "QA Lead" role) without opening each
member's role picker one by one.

The one rule that matters most in this guide: granting a custom role
to a member must **never** touch their system tier. Every existing
write path that assigns roles already respects this by using two
different repository methods for two different jobs —
`ProjectMemberRepository::syncRoles()` (**replaces** the member's
custom roles) for the per-member "edit this member's custom roles"
UI, and `ProjectMemberRepository::attachRoles()` (**additive**, never
detaches) for `ProjectInvitationService::acceptByToken()`, which grants
whatever custom roles were attached to the invitation on top of
whatever system tier the invite specified. A bulk-grant action is
closer to the invitation case — it's *adding* one role to many people,
not replacing each person's whole custom-role set — so it must use
`attachRoles()`, not `syncRoles()`.

## Step 1 — Add the service method

File: `app/Services/RoleService.php`

```php
public function grantToAllMembers(Project $project, Role $role): void
{
    $this->assertNotSystemRole($role);

    foreach ($this->projectMemberRepository->getMembers($project) as $member) {
        $this->projectMemberRepository->attachRoles($project, $member->id, [$role->id]);
    }

    $this->activityLogService->log($project->id, "Granted the \"$role->name\" role to every member");
}
```

`assertNotSystemRole()` already exists on this class (used by
`deleteRole()`) and is reused here unchanged — bulk-granting a system
tier role (Owner/Admin/Member/Viewer) this way would be meaningless,
since tiers are assigned one at a time via
`ProjectMemberService::updateRole()`, never attached alongside
whatever tier a member already has.

## Step 2 — Add the controller action and route

File: `app/Http/Controllers/RoleController.php`

```php
public function grantToAllMembers(Project $project, Role $role): RedirectResponse
{
    $this->ensureRoleBelongsToProject($project, $role);
    $this->authorize('assign', [Role::class, $project]);

    $this->roleService->grantToAllMembers($project, $role);

    return redirect()->back()->with('success', "The \"$role->name\" role has been granted to every member.");
}
```

This reuses `RolePolicy::assign` — the exact same ability that already
gates `ProjectMemberController::syncRoles()` and
`ProjectInvitationController::store()`'s `roles` field — since
"grant this role to someone" is the same permission regardless of how
many people it's granted to at once.

File: `routes/web.php`, next to the other `roles/{role}` routes:

```php
Route::post('/projects/{project}/roles/{role}/grant-all', [RoleController::class, 'grantToAllMembers'])->name('projects.roles.grant-all');
```

## Step 3 — Wire up the button

File: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsRolesTab.tsx`

Follow the same `router.<verb>(url, { preserveScroll, onStart,
onFinish, onSuccess, onError })` shape `WorkspaceSettingsDeleteRoleModal.tsx`
already uses for `roles.destroy`:

```ts
import { router } from '@inertiajs/react';

const handleGrantToAll = (role: WorkspaceRole) => {
    router.post(
        `/projects/${projectId}/roles/${role.id}/grant-all`,
        {},
        {
            preserveScroll: true,
            onSuccess: () => {
                addAlert(
                    `The "${role.name}" role has been granted to every member.`,
                    'success',
                );
            },
            onError: () => {
                addAlert(
                    `Failed to grant the "${role.name}" role to every member.`,
                    'error',
                );
            },
        },
    );
};
```

Gate the button itself on the same permission the backend checks —
this project computes UI-facing booleans directly off the `Project`
model rather than through the Policy layer (see
[`../integrations/02-add-a-new-permission.md`](../integrations/02-add-a-new-permission.md)
step 4), so thread a `canAssignRoles` prop down from
`RoleController`'s Inertia parent page the same way `canUpdateIntegrations`
already flows into this tab.

## Step 4 — Tests

- `tests/Feature/RoleServiceTest.php` — add
  `'it can grant a custom role to every current member and logs the
  change'`, asserting every member ends up holding the role via
  `$member->pivot->roles` and that members who already held it aren't
  duplicated (`attachRoles()`'s `syncWithoutDetaching` already
  guarantees this — the test just needs to confirm it).
- `tests/Feature/RoleControllerTest.php` — mirror
  `'an admin can create a role'`/`'a member without the roles.create
  permission cannot create a role'` for the new route: an admin can
  grant, a plain member without `roles.assign` (and without a custom
  role granting it) gets a 403, and granting a role from another
  project through a mismatched `{project}`/`{role}` pair 404s (copy
  `'a role from another project cannot be updated through a mismatched
  project'`'s setup).
- `tests/Feature/ProjectMemberRepositoryTest.php` — no change needed;
  `attachRoles()` is already covered there and this guide's service
  method calls it unmodified.
