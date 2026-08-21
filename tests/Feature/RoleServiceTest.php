<?php

use App\Models\Permission;
use App\Models\Project;
use App\Services\RoleService;
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
