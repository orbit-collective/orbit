<?php

use App\DataTransferObjects\ExternalIssueDTO;
use App\Enums\IntegrationFieldMappingType;
use App\Events\IssuesImported;
use App\Models\ExternalIssueLink;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use App\Repositories\IntegrationFieldMappingRepository;
use App\Services\Integrations\ImportOrchestratorService;
use App\Services\IssueTypeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->service = app(ImportOrchestratorService::class);
    $this->project = Project::factory()->create();
    $this->importedBy = User::factory()->create();
    $this->projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
        'credentials' => ['instance_url' => 'https://example.atlassian.net', 'email' => 'a@b.com', 'api_token' => 'secret'],
    ]);
    Event::fake();
});

function makeExternalIssue(array $overrides = []): ExternalIssueDTO
{
    return new ExternalIssueDTO(
        externalId: $overrides['externalId'] ?? '1',
        externalKey: $overrides['externalKey'] ?? 'EXT-1',
        title: $overrides['title'] ?? 'Some title',
        description: $overrides['description'] ?? null,
        externalStatus: $overrides['externalStatus'] ?? null,
        externalPriority: $overrides['externalPriority'] ?? null,
        externalLabels: $overrides['externalLabels'] ?? [],
        type: $overrides['type'] ?? null,
        parentExternalId: $overrides['parentExternalId'] ?? null,
        assigneeExternalId: $overrides['assigneeExternalId'] ?? null,
        assigneeEmail: $overrides['assigneeEmail'] ?? null,
        startDate: $overrides['startDate'] ?? null,
        endDate: $overrides['endDate'] ?? null,
        url: $overrides['url'] ?? null,
    );
}

test('imports a new issue and links it via ExternalIssueLink', function () {
    $result = $this->service->import(
        $this->projectIntegration, $this->project, $this->importedBy,
        [makeExternalIssue(['externalId' => '100', 'externalKey' => 'PR-1', 'title' => 'First issue'])],
    );

    expect($result->imported)->toBe(1)
        ->and($result->updated)->toBe(0)
        ->and($result->skipped)->toBe(0)
        ->and($result->failed)->toBe(0);

    $issue = Issue::where('project_id', $this->project->id)->first();
    expect($issue->title)->toBe('First issue');

    expect(ExternalIssueLink::query()
        ->where('project_integration_id', $this->projectIntegration->id)
        ->where('external_id', '100')
        ->where('issue_id', $issue->id)
        ->exists())->toBeTrue();
});

test('skips an already-imported issue by default, leaving local changes untouched', function () {
    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [
        makeExternalIssue(['externalId' => '100', 'title' => 'Original title']),
    ]);
    $issue = Issue::where('project_id', $this->project->id)->first();
    $issue->update(['title' => 'Locally edited title']);

    $result = $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [
        makeExternalIssue(['externalId' => '100', 'title' => 'Changed remotely']),
    ]);

    expect($result->imported)->toBe(0)
        ->and($result->skipped)->toBe(1)
        ->and($result->updated)->toBe(0);

    expect($issue->refresh()->title)->toBe('Locally edited title');
});

test('syncExisting overwrites an already-imported issue - the remote system wins over a local edit', function () {
    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [
        makeExternalIssue(['externalId' => '100', 'title' => 'Original title']),
    ]);
    $issue = Issue::where('project_id', $this->project->id)->first();
    $issue->update(['title' => 'Locally edited title']);

    $result = $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [
        makeExternalIssue(['externalId' => '100', 'title' => 'Changed remotely']),
    ], syncExisting: true);

    expect($result->updated)->toBe(1)
        ->and($result->imported)->toBe(0)
        ->and($result->skipped)->toBe(0);

    expect($issue->refresh()->title)->toBe('Changed remotely');
});

test('resolves parent_id even when a child arrives before its parent in the source', function () {
    $child = makeExternalIssue(['externalId' => '200', 'externalKey' => 'PR-2', 'title' => 'Subtask', 'parentExternalId' => '100']);
    $parent = makeExternalIssue(['externalId' => '100', 'externalKey' => 'PR-1', 'title' => 'Epic']);

    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [$child, $parent]);

    $childIssue = Issue::where('title', 'Subtask')->firstOrFail();
    $parentIssue = Issue::where('title', 'Epic')->firstOrFail();

    expect($childIssue->parent_id)->toBe($parentIssue->id);
});

test('resolves parent_id against a parent imported in a previous run', function () {
    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [
        makeExternalIssue(['externalId' => '100', 'title' => 'Epic']),
    ]);
    $parentIssue = Issue::where('title', 'Epic')->firstOrFail();

    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [
        makeExternalIssue(['externalId' => '200', 'title' => 'Subtask', 'parentExternalId' => '100']),
    ]);

    $childIssue = Issue::where('title', 'Subtask')->firstOrFail();
    expect($childIssue->parent_id)->toBe($parentIssue->id);
});

test('counts a per-issue failure without aborting the rest of the run', function () {
    // Deliberately violates the issues table's date-order trigger (see
    // database/migrations/..._add_date_check_constraint_to_issues_table.php)
    // to force IssueService::importIssue() to throw for exactly one issue,
    // so we can verify the orchestrator counts it as failed and keeps
    // processing the remaining issues rather than aborting the whole run.
    $result = $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [
        makeExternalIssue(['externalId' => '999', 'externalKey' => 'PR-9', 'startDate' => '2026-01-10', 'endDate' => '2026-01-01']),
        makeExternalIssue(['externalId' => '998', 'externalKey' => 'PR-8']),
    ]);

    expect($result->failed)->toBe(1)
        ->and($result->imported)->toBe(1)
        ->and($result->errors)->toHaveCount(1)
        ->and($result->errors[0])->toStartWith('PR-9:');
});

test('fires IssuesImported once per run with the final result', function () {
    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [
        makeExternalIssue(['externalId' => '100']),
        makeExternalIssue(['externalId' => '101']),
    ]);

    Event::assertDispatchedTimes(IssuesImported::class, 1);
    Event::assertDispatched(IssuesImported::class, function (IssuesImported $event) {
        return $event->project->is($this->project)
            && $event->importedBy->is($this->importedBy)
            && $event->result->imported === 2;
    });
});

test('omits an imported label whose mapped orbit value no longer exists in the project taxonomy', function () {
    app(IntegrationFieldMappingRepository::class)->upsert(
        $this->projectIntegration, IntegrationFieldMappingType::LABEL, 'Bug', 'not-a-real-label',
    );

    $this->service->import(
        $this->projectIntegration, $this->project, $this->importedBy,
        [makeExternalIssue(['externalId' => '100', 'externalLabels' => ['Bug']])],
    );

    $issue = Issue::where('project_id', $this->project->id)->first();

    expect($issue->labels)->toBeNull();
});

test('keeps an imported label whose mapped orbit value exists in the project taxonomy', function () {
    app(IntegrationFieldMappingRepository::class)->upsert(
        $this->projectIntegration, IntegrationFieldMappingType::LABEL, 'Bug', 'bug',
    );

    $this->service->import(
        $this->projectIntegration, $this->project, $this->importedBy,
        [makeExternalIssue(['externalId' => '100', 'externalLabels' => ['Bug']])],
    );

    $issue = Issue::where('project_id', $this->project->id)->first();

    expect($issue->labels)->toBe(['bug']);
});

test('calls onProgress with running totals after every processed issue', function () {
    $calls = [];

    $this->service->import(
        $this->projectIntegration, $this->project, $this->importedBy,
        [makeExternalIssue(['externalId' => '100']), makeExternalIssue(['externalId' => '101'])],
        syncExisting: false,
        onProgress: function (int $imported, int $updated, int $skipped, int $failed) use (&$calls) {
            $calls[] = [$imported, $updated, $skipped, $failed];
        },
    );

    expect($calls)->toBe([[1, 0, 0, 0], [2, 0, 0, 0]]);
});

test('an imported issue is given the Orbit issue type matching its remote type name', function () {
    $external = new ExternalIssueDTO(
        externalId: '1', externalKey: 'JIRA-1', title: 'A crash', description: null,
        externalStatus: null, externalPriority: null, type: 'Bug',
    );

    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [$external]);

    $issue = $this->project->issues()->where('title', 'A crash')->first();
    expect($issue->issueType->name)->toBe('Bug');
});

test('a configured issue type mapping wins over the matching name', function () {
    app(IntegrationFieldMappingRepository::class)->upsert(
        $this->projectIntegration, IntegrationFieldMappingType::ISSUE_TYPE, 'Story', 'Epic',
    );
    $external = new ExternalIssueDTO(
        externalId: '1', externalKey: 'JIRA-1', title: 'Big thing', description: null,
        externalStatus: null, externalPriority: null, type: 'Story',
    );

    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [$external]);

    expect($this->project->issues()->first()->issueType->name)->toBe('Epic');
});

test('an unknown remote type falls back to the default issue type', function () {
    $external = new ExternalIssueDTO(
        externalId: '1', externalKey: 'JIRA-1', title: 'Odd one', description: null,
        externalStatus: null, externalPriority: null, type: 'Nonsense',
    );

    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [$external]);

    expect($this->project->issues()->first()->issueType->name)->toBe('Task');
});

test('an imported issue lands on a real workflow status of its own type', function () {
    $external = new ExternalIssueDTO(
        externalId: '1', externalKey: 'JIRA-1', title: 'A crash', description: null,
        externalStatus: 'In Progress', externalPriority: null, type: 'Bug',
    );

    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [$external]);

    $issue = $this->project->issues()->first();
    expect($issue->workflowStatus)->not->toBeNull()
        ->and($issue->workflowStatus->issue_type_id)->toBe($issue->issue_type_id);
});

test('a status mapping naming a workflow status of that type is used directly', function () {
    app(IssueTypeService::class)->ensureSystemIssueTypes($this->project);
    app(IntegrationFieldMappingRepository::class)->upsert(
        $this->projectIntegration, IntegrationFieldMappingType::STATUS, 'Code Review', 'In Review',
    );
    $external = new ExternalIssueDTO(
        externalId: '1', externalKey: 'JIRA-1', title: 'A crash', description: null,
        externalStatus: 'Code Review', externalPriority: null, type: 'Bug',
    );

    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [$external]);

    expect($this->project->issues()->first()->workflowStatus->name)->toBe('In Review');
});

test('a legacy status mapping still resolves by category within the type workflow', function () {
    app(IntegrationFieldMappingRepository::class)->upsert(
        $this->projectIntegration, IntegrationFieldMappingType::STATUS, 'Done', 'closed',
    );
    $external = new ExternalIssueDTO(
        externalId: '1', externalKey: 'JIRA-1', title: 'A crash', description: null,
        externalStatus: 'Done', externalPriority: null, type: 'Bug',
    );

    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [$external]);

    $issue = $this->project->issues()->first();
    expect($issue->workflowStatus->category->value)->toBe('done')
        ->and($issue->status)->toBe('closed');
});

test('importing a hierarchy the project did not allow widens the parent type', function () {
    app(IssueTypeService::class)->ensureSystemIssueTypes($this->project);
    $bugType = $this->project->issueTypes()->where('name', 'Bug')->first();
    expect($bugType->allows_children)->toBeFalse();

    $parent = new ExternalIssueDTO(
        externalId: '1', externalKey: 'JIRA-1', title: 'Parent bug', description: null,
        externalStatus: null, externalPriority: null, type: 'Bug',
    );
    $child = new ExternalIssueDTO(
        externalId: '2', externalKey: 'JIRA-2', title: 'Child chore', description: null,
        externalStatus: null, externalPriority: null, type: 'Chore', parentExternalId: '1',
    );

    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [$parent, $child]);

    $childIssue = $this->project->issues()->where('title', 'Child chore')->first();
    $parentIssue = $this->project->issues()->where('title', 'Parent bug')->first();

    // An empty allowed set already means "any type", so widening only has to
    // flip allows_children - adding a single entry would narrow it instead.
    expect($childIssue->parent_id)->toBe($parentIssue->id)
        ->and($bugType->refresh()->allows_children)->toBeTrue()
        ->and($bugType->allowedChildTypes()->count())->toBe(0);
});

test('importing a child a restricted parent type does not list adds it to the allowed set', function () {
    app(IssueTypeService::class)->ensureSystemIssueTypes($this->project);
    $storyType = $this->project->issueTypes()->where('name', 'Story')->first();
    expect($storyType->allowedChildTypes()->pluck('name')->all())->not->toContain('Design');

    $parent = new ExternalIssueDTO(
        externalId: '1', externalKey: 'JIRA-1', title: 'A story', description: null,
        externalStatus: null, externalPriority: null, type: 'Story',
    );
    $child = new ExternalIssueDTO(
        externalId: '2', externalKey: 'JIRA-2', title: 'A mockup', description: null,
        externalStatus: null, externalPriority: null, type: 'Design', parentExternalId: '1',
    );

    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [$parent, $child]);

    expect($this->project->issues()->where('title', 'A mockup')->first()->parent_id)
        ->toBe($this->project->issues()->where('title', 'A story')->first()->id)
        ->and($storyType->refresh()->allowedChildTypes()->pluck('name')->all())->toContain('Design');
});

test('an import never removes a child type the project already allowed', function () {
    app(IssueTypeService::class)->ensureSystemIssueTypes($this->project);
    $epicType = $this->project->issueTypes()->where('name', 'Epic')->first();
    $before = $epicType->allowedChildTypes()->pluck('name')->sort()->values()->all();

    $parent = new ExternalIssueDTO(
        externalId: '1', externalKey: 'JIRA-1', title: 'An epic', description: null,
        externalStatus: null, externalPriority: null, type: 'Epic',
    );
    $child = new ExternalIssueDTO(
        externalId: '2', externalKey: 'JIRA-2', title: 'A task', description: null,
        externalStatus: null, externalPriority: null, type: 'Task', parentExternalId: '1',
    );

    $this->service->import($this->projectIntegration, $this->project, $this->importedBy, [$parent, $child]);

    expect($epicType->refresh()->allowedChildTypes()->pluck('name')->sort()->values()->all())
        ->toBe($before);
});
