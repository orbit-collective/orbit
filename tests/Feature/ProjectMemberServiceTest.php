<?php

use App\Enums\ProjectRole;
use App\Models\Project;
use App\Models\User;
use App\Services\ProjectMemberService;
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

    $this->service->updateRole($project, $member, ProjectRole::ADMIN);

    expect($project->users()->where('users.id', $member->id)->first()->pivot->role)->toBe('admin');
});

test('it prevents demoting the only admin', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $this->service->updateRole($project, $admin, ProjectRole::MEMBER);
})->throws(ValidationException::class);

test('it allows demoting an admin when another admin remains', function () {
    $project = Project::factory()->create();
    $adminA = User::factory()->create();
    $adminB = User::factory()->create();
    $project->users()->attach($adminA->id, ['role' => 'admin']);
    $project->users()->attach($adminB->id, ['role' => 'admin']);

    $this->service->updateRole($project, $adminA, ProjectRole::MEMBER);

    expect($project->users()->where('users.id', $adminA->id)->first()->pivot->role)->toBe('member');
});

test('it throws when updating the role of someone who is not a member', function () {
    $project = Project::factory()->create();
    $outsider = User::factory()->create();

    $this->service->updateRole($project, $outsider, ProjectRole::ADMIN);
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

test('it prevents removing the only admin', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $this->service->removeMember($project, $admin);
})->throws(ValidationException::class);

test('it throws when removing someone who is not a member', function () {
    $project = Project::factory()->create();
    $outsider = User::factory()->create();

    $this->service->removeMember($project, $outsider);
})->throws(ValidationException::class);
