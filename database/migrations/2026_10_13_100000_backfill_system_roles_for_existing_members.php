<?php

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Enums\Permissions\RoleType;
use App\Models\Permission;
use App\Models\Project;
use App\Services\RoleService;
use App\Support\Cache\CacheVersion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Moves every existing project onto the role system as the single source
     * of truth. Until now a member's tier lived in project_user.role and the
     * role rows were only created lazily on the next write, so most projects
     * had no system roles at all. This creates them and assigns each member
     * (and each pending invitation) the system role matching the legacy
     * column, so dropping that column later loses nobody's access.
     *
     * Idempotent: roles are found by slug, permissions are only ever added
     * (never detached), and a member's custom roles are left untouched.
     */
    public function up(): void
    {
        $this->seedPermissions();
        $this->promoteOwnerWhereMissing();

        $roleService = app(RoleService::class);

        Project::query()->chunkById(100, function ($projects) use ($roleService) {
            foreach ($projects as $project) {
                $systemRoles = $roleService->ensureSystemRoles($project);

                $this->topUpFullAccessRoles($systemRoles);
                $this->assignMembers($project, $systemRoles);
                $this->assignPendingInvitations($project, $systemRoles);
            }
        });

        $this->bumpMembershipVersion();
    }

    /**
     * The role rows and assignments are data that stays valid under the old
     * model, so there is nothing to undo.
     */
    public function down(): void {}

    private function seedPermissions(): void
    {
        foreach (PermissionEnum::cases() as $permission) {
            [$group] = explode('.', $permission->value);

            Permission::query()->updateOrCreate(
                ['key' => $permission->value],
                ['name' => $permission->name, 'group' => $group],
            );
        }
    }

    /**
     * Every project must have exactly one owner. The earliest member becomes
     * owner, ties broken by the user's age and then alphabetically by name.
     */
    private function promoteOwnerWhereMissing(): void
    {
        DB::table('project_user')
            ->select('project_id')
            ->groupBy('project_id')
            ->havingRaw("sum(case when role = 'owner' then 1 else 0 end) = 0")
            ->pluck('project_id')
            ->each(function (int $projectId) {
                $candidateId = DB::table('project_user')
                    ->join('users', 'users.id', '=', 'project_user.user_id')
                    ->where('project_user.project_id', $projectId)
                    ->orderBy('project_user.created_at')
                    ->orderBy('users.created_at')
                    ->orderBy('users.name')
                    ->orderBy('project_user.id')
                    ->value('project_user.id');

                DB::table('project_user')->where('id', $candidateId)->update(['role' => RoleType::OWNER->value]);
            });
    }

    /**
     * Owner and Admin are defined as "every permission", so any gap is
     * staleness from a permission added after the role was created.
     */
    private function topUpFullAccessRoles($systemRoles): void
    {
        $allIds = Permission::query()->pluck('id')->all();

        foreach ([RoleType::OWNER, RoleType::ADMIN] as $tier) {
            $systemRoles[$tier->value]->permissions()->syncWithoutDetaching($allIds);
        }
    }

    private function assignMembers(Project $project, $systemRoles): void
    {
        $systemRoleIds = $systemRoles->pluck('id')->all();

        DB::table('project_user')
            ->where('project_id', $project->id)
            ->get(['id', 'role'])
            ->each(function ($member) use ($systemRoles, $systemRoleIds) {
                $tier = RoleType::tryFrom($member->role);
                $target = $systemRoles[$tier && $tier !== RoleType::CUSTOM ? $tier->value : RoleType::MEMBER->value];

                DB::table('project_user_role')
                    ->where('project_user_id', $member->id)
                    ->whereIn('role_id', $systemRoleIds)
                    ->where('role_id', '!=', $target->id)
                    ->delete();

                DB::table('project_user_role')->insertOrIgnore([
                    'project_user_id' => $member->id,
                    'role_id' => $target->id,
                ]);
            });
    }

    private function assignPendingInvitations(Project $project, $systemRoles): void
    {
        DB::table('project_invitations')
            ->where('project_id', $project->id)
            ->whereNull('accepted_at')
            ->get(['id', 'role'])
            ->each(function ($invitation) use ($systemRoles) {
                $tier = RoleType::tryFrom($invitation->role);
                $target = $systemRoles[$tier && $tier !== RoleType::CUSTOM && $tier !== RoleType::OWNER ? $tier->value : RoleType::MEMBER->value];

                DB::table('project_invitation_role')->insertOrIgnore([
                    'project_invitation_id' => $invitation->id,
                    'role_id' => $target->id,
                ]);
            });
    }

    private function bumpMembershipVersion(): void
    {
        try {
            CacheVersion::bump(CacheVersion::MEMBERSHIP);
        } catch (Throwable) {
            // The cache may be unreachable while migrating; entries age out via their TTL.
        }
    }
};
