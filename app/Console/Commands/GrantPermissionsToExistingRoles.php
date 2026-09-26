<?php

namespace App\Console\Commands;

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Enums\Permissions\RoleType;
use App\Models\Permission;
use App\Models\Project;
use Illuminate\Console\Command;

/**
 * A permission added to the Permission enum after a project's system roles
 * were already created is never retroactively granted - RoleService only
 * seeds an Owner/Admin/Member/Viewer role's default permissions the moment
 * that role is first created (see RoleService::ensureSystemRoles()'s
 * docblock), by design, so a project admin's deliberate customization of a
 * role is never silently reverted later. Owner and Admin are meant to have
 * every permission unconditionally though, so there is no real ambiguity
 * for those two tiers specifically: any gap between "every permission" and
 * what a role actually has is staleness, not an intentional restriction -
 * this command closes that gap for a fixed, explicit list of permission
 * keys, additively (attach only, never detach), so it can never undo a
 * genuine customization of some other permission.
 *
 * One-off, safe to re-run: run once after adding a new permission that
 * every existing project's Owner/Admin should already have.
 */
class GrantPermissionsToExistingRoles extends Command
{
    protected $signature = 'permissions:grant-to-existing-roles
        {keys* : Permission enum values to grant, e.g. projects.automation.view}
        {--roles=owner,admin : Comma-separated role tiers to grant them to}';

    protected $description = 'Additively grant specific permissions to every project\'s existing system roles, without touching any other permission';

    public function handle(): int
    {
        $keys = $this->argument('keys');

        foreach ($keys as $key) {
            if (PermissionEnum::tryFrom($key) === null) {
                $this->error("\"$key\" is not a known permission key.");

                return self::FAILURE;
            }
        }

        $roleTypes = array_map(
            fn (string $tier) => RoleType::from(trim($tier)),
            explode(',', $this->option('roles')),
        );

        $permissionIds = Permission::query()->whereIn('key', $keys)->pluck('id')->all();

        if (count($permissionIds) !== count($keys)) {
            $this->error('Some permission keys were not found in the permissions table - run the PermissionSeeder first.');

            return self::FAILURE;
        }

        $rolesGranted = 0;

        Project::query()->with(['roles' => function ($query) use ($roleTypes) {
            $query->whereIn('role', array_map(fn (RoleType $type) => $type->value, $roleTypes))
                ->where('is_system', true);
        }])->chunkById(100, function ($projects) use ($permissionIds, &$rolesGranted) {
            foreach ($projects as $project) {
                foreach ($project->roles as $role) {
                    $role->permissions()->syncWithoutDetaching($permissionIds);
                    $rolesGranted++;
                }
            }
        });

        $this->info("Granted ".implode(', ', $keys)." to {$rolesGranted} existing role(s).");

        return self::SUCCESS;
    }
}
