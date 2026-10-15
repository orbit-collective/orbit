<?php

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

test('getForProject respects the search box', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Searchable Title']);
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Another Issue']);

    $issues = $this->repository->getForProject($project->id, ['search' => 'Searchable']);

    expect($issues)->toHaveCount(1)
        ->and($issues->first()->title)->toBe('Searchable Title');
});

test('getForProject respects the status filter', function () {
    $project = Project::factory()->create();
    Issue::factory()->todo()->create(['project_id' => $project->id]);
    Issue::factory()->done()->create(['project_id' => $project->id]);

    $issues = $this->repository->getForProject($project->id, [], ['status' => ['todo']]);

    expect($issues)->toHaveCount(1)
        ->and($issues->first()->workflowStatus->category->value)->toBe('todo');
});

test('the status filter takes several categories at once', function () {
    $project = Project::factory()->create();
    Issue::factory()->todo()->create(['project_id' => $project->id]);
    Issue::factory()->inProgress()->create(['project_id' => $project->id]);
    Issue::factory()->done()->create(['project_id' => $project->id]);

    $issues = $this->repository->getForProject($project->id, [], ['status' => 'todo,in_progress']);

    expect($issues)->toHaveCount(2);
});

test('the status filter matches the category, not the status name', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->done()->create(['project_id' => $project->id]);
    $issue->workflowStatus->update(['name' => 'Shipped']);
    Issue::factory()->todo()->create(['project_id' => $project->id]);

    expect($this->repository->getForProject($project->id, [], ['status' => ['done']])->pluck('id')->all())->toBe([$issue->id]);
});

test('the search box matches a status name', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->done()->create(['project_id' => $project->id]);
    $issue->workflowStatus->update(['name' => 'Shipped']);
    Issue::factory()->todo()->create(['project_id' => $project->id]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], ['status' => 'Shipped']);

    expect($results->items())->toHaveCount(1)
        ->and($results->items()[0]->id)->toBe($issue->id);
});

test('issues sort by status category and then by workflow order', function () {
    $project = Project::factory()->create();
    $done = Issue::factory()->done()->create(['project_id' => $project->id]);
    $todo = Issue::factory()->todo()->create(['project_id' => $project->id]);
    $progress = Issue::factory()->inProgress()->create(['project_id' => $project->id]);

    $asc = collect($this->repository->getAllPaginated($project->id, 10, ['sort' => 'status', 'direction' => 'AZ'])->items())->pluck('id')->all();
    $desc = collect($this->repository->getAllPaginated($project->id, 10, ['sort' => 'status', 'direction' => 'ZA'])->items())->pluck('id')->all();

    expect($asc)->toBe([$todo->id, $progress->id, $done->id])
        ->and($desc)->toBe([$done->id, $progress->id, $todo->id]);
});

test('getForProject respects the priority filter', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'high']);
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'low']);

    $issues = $this->repository->getForProject($project->id, [], ['priority' => ['high']]);

    expect($issues)->toHaveCount(1)
        ->and($issues->first()->priority)->toBe('high');
});

test('getForProject respects the assignee filter, including unassigned', function () {
    $project = Project::factory()->create();
    $assignee = User::factory()->create();
    $assigned = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $assignee->id]);
    $unassigned = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => User::factory()->create()->id]);

    $issues = $this->repository->getForProject($project->id, [], [
        'assignee' => [(string) $assignee->id, 'unassigned'],
    ]);

    expect($issues->pluck('id'))->toContain($assigned->id)
        ->and($issues->pluck('id'))->toContain($unassigned->id)
        ->and($issues)->toHaveCount(2);
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

    expect($found->id)->toBe($issue->id)
        ->and($found->relationLoaded('creator'))->toBeTrue()
        ->and($found->relationLoaded('assignee'))->toBeTrue()
        ->and($found->relationLoaded('project'))->toBeTrue()
        ->and($found->relationLoaded('comments'))->toBeTrue()
        ->and($found->creator->id)->toBe($creator->id)
        ->and($found->assignee->id)->toBe($assignee->id)
        ->and($found->project->id)->toBe($project->id);
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

    expect($issues[0]->priority)->toBe('high')
        ->and($issues[1]->priority)->toBe('medium')
        ->and($issues[2]->priority)->toBe('low');
});

test('it can search issues by title', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Searchable Title']);
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Another Issue']);

    $results = $this->repository->getAllPaginated($project->id, 10, [], ['search' => 'Searchable']);

    expect($results->items())->toHaveCount(1)
        ->and($results->items()[0]->title)->toBe('Searchable Title');
});

test('it can search issues by description', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'description' => 'Target description']);
    Issue::factory()->create(['project_id' => $project->id, 'description' => 'Other content']);

    $results = $this->repository->getAllPaginated($project->id, 10, [], ['search' => 'Target']);

    expect($results->items())->toHaveCount(1)
        ->and($results->items()[0]->description)->toBe('Target description');
});

test('it can search issues by ID', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'id' => 999, 'number' => 999]);
    Issue::factory()->create(['project_id' => $project->id, 'id' => 888, 'number' => 888]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], ['search' => '999']);

    expect($results->items())->toHaveCount(1)
        ->and($results->items()[0]->id)->toBe(999);
});

test('it can filter issues by a single assignee', function () {
    $project = Project::factory()->create();
    $assignee = User::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $assignee->id]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => User::factory()->create()->id]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], [], ['assignee' => (string) $assignee->id]);

    expect($results->items())->toHaveCount(1)
        ->and($results->items()[0]->assignee_id)->toBe($assignee->id);
});

test('it can filter issues by multiple assignees', function () {
    $project = Project::factory()->create();
    $first = User::factory()->create();
    $second = User::factory()->create();
    $third = User::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $first->id]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $second->id]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $third->id]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], [], ['assignee' => "$first->id,$second->id"]);

    expect($results->items())->toHaveCount(2);
});

test('it can filter issues by assignee combined with unassigned', function () {
    $project = Project::factory()->create();
    $assignee = User::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $assignee->id]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => User::factory()->create()->id]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], [], ['assignee' => "$assignee->id,unassigned"]);

    expect($results->items())->toHaveCount(2);
});

test('it can still filter unassigned issues only', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null]);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => User::factory()->create()->id]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], [], ['assignee' => 'unassigned']);

    expect($results->items())->toHaveCount(1)
        ->and($results->items()[0]->assignee_id)->toBeNull();
});

test('it can search issues by labels', function () {
    $project = Project::factory()->create();
    Issue::factory()->create([
        'project_id' => $project->id,
        'labels' => ['bug'],
    ]);
    Issue::factory()->create([
        'project_id' => $project->id,
        'labels' => ['feature'],
    ]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], ['search' => 'bug']);

    expect($results->items())->toHaveCount(1);
});

test('it can search issues by a specific field key instead of the generic search term', function () {
    $project = Project::factory()->create();
    Issue::factory()->done()->create(['project_id' => $project->id]);
    Issue::factory()->todo()->create(['project_id' => $project->id]);

    $results = $this->repository->getAllPaginated($project->id, 10, [], ['status' => 'done']);

    expect($results->items())->toHaveCount(1)
        ->and($results->items()[0]->workflowStatus->category->value)->toBe('done');
});

test('it can sort issues by title ascending', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Banana']);
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'Apple']);

    $results = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'title', 'direction' => 'AZ']);

    expect($results->items()[0]->title)->toBe('Apple')
        ->and($results->items()[1]->title)->toBe('Banana');
});

test('it can sort issues by priority ascending', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'low', 'title' => 'Low']);
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'high', 'title' => 'High']);

    $results = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'priority', 'direction' => 'AZ']);

    expect($results->items()[0]->title)->toBe('High')
        ->and($results->items()[1]->title)->toBe('Low');
});

test('it can sort issues by priority descending', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'low', 'title' => 'Low']);
    Issue::factory()->create(['project_id' => $project->id, 'priority' => 'high', 'title' => 'High']);

    $results = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'priority', 'direction' => 'ZA']);

    expect($results->items()[0]->title)->toBe('Low')
        ->and($results->items()[1]->title)->toBe('High');
});

test('it can sort issues by assignee name', function () {
    $project = Project::factory()->create();
    $alice = User::factory()->create(['name' => 'Alice']);
    $bob = User::factory()->create(['name' => 'Bob']);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $bob->id, 'title' => 'Bob issue']);
    Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => $alice->id, 'title' => 'Alice issue']);

    $results = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'assignee', 'direction' => 'AZ']);

    expect($results->items()[0]->title)->toBe('Alice issue')
        ->and($results->items()[1]->title)->toBe('Bob issue');
});

test('it can sort issues by issue type name', function () {
    $project = Project::factory()->create();
    $bugType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#ef4444']);
    $featureType = $project->issueTypes()->create(['name' => 'Feature', 'icon' => 'Sparkles', 'color' => '#2196f3']);
    Issue::factory()->create(['project_id' => $project->id, 'issue_type_id' => $bugType->id, 'title' => 'Bug issue']);
    Issue::factory()->create(['project_id' => $project->id, 'issue_type_id' => $featureType->id, 'title' => 'Feature issue']);

    $results = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'type', 'direction' => 'AZ']);

    expect($results->items()[0]->title)->toBe('Bug issue')
        ->and($results->items()[1]->title)->toBe('Feature issue');
});

test('getAllPaginated eager-loads the issueType and workflowStatus relations', function () {
    $project = Project::factory()->create();
    $bugType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#ef4444']);
    $status = $bugType->statuses()->create(['name' => 'To Do', 'color' => '#94a3b8', 'category' => 'todo']);
    Issue::factory()->create(['project_id' => $project->id, 'issue_type_id' => $bugType->id, 'workflow_status_id' => $status->id]);

    $results = $this->repository->getAllPaginated($project->id, 10);

    expect($results->items()[0]->relationLoaded('issueType'))->toBeTrue()
        ->and($results->items()[0]->relationLoaded('workflowStatus'))->toBeTrue()
        ->and($results->items()[0]->issueType->name)->toBe('Bug')
        ->and($results->items()[0]->workflowStatus->name)->toBe('To Do');
});

test('it can sort issues by start_date, end_date and updated', function () {
    $project = Project::factory()->create();
    Issue::factory()->create(['project_id' => $project->id, 'start_date' => now()->addDays(2), 'end_date' => now()->addDays(3)]);
    Issue::factory()->create(['project_id' => $project->id, 'start_date' => now()->addDay(), 'end_date' => now()->addDays(2)]);

    $byStart = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'start_date', 'direction' => 'AZ']);
    $byEnd = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'end_date', 'direction' => 'AZ']);
    $byUpdated = $this->repository->getAllPaginated($project->id, 10, ['sort' => 'updated', 'direction' => 'AZ']);

    expect($byStart->items())->toHaveCount(2)
        ->and($byEnd->items())->toHaveCount(2)
        ->and($byUpdated->items())->toHaveCount(2);
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

function memberProject(User $user, array $attributes = []): Project
{
    $project = Project::factory()->create($attributes);
    addProjectMember($project, $user->id, 'member');

    return $project;
}

test('searchForUser finds issues by title across every project the user belongs to', function () {
    $user = User::factory()->create();
    $one = memberProject($user);
    $two = memberProject($user);
    Issue::factory()->create(['project_id' => $one->id, 'title' => 'Fix login bug']);
    Issue::factory()->create(['project_id' => $two->id, 'title' => 'Login page redesign']);
    Issue::factory()->create(['project_id' => $one->id, 'title' => 'Unrelated']);

    $titles = $this->repository->searchForUser($user->id, 'login')->pluck('title');

    expect($titles)->toHaveCount(2)
        ->and($titles)->toContain('Fix login bug', 'Login page redesign');
});

test('searchForUser never returns issues from projects the user is not a member of', function () {
    $user = User::factory()->create();
    $mine = memberProject($user);
    $foreign = Project::factory()->create();
    Issue::factory()->create(['project_id' => $mine->id, 'title' => 'Login mine']);
    Issue::factory()->create(['project_id' => $foreign->id, 'title' => 'Login foreign']);

    $titles = $this->repository->searchForUser($user->id, 'login')->pluck('title');

    expect($titles->all())->toBe(['Login mine']);
});

test('searchForUser is case-insensitive', function () {
    $user = User::factory()->create();
    Issue::factory()->create(['project_id' => memberProject($user)->id, 'title' => 'Fix LOGIN bug']);

    expect($this->repository->searchForUser($user->id, 'login'))->toHaveCount(1);
});

test('searchForUser ranks exact number, then title prefix, then substring', function () {
    $user = User::factory()->create();
    $project = memberProject($user);
    $substring = Issue::factory()->create(['project_id' => $project->id, 'title' => 'The 2 things']);
    $prefix = Issue::factory()->create(['project_id' => $project->id, 'title' => '2 factor auth']);
    $exact = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Plain', 'number' => 200]);

    $ids = $this->repository->searchForUser($user->id, '2', 8, 200)->pluck('id')->all();

    expect($ids)->toBe([$exact->id, $prefix->id, $substring->id]);
});

test('searchForUser with a number and no title is a pure number lookup', function () {
    $user = User::factory()->create();
    $project = memberProject($user);
    $target = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Target', 'number' => 42]);
    Issue::factory()->create(['project_id' => $project->id, 'title' => '42 is the answer', 'number' => 7]);

    $ids = $this->repository->searchForUser($user->id, '', 8, 42)->pluck('id')->all();

    expect($ids)->toBe([$target->id]);
});

test('searchForUser matches a number in every project the user can see', function () {
    $user = User::factory()->create();
    $one = memberProject($user);
    $two = memberProject($user);
    Issue::factory()->create(['project_id' => $one->id, 'number' => 5]);
    Issue::factory()->create(['project_id' => $two->id, 'number' => 5]);
    Issue::factory()->create(['project_id' => Project::factory()->create()->id, 'number' => 5]);

    expect($this->repository->searchForUser($user->id, '', 8, 5))->toHaveCount(2);
});

test('searchForUser orders ties by most recently updated', function () {
    $user = User::factory()->create();
    $project = memberProject($user);
    $older = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Alpha one']);
    $newer = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Alpha two']);
    $older->forceFill(['updated_at' => now()->subDay()])->saveQuietly();
    $newer->forceFill(['updated_at' => now()])->saveQuietly();

    $ids = $this->repository->searchForUser($user->id, 'alpha')->pluck('id')->all();

    expect($ids)->toBe([$newer->id, $older->id]);
});

test('searchForUser respects the limit', function () {
    $user = User::factory()->create();
    $project = memberProject($user);
    Issue::factory()->count(5)->create(['project_id' => $project->id, 'title' => 'Match me']);

    expect($this->repository->searchForUser($user->id, 'match', 3))->toHaveCount(3);
});

test('searchForUser treats % and _ in the query literally', function () {
    $user = User::factory()->create();
    $project = memberProject($user);
    Issue::factory()->create(['project_id' => $project->id, 'title' => '100% done']);
    Issue::factory()->create(['project_id' => $project->id, 'title' => '100 apples']);
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'snake_case name']);
    Issue::factory()->create(['project_id' => $project->id, 'title' => 'snakeXcase name']);

    expect($this->repository->searchForUser($user->id, '%')->pluck('title')->all())->toBe(['100% done'])
        ->and($this->repository->searchForUser($user->id, 'snake_case')->pluck('title')->all())->toBe(['snake_case name']);
});

test('searchForUser eager-loads the type, status and project', function () {
    $user = User::factory()->create();
    Issue::factory()->create(['project_id' => memberProject($user)->id, 'title' => 'Loaded']);

    $issue = $this->repository->searchForUser($user->id, 'loaded')->first();

    expect($issue->relationLoaded('issueType'))->toBeTrue()
        ->and($issue->relationLoaded('workflowStatus'))->toBeTrue()
        ->and($issue->relationLoaded('project'))->toBeTrue();
});

test('the workflow_status filter matches exact statuses, alone or with a category', function () {
    $project = Project::factory()->create();
    $review = Issue::factory()->inProgress()->create(['project_id' => $project->id]);
    $review->workflowStatus->update(['name' => 'In Review']);
    $other = Issue::factory()->done()->create(['project_id' => $project->id]);

    $byId = $this->repository->getForProject($project->id, [], ['workflow_status' => [$review->workflow_status_id]]);
    $csv = $this->repository->getForProject($project->id, [], ['workflow_status' => $review->workflow_status_id.','.$other->workflow_status_id]);
    $both = $this->repository->getForProject($project->id, [], ['workflow_status' => $csv->pluck('workflow_status_id')->all(), 'status' => ['done']]);

    expect($byId->pluck('id')->all())->toBe([$review->id])
        ->and($csv)->toHaveCount(2)
        ->and($both->pluck('id')->all())->toBe([$other->id]);
});

test('getAllPaginated loads each issue type with its statuses and transitions, so the board can pick a reachable status', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->todo()->create(['project_id' => $project->id]);
    $inProgress = $issue->issueType->statuses()->create([
        'name' => 'Doing', 'color' => '#f59e0b', 'category' => 'in_progress', 'sort_order' => 1,
    ]);
    $issue->issueType->transitions()->create(['from_status_id' => $issue->workflow_status_id, 'to_status_id' => $inProgress->id]);

    $loaded = $this->repository->getAllPaginated($project->id, 10)->items()[0];

    expect($loaded->issueType->relationLoaded('statuses'))->toBeTrue()
        ->and($loaded->issueType->statuses->pluck('name')->all())->toBe(['Todo status', 'Doing'])
        ->and($loaded->issueType->relationLoaded('transitions'))->toBeTrue()
        ->and($loaded->issueType->transitions)->toHaveCount(1);
});

test('findWorkflowStatus returns the status, or null for no id or an unknown one', function () {
    $issue = Issue::factory()->done()->create();

    expect($this->repository->findWorkflowStatus($issue->workflow_status_id)->is($issue->workflowStatus))->toBeTrue()
        ->and($this->repository->findWorkflowStatus(null))->toBeNull()
        ->and($this->repository->findWorkflowStatus(999999))->toBeNull();
});
