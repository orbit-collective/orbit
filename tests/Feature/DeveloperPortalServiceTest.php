<?php

use App\Models\Comment;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Services\DeveloperPortal\DeveloperPortalService;

beforeEach(function () {
    $this->service = app(DeveloperPortalService::class);
});

test('totals count the whole instance, split by status category', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();
    addProjectMember($project, $user->id, 'owner');
    Issue::factory()->for($project)->todo()->count(2)->create(['user_id' => $user->id]);
    Issue::factory()->for($project)->inProgress()->create(['user_id' => $user->id]);
    Issue::factory()->for($project)->done()->count(3)->create(['user_id' => $user->id]);
    Project::factory()->create();
    $issue = Issue::query()->first();
    Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $user->id]);

    $totals = $this->service->totals();

    expect($totals['users'])->toBe(User::count())
        ->and($totals['projects'])->toBe(2)
        ->and($totals['issues'])->toBe(6)
        ->and($totals['comments'])->toBe(1)
        ->and($totals['newIssues'])->toBe(6)
        ->and($totals['categories'])->toBe(['todo' => 2, 'in_progress' => 1, 'done' => 3])
        ->and($totals['recentDays'])->toBe(7);
});

test('issues older than the window are not new', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();
    Issue::factory()->for($project)->todo()->create(['user_id' => $user->id, 'created_at' => now()->subDays(30)]);

    expect($this->service->totals()['newIssues'])->toBe(0)
        ->and($this->service->totals()['issues'])->toBe(1);
});

test('users are paginated newest first with their project counts', function () {
    $users = User::factory()->count(3)->create();
    $project = Project::factory()->create();
    addProjectMember($project, $users[0]->id, 'member');

    $page = $this->service->users(2);

    expect($page->perPage())->toBe(2)
        ->and($page->total())->toBe(User::count())
        ->and($page->getCollection()->first()['id'])->toBe(User::max('id'))
        ->and(collect($this->service->users(100)->items())->firstWhere('id', $users[0]->id)['projectsCount'])->toBe(1)
        ->and($page->getCollection()->first())->toHaveKeys(['id', 'name', 'email', 'avatar', 'projectsCount', 'createdAt']);
});

test('users can be searched by name or email', function () {
    User::factory()->create(['name' => 'Zed Findable', 'email' => 'zed@example.test']);
    User::factory()->create(['name' => 'Other Person', 'email' => 'other@example.test']);

    expect($this->service->users(10, 'findable')->total())->toBe(1)
        ->and($this->service->users(10, 'other@example')->total())->toBe(1);
});

test('projects are paginated with member counts and issue counts per category', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();
    addProjectMember($project, $user->id, 'owner');
    Issue::factory()->for($project)->done()->count(2)->create(['user_id' => $user->id]);
    Issue::factory()->for($project)->todo()->create(['user_id' => $user->id]);

    $row = collect($this->service->projects(10)->items())->firstWhere('id', $project->id);

    expect($row['membersCount'])->toBe(1)
        ->and($row['issues'])->toBe(['todo' => 1, 'in_progress' => 0, 'done' => 2])
        ->and($row)->toHaveKeys(['id', 'name', 'slug', 'color', 'createdAt']);
});

test('projects can be searched and per-page is bounded', function () {
    Project::factory()->create(['name' => 'Needle Project', 'slug' => 'needle-project']);
    Project::factory()->count(3)->create();

    expect($this->service->projects(10, 'needle')->total())->toBe(1)
        ->and($this->service->projects(5000)->perPage())->toBe(100)
        ->and($this->service->projects(0)->perPage())->toBe((int) config('developer-portal.per_page'));
});
