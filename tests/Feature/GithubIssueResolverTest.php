<?php

use App\Models\Issue;
use App\Models\Project;
use App\Services\Integrations\Github\GithubIssueResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->resolver = app(GithubIssueResolver::class);
});

test('resolves an issue that belongs to the same project', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);

    $resolved = $this->resolver->resolve($issue->id, $project->id);

    expect($resolved)->not->toBeNull()
        ->and($resolved->id)->toBe($issue->id);
});

test('returns null for an issue id that does not exist', function () {
    $project = Project::factory()->create();

    expect($this->resolver->resolve(999999, $project->id))->toBeNull();
});

test('rejects an issue that belongs to a different project', function () {
    $ownerProject = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $otherProject->id]);

    expect($this->resolver->resolve($issue->id, $ownerProject->id))->toBeNull();
});
