<?php

namespace App\Repositories;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\Role;
use App\Support\Cache\CacheVersion;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class RoleRepository
{
    public function getForProject(Project $project): Collection
    {
        return $project->roles()->with('permissions')->get();
    }

    /**
     * Narrows ids to this project's custom roles. A member's tier is their one
     * system role, which only changes through the role-change and ownership
     * flows, so system roles are never accepted from a free-form assignment.
     *
     * @param  list<int>  $roleIds
     * @return list<int>
     */
    public function customRoleIds(Project $project, array $roleIds): array
    {
        return $project->roles()
            ->where('is_system', false)
            ->whereIn('id', $roleIds)
            ->pluck('id')
            ->all();
    }

    /**
     * Roles are unique per project by slug, and a project predating its
     * system roles may already hold a custom role under one of their slugs
     * (e.g. "viewer"). That role must not be mistaken for the system role, so
     * it is moved to a free "<slug>-custom" slug first.
     */
    public function firstOrCreateSystemRole(Project $project, RoleType $role): Model
    {
        $holder = $project->roles()->where('slug', $role->value)->first();

        if ($holder && ! $holder->is_system) {
            $holder->update(['slug' => $this->freeSlug($project, "$role->value-custom")]);
        }

        return $project->roles()->firstOrCreate(
            ['slug' => $role->value],
            ['name' => Str::title($role->value), 'role' => $role->value, 'is_system' => true],
        );
    }

    private function freeSlug(Project $project, string $base): string
    {
        $slug = $base;

        for ($suffix = 2; $project->roles()->where('slug', $slug)->exists(); $suffix++) {
            $slug = "$base-$suffix";
        }

        return $slug;
    }

    public function create(Project $project, array $data): Role
    {
        return $project->roles()->create($data);
    }

    public function update(Role $role, array $data): Role
    {
        $role->update($data);

        return $role;
    }

    public function delete(Role $role): void
    {
        $role->delete();
        CacheVersion::bump(CacheVersion::MEMBERSHIP);
    }

    public function syncPermissions(Role $role, array $permissionIds): Role
    {
        $role->permissions()->sync($permissionIds);
        CacheVersion::bump(CacheVersion::MEMBERSHIP);

        return $role->load('permissions');
    }
}
