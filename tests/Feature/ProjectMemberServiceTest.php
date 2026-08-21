<?php

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use App\Services\ProjectMemberService;
use App\Services\RoleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(ProjectMemberService::class);
});

test('it can list the members of a project', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    expect($this->service->getMembers($project))->toHaveCount(1);
});

test('it can promote a member to admin', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $this->service->updateRole($project, $member, RoleType::ADMIN);

    expect($project->users()->where('users.id', $member->id)->first()->pivot->role)->toBe('admin');
});

test('promoting a member swaps their system role while keeping custom roles', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);
    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $customRole = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $projectUser->roles()->attach($customRole->id);
    app(RoleService::class)->syncSystemRoleForMember($project, $member->id, RoleType::MEMBER);

    $this->service->updateRole($project, $member, RoleType::ADMIN);

    expect($projectUser->roles()->pluck('slug')->sort()->values()->all())->toBe(['admin', 'qa']);
});

test('it allows demoting an admin freely since the owner remains the permanent manager', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $this->service->updateRole($project, $admin, RoleType::MEMBER);

    expect($project->users()->where('users.id', $admin->id)->first()->pivot->role)->toBe('member');
});

test('it prevents changing the owner\'s role', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);

    $this->service->updateRole($project, $owner, RoleType::ADMIN);
})->throws(ValidationException::class);

test('it throws when updating the role of someone who is not a member', function () {
    $project = Project::factory()->create();
    $outsider = User::factory()->create();

    $this->service->updateRole($project, $outsider, RoleType::ADMIN);
})->throws(ValidationException::class);

test('it can remove a member from a project', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $this->service->removeMember($project, $member);

    expect($project->users()->where('users.id', $member->id)->exists())->toBeFalse();
});

test('it prevents removing the owner from the project', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);

    $this->service->removeMember($project, $owner);
})->throws(ValidationException::class);

test('it throws when removing someone who is not a member', function () {
    $project = Project::factory()->create();
    $outsider = User::factory()->create();

    $this->service->removeMember($project, $outsider);
})->throws(ValidationException::class);

test('it can sync a member\'s custom roles and logs the change', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $this->service->syncRoles($project, $member, [$role->id]);

    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    expect($projectUser->roles()->pluck('roles.id')->all())->toBe([$role->id]);
    $this->assertDatabaseHas('activity_logs', ['project_id' => $project->id, 'body' => "Updated {$member->name}'s custom roles"]);
});

test('it throws when syncing roles for someone who is not a member', function () {
    $project = Project::factory()->create();
    $outsider = User::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $this->service->syncRoles($project, $outsider, [$role->id]);
})->throws(ValidationException::class);

test('it can transfer ownership to another member and demotes the previous owner to admin', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $this->service->transferOwnership($project, $owner, $member);

    expect($project->users()->where('users.id', $member->id)->first()->pivot->role)->toBe('owner');
    expect($project->users()->where('users.id', $owner->id)->first()->pivot->role)->toBe('admin');
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'body' => "Transferred project ownership from {$owner->name} to {$member->name}",
    ]);
});

test('transferring ownership swaps system roles for both parties', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $this->service->transferOwnership($project, $owner, $member);

    $newOwnerPivot = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $formerOwnerPivot = ProjectUser::where('project_id', $project->id)->where('user_id', $owner->id)->first();
    expect($newOwnerPivot->roles()->pluck('slug')->all())->toBe(['owner']);
    expect($formerOwnerPivot->roles()->pluck('slug')->all())->toBe(['admin']);
});

test('only the current owner can transfer ownership', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $this->service->transferOwnership($project, $admin, $member);
})->throws(ValidationException::class);

test('ownership cannot be transferred to someone who is not a member', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $outsider = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);

    $this->service->transferOwnership($project, $owner, $outsider);
})->throws(ValidationException::class);

test('an owner cannot transfer ownership to themselves', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);

    $this->service->transferOwnership($project, $owner, $owner);
})->throws(ValidationException::class);
