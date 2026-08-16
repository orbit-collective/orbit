<?php

use App\Enums\IssueLabel;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Repositories\IssueRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new IssueRepository;
});

test('it can get issues for a project', function () {
    $project = Project::factory()->create();
    Issue::factory()->count(3)->create(['project_id' => $project->id]);
    Issue::factory()->count(2)->create(); // other project

    $issues = $this->repository->getForProject($project->id);

    expect($issues)->toHaveCount(3);
});

test('it can find an issue with its relations', function () {
    $project = Project::factory()->create();
    $creator = User::factory()->create();
    $assignee = User::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'user_id' => $creator->id,
        'assignee_id' => $assignee->id,
    ]);

    $found = $this->repository->findWithRelations($issue->id);

    expect($found->id)->toBe($issue->id);
    expect($found->relationLoaded('creator'))->toBeTrue();
    expect($found->relationLoaded('assignee'))->toBeTrue();
    expect($found->relationLoaded('project'))->toBeTrue();
    expect($found->relationLoaded('comments'))->toBeTrue();
    expect($found->creator->id)->toBe($creator->id);
    expect($found->assignee->id)->toBe($assignee->id);
    expect($found->project->id)->toBe($project->id);
});

test('it can store a new issue', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();
    $data = [
        'project_id' => $project->id,
        'user_id' => $user->id,
        'title' => 'Test Issue',
        'description' => 'Issue body',
        'priority' => 'high',
        'status' => 'open',
    ];

    $issue = $this->repository->store($data);

    expect($issue)->toBeInstanceOf(Issue::class);
    $this->assertDatabaseHas('issues', ['title' => 'Test Issue']);
});

test('it can update an issue', function () {
    $issue = Issue::factory()->create(['title' => 'Old Title']);

    $updatedIssue = $this->repository->update($issue, ['title' => 'New Title']);

    expect($updatedIssue->title)->toBe('New Title');
    $this->assertDatabaseHas('issues', ['id' => $issue->id, 'title' => 'New Title']);
});

test('it returns issues ordered by priority', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'low', 'title' => 'Low Issue']);
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'high', 'title' => 'High Issue']);
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'medium', 'title' => 'Medium Issue']);

    $issues = $this->repository->getForProject($project->id);

    expect($issues[0]->priority)->toBe('high');
    expect($issues[1]->priority)->toBe('medium');
    expect($issues[2]->priority)->toBe('low');
});

test('it can search issues by title', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Searchable Title']);
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Another Issue']);

    $results = $this->repository->getAllPaginated($project->id, 10, [], ['search' => 'Searchable']);

    expect($results->items())->toHaveCount(1);
    expect($results->items()[0]->title)->toBe('Searchable Title');
});

test('it can search issues by description', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'description' => 'Target description']);
    Issue::factory()->create(['project_id' => $project->id, 'description' => 'Other content']);

    $results = $this->repository->getAllPaginated($project->id, 10, [], ['search' => 'Target']);

    expect($results->items())->toHaveCount(1);
    expect($results->items()[0]->description)->toBe('Target description');
});

test('it can search issues by ID', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'id' => 999]);
    Issue::factory()->create(['project_id' => $project->id, 'id' => 888]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], ['search' => '999']);

    expect($results->items())->toHaveCount(1);
    expect($results->items()[0]->id)->toBe(999);
});

test('it can filter issues by a single assignee', function () {
    $project = Project::factory()->create();
    $assignee = User::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $assignee->id]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => User::factory()->create()->id]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], [], ['assignee' => (string) $assignee->id]);

    expect($results->items())->toHaveCount(1);
    expect($results->items()[0]->assignee_id)->toBe($assignee->id);
});

test('it can filter issues by multiple assignees', function () {
    $project = Project::factory()->create();
    $first = User::factory()->create();
    $second = User::factory()->create();
    $third = User::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $first->id]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $second->id]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $third->id]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], [], ['assignee' => "{$first->id},{$second->id}"]);

    expect($results->items())->toHaveCount(2);
});

test('it can filter issues by assignee combined with unassigned', function () {
    $project = Project::factory()->create();
    $assignee = User::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $assignee->id]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => User::factory()->create()->id]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], [], ['assignee' => "{$assignee->id},unassigned"]);

    expect($results->items())->toHaveCount(2);
});

test('it can still filter unassigned issues only', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => User::factory()->create()->id]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], [], ['assignee' => 'unassigned']);

    expect($results->items())->toHaveCount(1);
    expect($results->items()[0]->assignee_id)->toBeNull();
});

test('it can search issues by labels', function () {
    $project = Project::factory()->create();
    Issue::factory()->create([
        'project_id' => $project->id,
        'labels' => [IssueLabel::BUG],
    ]);
    Issue::factory()->create([
        'project_id' => $project->id,
        'labels' => [IssueLabel::FEATURE],
    ]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], ['search' => 'bug']);

    expect($results->items())->toHaveCount(1);
});

test('it can search issues by a specific field key instead of the generic search term', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'status' => 'closed']);
    Issue::factory()->create(['project_id' => $project->id, 'status' => 'open']);

    $results = $this->repository->getAllPaginated($project->id, 10, [], ['status' => 'closed']);

    expect($results->items())->toHaveCount(1);
    expect($results->items()[0]->status)->toBe('closed');
});

test('it can sort issues by title ascending', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Banana']);
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Apple']);

    $results = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'title', 'direction' => 'AZ']);

    expect($results->items()[0]->title)->toBe('Apple');
    expect($results->items()[1]->title)->toBe('Banana');
});

test('it can sort issues by priority ascending', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'low', 'title' => 'Low']);
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'high', 'title' => 'High']);

    $results = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'priority', 'direction' => 'AZ']);

    expect($results->items()[0]->title)->toBe('High');
    expect($results->items()[1]->title)->toBe('Low');
});

test('it can sort issues by priority descending', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'low', 'title' => 'Low']);
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'high', 'title' => 'High']);

    $results = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'priority', 'direction' => 'ZA']);

    expect($results->items()[0]->title)->toBe('Low');
    expect($results->items()[1]->title)->toBe('High');
});

test('it can sort issues by assignee name', function () {
    $project = Project::factory()->create();
    $alice = User::factory()->create(['name' => 'Alice']);
    $bob = User::factory()->create(['name' => 'Bob']);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $bob->id, 'title' => 'Bob issue']);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $alice->id, 'title' => 'Alice issue']);

    $results = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'assignee', 'direction' => 'AZ']);

    expect($results->items()[0]->title)->toBe('Alice issue');
    expect($results->items()[1]->title)->toBe('Bob issue');
});

test('it can sort issues by start_date, end_date and updated', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'start_date' => now()->addDays(2), 'end_date' => now()->addDays(3)]);
    Issue::factory()->create(['project_id' => $project->id, 'start_date' => now()->addDay(), 'end_date' => now()->addDays(2)]);

    $byStart = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'start_date', 'direction' => 'AZ']);
    $byEnd = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'end_date', 'direction' => 'AZ']);
    $byUpdated = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'updated', 'direction' => 'AZ']);

    expect($byStart->items())->toHaveCount(2);
    expect($byEnd->items())->toHaveCount(2);
    expect($byUpdated->items())->toHaveCount(2);
});

test('it can delete an issue', function () {
    $issue = Issue::factory()->create();

    $this->repository->delete($issue);

    $this->assertDatabaseMissing('issues', ['id' => $issue->id]);
});

test('it can bulk delete issues, only affecting the given ids', function () {
    $toDelete = Issue::factory()->count(2)->create();
    $toKeep = Issue::factory()->create();

    $this->repository->bulkDelete($toDelete->pluck('id')->toArray());

    foreach ($toDelete as $issue) {
        $this->assertDatabaseMissing('issues', ['id' => $issue->id]);
    }
    $this->assertDatabaseHas('issues', ['id' => $toKeep->id]);
});

test('it can get many issues by id with just their project and title', function () {
    $project = Project::factory()->create();
    $matching = Issue::factory()->count(2)->create(['project_id' => $project->id]);
    Issue::factory()->create();

    $issues = $this->repository->getMany($matching->pluck('id')->toArray());

    expect($issues)->toHaveCount(2)
        ->and($issues->pluck('id')->all())->toEqualCanonicalizing($matching->pluck('id')->all())
        ->and($issues->first()->project_id)->toBe($project->id);
});

test('it can filter issues by assignee given as an array instead of a comma string', function () {
    $project = Project::factory()->create();
    $first = User::factory()->create();
    $second = User::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $first->id]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $second->id]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => User::factory()->create()->id]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], [], ['assignee' => [(string) $first->id, (string) $second->id]]);

    expect($results->items())->toHaveCount(2);
});
