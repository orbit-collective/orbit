<?php

use App\Enums\Permissions\RoleType;
use App\Models\Permission;
use App\Models\Project;
use App\Repositories\RoleRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new RoleRepository;
});

test('it can get the roles of a project with their permissions eager loaded', function () {
    $project = Project::factory()->create();
    $permission = Permission::where('key', 'issues.view')->first();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $role->permissions()->attach($permission);

    $roles = $this->repository->getForProject($project);

    expect($roles)->toHaveCount(1)
        ->and($roles->first()->permissions)->toHaveCount(1);
});

test('it does not return roles belonging to another project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $otherProject->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    expect($this->repository->getForProject($project))->toHaveCount(0);
});

test('it can create a role for a project', function () {
    $project = Project::factory()->create();

    $role = $this->repository->create($project, ['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $this->assertDatabaseHas('roles', [
        'id' => $role->id,
        'project_id' => $project->id,
        'name' => 'QA',
    ]);
});

test('it can update a role', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $this->repository->update($role, ['name' => 'Quality Assurance', 'slug' => 'qa']);

    expect($role->refresh()->name)->toBe('Quality Assurance');
});

test('it can delete a role', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $this->repository->delete($role);

    $this->assertDatabaseMissing('roles', ['id' => $role->id]);
});

test('it can sync the permissions of a role', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $permissionA = Permission::where('key', 'issues.view')->first();
    $permissionB = Permission::where('key', 'issues.create')->first();
    $role->permissions()->attach($permissionA);

    $this->repository->syncPermissions($role, [$permissionB->id]);

    expect($role->permissions()->pluck('permissions.id')->all())->toBe([$permissionB->id]);
});

test('a custom role holding a system slug is renamed instead of being taken for the system role', function () {
    $project = Project::factory()->create();
    $custom = $project->roles()->create(['name' => 'Viewer', 'slug' => 'viewer', 'role' => 'custom']);

    $system = $this->repository->firstOrCreateSystemRole($project, RoleType::VIEWER);

    expect($system->id)->not->toBe($custom->id)
        ->and($system->is_system)->toBeTrue()
        ->and($system->role)->toBe('viewer')
        ->and($custom->fresh()->slug)->toBe('viewer-custom')
        ->and($custom->fresh()->is_system)->toBeFalse();
});

test('the renamed slug stays unique when it is already taken', function () {
    $project = Project::factory()->create();
    $project->roles()->create(['name' => 'Admin', 'slug' => 'admin', 'role' => 'custom']);
    $project->roles()->create(['name' => 'Admin 2', 'slug' => 'admin-custom', 'role' => 'custom']);

    $this->repository->firstOrCreateSystemRole($project, RoleType::ADMIN);

    expect($project->roles()->pluck('slug')->sort()->values()->all())
        ->toBe(['admin', 'admin-custom', 'admin-custom-2']);
});

test('an existing system role is returned as it is', function () {
    $project = Project::factory()->create();

    $first = $this->repository->firstOrCreateSystemRole($project, RoleType::MEMBER);
    $second = $this->repository->firstOrCreateSystemRole($project, RoleType::MEMBER);

    expect($second->id)->toBe($first->id)
        ->and($project->roles()->count())->toBe(1);
});
