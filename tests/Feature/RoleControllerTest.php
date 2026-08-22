<?php

use App\Enums\Permissions\RoleType;
use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use App\Services\RoleService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an admin can create a role', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);

    $response = $this->actingAs($admin)->post("/projects/$project->id/roles", [
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

    $response = $this->actingAs($member)->post("/projects/$project->id/roles", [
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

    $permission = Permission::where('key', 'projects.roles.create')->first();
    $grantingRole = $project->roles()->create(['name' => 'Role Manager', 'slug' => 'role-manager', 'role' => 'custom']);
    $grantingRole->permissions()->attach($permission);

    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $projectUser->roles()->attach($grantingRole->id);

    $response = $this->actingAs($member)->post("/projects/$project->id/roles", [
        'name' => 'QA',
        'slug' => 'qa',
        'role' => 'custom',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('roles', ['project_id' => $project->id, 'name' => 'QA']);
});

test('a member with a custom role granting only settings.update can create a role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $permission = Permission::where('key', 'projects.settings.update')->first();
    $grantingRole = $project->roles()->create(['name' => 'Settings Manager', 'slug' => 'settings-manager', 'role' => 'custom']);
    $grantingRole->permissions()->attach($permission);

    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $projectUser->roles()->attach($grantingRole->id);

    $response = $this->actingAs($member)->post("/projects/$project->id/roles", [
        'name' => 'QA',
        'slug' => 'qa',
        'role' => 'custom',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('roles', ['project_id' => $project->id, 'name' => 'QA']);
});

test('an outsider cannot create a role', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post("/projects/$project->id/roles", [
        'name' => 'QA',
        'slug' => 'qa',
        'role' => 'custom',
    ]);

    $response->assertForbidden();
});

test('a role slug must be unique within the project', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/roles", [
        'name' => 'QA 2',
        'slug' => 'qa',
        'role' => 'custom',
    ]);

    $response->assertSessionHasErrors('slug');
});

test('the same slug can be reused across different projects', function () {
    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $admin = User::factory()->create();
    $projectA->users()->attach($admin->id, ['role' => 'admin']);
    $projectB->users()->attach($admin->id, ['role' => 'admin']);
    app(RoleService::class)->syncSystemRoleForMember($projectA, $admin->id, RoleType::ADMIN);
    app(RoleService::class)->syncSystemRoleForMember($projectB, $admin->id, RoleType::ADMIN);
    $projectA->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->post("/projects/$projectB->id/roles", [
        'name' => 'QA',
        'slug' => 'qa',
        'role' => 'custom',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('roles', ['project_id' => $projectB->id, 'slug' => 'qa']);
});

test('updating a role can keep its own slug without a uniqueness conflict', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/roles/$role->id", [
        'name' => 'Quality Assurance',
        'slug' => 'qa',
    ]);

    $response->assertRedirect();
});

test('updating a role rejects a slug already used by another role in the project', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $roleToRename = $project->roles()->create(['name' => 'Support', 'slug' => 'support', 'role' => 'custom']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/roles/$roleToRename->id", [
        'name' => 'Support',
        'slug' => 'qa',
    ]);

    $response->assertSessionHasErrors('slug');
});

test('an admin can sync permissions for a role', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $permission = Permission::where('key', 'issues.view')->first();

    $response = $this->actingAs($admin)->patch("/projects/$project->id/roles/$role->id/permissions", [
        'permissions' => [$permission->id],
    ]);

    $response->assertRedirect();
    expect($role->permissions()->pluck('permissions.id')->all())->toBe([$permission->id]);
});

test('syncing permissions accepts an empty array to clear all permissions', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $permission = Permission::where('key', 'issues.view')->first();
    $role->permissions()->attach($permission);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/roles/$role->id/permissions", [
        'permissions' => [],
    ]);

    $response->assertRedirect();
    expect($role->permissions()->count())->toBe(0);
});

test('syncing permissions rejects an id that does not exist', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/roles/$role->id/permissions", [
        'permissions' => [999],
    ]);

    $response->assertSessionHasErrors('permissions.0');
});

test('a member without the roles.update permission cannot sync permissions', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $permission = Permission::where('key', 'issues.view')->first();

    $response = $this->actingAs($member)->patch("/projects/$project->id/roles/$role->id/permissions", [
        'permissions' => [$permission->id],
    ]);

    $response->assertForbidden();
});

test('creating a role requires a name, slug and valid role type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);

    $response = $this->actingAs($admin)->post("/projects/$project->id/roles", [
        'role' => 'owner-that-does-not-exist',
    ]);

    $response->assertSessionHasErrors(['name', 'slug', 'role']);
});

test('an admin can update a role', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/roles/$role->id", [
        'name' => 'Quality Assurance',
        'slug' => 'qa',
    ]);

    $response->assertRedirect();
    expect($role->refresh()->name)->toBe('Quality Assurance');
});

test('an owner can rename a non-owner system role and its permissions', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $systemRoles = app(RoleService::class)->ensureSystemRoles($project);
    $adminRole = $systemRoles['member'];
    $permission = Permission::where('key', 'issues.view')->first();

    $renameResponse = $this->actingAs($owner)->patch("/projects/$project->id/roles/$adminRole->id", [
        'name' => 'Contributor',
        'slug' => 'ignored-should-stay-member',
    ]);

    $renameResponse->assertRedirect();
    expect($adminRole->refresh()->name)->toBe('Contributor')
        ->and($adminRole->slug)->toBe('member');

    $permissionsResponse = $this->actingAs($owner)->patch("/projects/$project->id/roles/$adminRole->id/permissions", [
        'permissions' => [$permission->id],
    ]);

    $permissionsResponse->assertRedirect();
    expect($adminRole->permissions()->pluck('permissions.id')->all())->toBe([$permission->id]);
});

test('the owner role cannot be renamed', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $systemRoles = app(RoleService::class)->ensureSystemRoles($project);
    $ownerRole = $systemRoles['owner'];

    $response = $this->actingAs($owner)->patch("/projects/$project->id/roles/$ownerRole->id", [
        'name' => 'Renamed',
        'slug' => 'owner',
    ]);

    $response->assertSessionHasErrors('role');
});

test('the owner role\'s permissions cannot be changed', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $systemRoles = app(RoleService::class)->ensureSystemRoles($project);
    $ownerRole = $systemRoles['owner'];
    $permission = Permission::where('key', 'issues.view')->first();

    $response = $this->actingAs($owner)->patch("/projects/$project->id/roles/$ownerRole->id/permissions", [
        'permissions' => [$permission->id],
    ]);

    $response->assertSessionHasErrors('role');
});

test('a non-owner system role still cannot be deleted', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $systemRoles = app(RoleService::class)->ensureSystemRoles($project);
    $memberRole = $systemRoles['member'];

    $response = $this->actingAs($owner)->delete("/projects/$project->id/roles/$memberRole->id");

    $response->assertSessionHasErrors('role');
    $this->assertDatabaseHas('roles', ['id' => $memberRole->id]);
});

test('a member without the roles.update permission cannot update a role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($member)->patch("/projects/$project->id/roles/$role->id", [
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
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $role = $otherProject->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/roles/$role->id", [
        'name' => 'Quality Assurance',
        'slug' => 'qa',
    ]);

    $response->assertNotFound();
});

test('an admin can delete a custom role', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->delete("/projects/$project->id/roles/$role->id");

    $response->assertRedirect();
    $this->assertDatabaseMissing('roles', ['id' => $role->id]);
});

test('a member without the roles.delete permission cannot delete a role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($member)->delete("/projects/$project->id/roles/$role->id");

    $response->assertForbidden();
});

test('guests cannot manage project roles', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->delete("/projects/$project->id/roles/$role->id");

    $response->assertRedirect(route('login'));
});
