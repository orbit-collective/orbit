<?php

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\User;
use App\Repositories\ProjectRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new ProjectRepository;
});

test('it can get all projects for a user', function () {
    $user = User::factory()->create();
    $projects = Project::factory()->count(3)->create();

    foreach ($projects as $project) {
        addProjectMember($project, $user->id, RoleType::MEMBER->value);
    }

    Project::factory()->create();

    $result = $this->repository->getAllForUser($user->id);

    expect($result)->toHaveCount(3);
});

test('it can find a project by slug', function () {
    $project = Project::factory()->create(['slug' => 'test-project']);

    $found = $this->repository->findBySlug('test-project');

    expect($found->id)->toBe($project->id);
});

test('it can store a new project', function () {
    $data = [
        'name' => 'New Project',
        'slug' => 'new-project',
        'description' => 'Test description',
        'color' => 'blue',
    ];

    $project = $this->repository->store($data);

    expect($project)->toBeInstanceOf(Project::class);
    $this->assertDatabaseHas('projects', ['name' => 'New Project']);
});

test('it throws exception when project slug is not found', function () {
    $this->repository->findBySlug('non-existent');
})->throws(ModelNotFoundException::class);

test('it reports no projects exist for a user when they belong to none', function () {
    $user = User::factory()->create();
    Project::factory()->create();

    expect($this->repository->hasAnyProjectsForUser($user->id))->toBeFalse();
});

test('it reports projects exist once the user has been attached to one', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, RoleType::MEMBER->value);

    expect($this->repository->hasAnyProjectsForUser($user->id))->toBeTrue();
});

test('it can attach a member to a project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();

    $this->repository->attachMember($project, $user->id);

    expect($project->users()->pluck('users.id')->all())->toBe([$user->id]);
});

test('it can get the member ids of a project', function () {
    $project = Project::factory()->create();
    $members = User::factory()->count(2)->create();

    foreach ($members as $member) {
        addProjectMember($project, $member->id, RoleType::MEMBER->value);
    }

    User::factory()->create();

    $ids = $this->repository->getMemberIds($project);

    expect($ids)->toEqualCanonicalizing($members->pluck('id')->all());
});

test('searchForUser only returns projects the user is a member of', function () {
    $user = User::factory()->create();
    $mine = Project::factory()->create(['name' => 'Orbit Core']);
    addProjectMember($mine, $user->id, RoleType::MEMBER->value);
    Project::factory()->create(['name' => 'Orbit Foreign']);

    $names = $this->repository->searchForUser($user->id, 'orbit')->pluck('name')->all();

    expect($names)->toBe(['Orbit Core']);
});

test('searchForUser ranks a name prefix above a substring', function () {
    $user = User::factory()->create();
    foreach (['My Orbit', 'Orbit Web'] as $name) {
        Project::factory()->create(['name' => $name])
            ->users()->attach($user->id);
    }

    $names = $this->repository->searchForUser($user->id, 'orbit')->pluck('name')->all();

    expect($names)->toBe(['Orbit Web', 'My Orbit']);
});

test('searchForUser is case-insensitive, honours the limit and escapes wildcards', function () {
    $user = User::factory()->create();
    foreach (['Alpha 100%', 'Alpha 100x', 'alpha three', 'ALPHA four'] as $name) {
        Project::factory()->create(['name' => $name])
            ->users()->attach($user->id);
    }

    expect($this->repository->searchForUser($user->id, 'alpha'))->toHaveCount(4)
        ->and($this->repository->searchForUser($user->id, 'alpha', 2))->toHaveCount(2)
        ->and($this->repository->searchForUser($user->id, '100%')->pluck('name')->all())->toBe(['Alpha 100%']);
});
