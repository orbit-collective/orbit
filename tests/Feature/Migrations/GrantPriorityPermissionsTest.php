<?php

use App\Models\Permission;
use App\Models\Project;
use App\Models\User;
use App\Services\RoleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function priorityKeysOf(Project $project, string $tier): array
{
    return $project->roles()->where('slug', $tier)->first()
        ->permissions()->where('key', 'like', 'projects.priorities.%')->pluck('key')->sort()->values()->all();
}

function runPriorityPermissionGrant(): void
{
    (require database_path('migrations/2026_10_18_110000_grant_priority_permissions_to_existing_roles.php'))->up();
}

beforeEach(function () {
    // A project created before the permissions existed: its system roles have no priority permissions.
    $this->project = Project::factory()->create();
    $this->roles = app(RoleService::class)->ensureSystemRoles($this->project);
    $ids = Permission::where('key', 'like', 'projects.priorities.%')->pluck('id');
    DB::table('permission_role')->whereIn('permission_id', $ids)->delete();
});

test('owner and admin receive every priority permission', function () {
    runPriorityPermissionGrant();

    $all = [
        'projects.priorities.create',
        'projects.priorities.delete',
        'projects.priorities.update',
        'projects.priorities.view',
    ];

    expect(priorityKeysOf($this->project, 'owner'))->toBe($all)
        ->and(priorityKeysOf($this->project, 'admin'))->toBe($all);
});

test('member and viewer can only view priorities', function () {
    runPriorityPermissionGrant();

    expect(priorityKeysOf($this->project, 'member'))->toBe(['projects.priorities.view'])
        ->and(priorityKeysOf($this->project, 'viewer'))->toBe(['projects.priorities.view']);
});

test('custom roles are not touched and a second run changes nothing', function () {
    $custom = $this->project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    runPriorityPermissionGrant();
    $count = DB::table('permission_role')->count();
    runPriorityPermissionGrant();

    expect($custom->permissions()->count())->toBe(0)
        ->and(DB::table('permission_role')->count())->toBe($count);
});

test('a member sees the priorities tab permission after the migration', function () {
    $member = User::factory()->create();
    addProjectMember($this->project, $member->id, 'member');
    runPriorityPermissionGrant();
    Cache::flush();

    expect($this->project->hasPermission($member, App\Enums\Permissions\Permission::PRIORITIES_VIEW))->toBeTrue()
        ->and($this->project->hasPermission($member, App\Enums\Permissions\Permission::PRIORITIES_UPDATE))->toBeFalse();
});
