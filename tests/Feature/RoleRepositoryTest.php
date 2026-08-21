<?php

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
    $permission = Permission::create(['key' => 'issues.view', 'name' => 'View issues', 'group' => 'issues']);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $role->permissions()->attach($permission);

    $roles = $this->repository->getForProject($project);

    expect($roles)->toHaveCount(1);
    expect($roles->first()->permissions)->toHaveCount(1);
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
    $permissionA = Permission::create(['key' => 'issues.view', 'name' => 'View issues', 'group' => 'issues']);
    $permissionB = Permission::create(['key' => 'issues.create', 'name' => 'Create issues', 'group' => 'issues']);
    $role->permissions()->attach($permissionA);

    $this->repository->syncPermissions($role, [$permissionB->id]);

    expect($role->permissions()->pluck('permissions.id')->all())->toBe([$permissionB->id]);
});
