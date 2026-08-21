<?php

use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an admin can create a role', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->post("/projects/{$project->id}/roles", [
        'name' => 'QA',
        'slug' => 'qa',
        'role' => 'custom',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('roles', ['project_id' => $project->id, 'name' => 'QA']);
});

test('a member without the roles.create permission cannot create a role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->post("/projects/{$project->id}/roles", [
        'name' => 'QA',
        'slug' => 'qa',
        'role' => 'custom',
    ]);

    $response->assertForbidden();
});

test('a member with a custom role granting roles.create can create a role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $permission = Permission::create(['key' => 'projects.roles.create', 'name' => 'Create roles', 'group' => 'projects']);
    $grantingRole = $project->roles()->create(['name' => 'Role Manager', 'slug' => 'role-manager', 'role' => 'custom']);
    $grantingRole->permissions()->attach($permission);

    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $projectUser->roles()->attach($grantingRole->id);

    $response = $this->actingAs($member)->post("/projects/{$project->id}/roles", [
        'name' => 'QA',
        'slug' => 'qa',
        'role' => 'custom',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('roles', ['project_id' => $project->id, 'name' => 'QA']);
});

test('an outsider cannot create a role', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post("/projects/{$project->id}/roles", [
        'name' => 'QA',
        'slug' => 'qa',
        'role' => 'custom',
    ]);

    $response->assertForbidden();
});

test('creating a role requires a name, slug and valid role type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->post("/projects/{$project->id}/roles", [
        'role' => 'owner-that-does-not-exist',
    ]);

    $response->assertSessionHasErrors(['name', 'slug', 'role']);
});

test('an admin can update a role', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->patch("/projects/{$project->id}/roles/{$role->id}", [
        'name' => 'Quality Assurance',
        'slug' => 'qa',
    ]);

    $response->assertRedirect();
    expect($role->refresh()->name)->toBe('Quality Assurance');
});

test('a member without the roles.update permission cannot update a role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($member)->patch("/projects/{$project->id}/roles/{$role->id}", [
        'name' => 'Quality Assurance',
        'slug' => 'qa',
    ]);

    $response->assertForbidden();
});

test('a role from another project cannot be updated through a mismatched project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $role = $otherProject->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->patch("/projects/{$project->id}/roles/{$role->id}", [
        'name' => 'Quality Assurance',
        'slug' => 'qa',
    ]);

    $response->assertNotFound();
});

test('an admin can delete a custom role', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->delete("/projects/{$project->id}/roles/{$role->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('roles', ['id' => $role->id]);
});

test('a member without the roles.delete permission cannot delete a role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($member)->delete("/projects/{$project->id}/roles/{$role->id}");

    $response->assertForbidden();
});

test('guests cannot manage project roles', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->delete("/projects/{$project->id}/roles/{$role->id}");

    $response->assertRedirect(route('login'));
});
