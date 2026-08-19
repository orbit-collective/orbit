<?php

use App\Enums\ProjectRole;
use App\Models\Project;
use App\Models\User;
use App\Repositories\ProjectMemberRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new ProjectMemberRepository();
});

test('it can get the members of a project', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $members = $this->repository->getMembers($project);

    expect($members)->toHaveCount(2);
});

test('it reports whether a user is a member of a project', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $outsider = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    expect($this->repository->isMember($project, $member->id))->toBeTrue();
    expect($this->repository->isMember($project, $outsider->id))->toBeFalse();
});

test('it returns the role of a member', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    expect($this->repository->roleOf($project, $admin->id))->toBe(ProjectRole::ADMIN);
});

test('it returns null for the role of a non-member', function () {
    $project = Project::factory()->create();
    $outsider = User::factory()->create();

    expect($this->repository->roleOf($project, $outsider->id))->toBeNull();
});

test('it counts the number of admins on a project', function () {
    $project = Project::factory()->create();
    $adminA = User::factory()->create();
    $adminB = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($adminA->id, ['role' => 'admin']);
    $project->users()->attach($adminB->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    expect($this->repository->countAdmins($project))->toBe(2);
});

test('it can update a member\'s role', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $this->repository->updateRole($project, $member->id, ProjectRole::ADMIN);

    expect($this->repository->roleOf($project, $member->id))->toBe(ProjectRole::ADMIN);
});

test('it can remove a member from a project', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $this->repository->removeMember($project, $member->id);

    expect($this->repository->isMember($project, $member->id))->toBeFalse();
});
