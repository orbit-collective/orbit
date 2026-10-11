<?php

use App\Models\Issue;
use App\Models\IssueType;
use App\Models\Project;
use App\Models\User;
use App\Models\WorkflowStatus;
use App\Repositories\IssueRepository;
use App\Support\Cache\CacheVersion;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Cached issue lists are only as fresh as these bumps: everything an issue list
 * shows (issues, their type and status, the people on them) must move a version
 * when it changes.
 */
function expectBump(string $scope, Closure $write): void
{
    $before = CacheVersion::current($scope);

    $write();

    expect(CacheVersion::current($scope))->toBeGreaterThan($before);
}

function expectNoBump(string $scope, Closure $write): void
{
    $before = CacheVersion::current($scope);

    $write();

    expect(CacheVersion::current($scope))->toBe($before);
}

test('creating, updating and deleting an issue bump the issues version', function () {
    $project = Project::factory()->create();

    expectBump(CacheVersion::ISSUES, function () use (&$issue, $project) {
        $issue = Issue::factory()->create(['project_id' => $project->id]);
    });
    expectBump(CacheVersion::ISSUES, fn () => $issue->update(['title' => 'Renamed']));
    expectBump(CacheVersion::ISSUES, fn () => $issue->delete());
});

test('editing an issue type or a workflow status bumps the issues version', function () {
    $type = IssueType::factory()->create();
    $status = WorkflowStatus::factory()->create(['issue_type_id' => $type->id]);

    expectBump(CacheVersion::ISSUES, fn () => $type->update(['name' => 'Renamed']));
    expectBump(CacheVersion::ISSUES, fn () => $status->update(['name' => 'Renamed']));
    expectBump(CacheVersion::ISSUES, fn () => $status->delete());
    expectBump(CacheVersion::ISSUES, fn () => $type->delete());
});

test('a bulk issue delete bumps the issues version', function () {
    $issues = Issue::factory()->count(2)->create();

    expectBump(CacheVersion::ISSUES, fn () => (new IssueRepository)->bulkDelete($issues->pluck('id')->all()));
});

test('renaming a user or changing their avatar bumps the users version', function () {
    $user = User::factory()->create();

    expectBump(CacheVersion::USERS, fn () => $user->update(['name' => 'New Name']));
    expectBump(CacheVersion::USERS, fn () => $user->update(['avatar' => '/avatars/new.png']));
});

test('a user change that no issue list shows does not bump the users version', function () {
    $user = User::factory()->create();

    expectNoBump(CacheVersion::USERS, fn () => $user->update(['has_completed_onboarding' => true]));
});

test('deleting a user bumps the users version', function () {
    $user = User::factory()->create();

    expectBump(CacheVersion::USERS, fn () => $user->delete());
});
