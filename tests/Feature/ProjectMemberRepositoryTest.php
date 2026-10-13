<?php

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use App\Repositories\ProjectMemberRepository;
use App\Services\RoleService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new ProjectMemberRepository;
});

test('it can get the members of a project', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $admin->id, 'admin');
    addProjectMember($project, $member->id, 'member');

    $members = $this->repository->getMembers($project);

    expect($members)->toHaveCount(2);
});

test('it eager loads each member\'s custom roles on the pivot', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $member->id, 'member');
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $projectUser->roles()->attach($role->id);

    $members = $this->repository->getMembers($project);
    $loadedMember = $members->firstWhere('id', $member->id);

    expect($loadedMember->pivot->roles->pluck('slug')->sort()->values()->all())->toBe(['member', 'qa'])
        ->and($loadedMember->pivot->roles->pluck('id'))->toContain($role->id);
});

test('it reports whether a user is a member of a project', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $outsider = User::factory()->create();
    addProjectMember($project, $member->id, 'member');

    expect($this->repository->isMember($project, $member->id))->toBeTrue()
        ->and($this->repository->isMember($project, $outsider->id))->toBeFalse();
});

test('it returns the role of a member', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    addProjectMember($project, $admin->id, 'admin');

    expect($this->repository->roleOf($project, $admin->id))->toBe(RoleType::ADMIN);
});

test('it returns null for the role of a non-member', function () {
    $project = Project::factory()->create();
    $outsider = User::factory()->create();

    expect($this->repository->roleOf($project, $outsider->id))->toBeNull();
});

test('it can switch a member\'s system role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $member->id, 'member');
    $roles = app(RoleService::class)->ensureSystemRoles($project);

    $this->repository->syncSystemRole($project, $member->id, $roles['admin'], $roles->pluck('id')->all());

    expect($this->repository->roleOf($project, $member->id))->toBe(RoleType::ADMIN);
});

test('it can remove a member from a project', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $member->id, 'member');

    $this->repository->removeMember($project, $member->id);

    expect($this->repository->isMember($project, $member->id))->toBeFalse();
});

test('it can sync a member\'s custom roles', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $member->id, 'member');
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $this->repository->syncRoles($project, $member->id, [$role->id]);

    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    expect($projectUser->roles()->pluck('roles.id')->all())->toBe([$role->id]);
});

test('attachRoles adds custom roles without detaching an existing system role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $member->id, 'member');
    $customRole = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();

    $this->repository->attachRoles($project, $member->id, [$customRole->id]);

    expect($projectUser->roles()->pluck('slug')->sort()->values()->all())->toBe(['member', 'qa']);
});

test('syncing roles for a non-member does nothing', function () {
    $project = Project::factory()->create();
    $outsider = User::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $this->repository->syncRoles($project, $outsider->id, [$role->id]);

    expect(ProjectUser::where('project_id', $project->id)->where('user_id', $outsider->id)->exists())->toBeFalse();
});
