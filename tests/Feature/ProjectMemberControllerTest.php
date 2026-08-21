<?php

use App\Enums\Permissions\RoleType;
use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use App\Services\RoleService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an admin can change a member\'s role', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($admin)->patch("/projects/{$project->id}/members/{$member->id}", [
        'role' => 'admin',
    ]);

    $response->assertRedirect();
    expect($project->users()->where('users.id', $member->id)->first()->pivot->role)->toBe('admin');
});

test('a member cannot change another member\'s role', function () {
    $project = Project::factory()->create();
    $memberA = User::factory()->create();
    $memberB = User::factory()->create();
    $project->users()->attach($memberA->id, ['role' => 'member']);
    $project->users()->attach($memberB->id, ['role' => 'member']);

    $response = $this->actingAs($memberA)->patch("/projects/{$project->id}/members/{$memberB->id}", [
        'role' => 'admin',
    ]);

    $response->assertForbidden();
});

test('an outsider cannot change a project\'s member roles', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs(User::factory()->create())->patch("/projects/{$project->id}/members/{$member->id}", [
        'role' => 'admin',
    ]);

    $response->assertForbidden();
});

test('changing a role requires a valid role value', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($admin)->patch("/projects/{$project->id}/members/{$member->id}", [
        'role' => 'owner',
    ]);

    $response->assertSessionHasErrors('role');
});

test('changing the owner\'s role fails with a validation error', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);

    $response = $this->actingAs($owner)->patch("/projects/{$project->id}/members/{$owner->id}", [
        'role' => 'member',
    ]);

    $response->assertSessionHasErrors('role');
});

test('an admin can remove a member', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($admin)->delete("/projects/{$project->id}/members/{$member->id}");

    $response->assertRedirect();
    expect($project->users()->where('users.id', $member->id)->exists())->toBeFalse();
});

test('a member cannot remove another member', function () {
    $project = Project::factory()->create();
    $memberA = User::factory()->create();
    $memberB = User::factory()->create();
    $project->users()->attach($memberA->id, ['role' => 'member']);
    $project->users()->attach($memberB->id, ['role' => 'member']);

    $response = $this->actingAs($memberA)->delete("/projects/{$project->id}/members/{$memberB->id}");

    $response->assertForbidden();
});

test('removing the owner fails with a validation error', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);

    $response = $this->actingAs($owner)->delete("/projects/{$project->id}/members/{$owner->id}");

    $response->assertSessionHasErrors('member');
});

test('guests cannot manage project members', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->delete("/projects/{$project->id}/members/{$member->id}");

    $response->assertRedirect(route('login'));
});

test('an admin can assign a custom role to a member', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->patch("/projects/{$project->id}/members/{$member->id}/roles", [
        'roles' => [$role->id],
    ]);

    $response->assertRedirect();
    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    expect($projectUser->roles()->pluck('roles.id')->all())->toBe([$role->id]);
});

test('a member with the roles.assign permission can assign a custom role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $target = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $project->users()->attach($target->id, ['role' => 'member']);

    $permission = Permission::where('key', 'projects.roles.assign')->first();
    $grantingRole = $project->roles()->create(['name' => 'Role Manager', 'slug' => 'role-manager', 'role' => 'custom']);
    $grantingRole->permissions()->attach($permission);
    $memberPivot = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $memberPivot->roles()->attach($grantingRole->id);

    $qaRole = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($member)->patch("/projects/{$project->id}/members/{$target->id}/roles", [
        'roles' => [$qaRole->id],
    ]);

    $response->assertRedirect();
});

test('a member without the roles.assign permission cannot assign a custom role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $target = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $project->users()->attach($target->id, ['role' => 'member']);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($member)->patch("/projects/{$project->id}/members/{$target->id}/roles", [
        'roles' => [$role->id],
    ]);

    $response->assertForbidden();
});

test('assigning roles accepts an empty array to clear all custom roles', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $projectUser->roles()->attach($role->id);

    $response = $this->actingAs($admin)->patch("/projects/{$project->id}/members/{$member->id}/roles", [
        'roles' => [],
    ]);

    $response->assertRedirect();
    expect($projectUser->roles()->count())->toBe(0);
});

test('assigning a role from another project is rejected', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);
    app(RoleService::class)->syncSystemRoleForMember($project, $admin->id, RoleType::ADMIN);
    $foreignRole = $otherProject->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $response = $this->actingAs($admin)->patch("/projects/{$project->id}/members/{$member->id}/roles", [
        'roles' => [$foreignRole->id],
    ]);

    $response->assertSessionHasErrors('roles.0');
});

test('an owner can transfer ownership to another member', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($owner)->patch("/projects/{$project->id}/transfer-ownership", [
        'user_id' => $member->id,
    ]);

    $response->assertRedirect();
    expect($project->users()->where('users.id', $member->id)->first()->pivot->role)->toBe('owner');
    expect($project->users()->where('users.id', $owner->id)->first()->pivot->role)->toBe('admin');
});

test('an admin cannot transfer ownership', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($admin)->patch("/projects/{$project->id}/transfer-ownership", [
        'user_id' => $member->id,
    ]);

    $response->assertForbidden();
});

test('ownership cannot be transferred to a non-member', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $outsider = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);

    $response = $this->actingAs($owner)->patch("/projects/{$project->id}/transfer-ownership", [
        'user_id' => $outsider->id,
    ]);

    $response->assertSessionHasErrors('user_id');
});

test('guests cannot transfer ownership', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->patch("/projects/{$project->id}/transfer-ownership", [
        'user_id' => $member->id,
    ]);

    $response->assertRedirect(route('login'));
});
