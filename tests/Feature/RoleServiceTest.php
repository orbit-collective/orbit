<?php

use App\Enums\ProjectRole;
use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use App\Services\RoleService;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(RoleService::class);
});

test('it can create a role and logs the change', function () {
    $project = Project::factory()->create();

    $role = $this->service->createRole($project, ['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $this->assertDatabaseHas('roles', ['id' => $role->id, 'project_id' => $project->id]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => 'Created the "QA" role']);
});

test('it can update a custom role and logs the change', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $this->service->updateRole($project, $role, ['name' => 'Quality Assurance', 'slug' => 'qa']);

    expect($role->refresh()->name)->toBe('Quality Assurance');
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => 'Updated the "Quality Assurance" role']);
});

test('it prevents updating a system role', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'Admin', 'slug' => 'admin', 'role' => 'admin', 'is_system' => true]);

    $this->service->updateRole($project, $role, ['name' => 'Renamed', 'slug' => 'admin']);
})->throws(ValidationException::class);

test('it can delete a custom role and logs the change', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $this->service->deleteRole($project, $role);

    $this->assertDatabaseMissing('roles', ['id' => $role->id]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => 'Deleted the "QA" role']);
});

test('it prevents deleting a system role', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'Admin', 'slug' => 'admin', 'role' => 'admin', 'is_system' => true]);

    $this->service->deleteRole($project, $role);
})->throws(ValidationException::class);

test('it can sync a role\'s permissions and logs the change', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $permission = Permission::create(['key' => 'issues.view', 'name' => 'View issues', 'group' => 'issues']);

    $this->service->syncPermissions($project, $role, [$permission->id]);

    expect($role->permissions()->pluck('permissions.id')->all())->toBe([$permission->id]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => 'Updated permissions for the "QA" role']);
});

test('it prevents syncing permissions on a system role', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'Admin', 'slug' => 'admin', 'role' => 'admin', 'is_system' => true]);
    $permission = Permission::create(['key' => 'issues.view', 'name' => 'View issues', 'group' => 'issues']);

    $this->service->syncPermissions($project, $role, [$permission->id]);
})->throws(ValidationException::class);

test('it creates the admin and member system roles with their default permissions', function () {
    $this->seed(PermissionSeeder::class);
    $project = Project::factory()->create();

    $systemRoles = $this->service->ensureSystemRoles($project);

    expect($systemRoles->keys()->all())->toBe(['admin', 'member']);
    expect($systemRoles['admin']->is_system)->toBeTrue();
    expect($systemRoles['admin']->permissions()->count())->toBe(Permission::count());
    expect($systemRoles['member']->is_system)->toBeTrue();
    expect($systemRoles['member']->permissions()->count())->toBeGreaterThan(0);
    expect($systemRoles['member']->permissions()->count())->toBeLessThan(Permission::count());
});

test('it is idempotent and does not duplicate system roles', function () {
    $this->seed(PermissionSeeder::class);
    $project = Project::factory()->create();

    $this->service->ensureSystemRoles($project);
    $this->service->ensureSystemRoles($project);

    expect($project->roles()->where('is_system', true)->count())->toBe(2);
});

test('syncSystemRoleForMember assigns the matching system role and keeps custom roles', function () {
    $this->seed(PermissionSeeder::class);
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $customRole = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $projectUser->roles()->attach($customRole->id);

    $this->service->syncSystemRoleForMember($project, $member->id, ProjectRole::MEMBER);

    expect($projectUser->roles()->pluck('slug')->sort()->values()->all())->toBe(['member', 'qa']);
});

test('syncSystemRoleForMember swaps the previous system role when promoted', function () {
    $this->seed(PermissionSeeder::class);
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $this->service->syncSystemRoleForMember($project, $member->id, ProjectRole::MEMBER);

    $this->service->syncSystemRoleForMember($project, $member->id, ProjectRole::ADMIN);

    expect($projectUser->roles()->pluck('slug')->all())->toBe(['admin']);
});
