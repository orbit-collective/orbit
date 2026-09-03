<?php

use App\DataTransferObjects\ExternalIssueDTO;
use App\Events\IssuesImported;
use App\Models\ExternalIssueLink;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use App\Services\Integrations\ImportOrchestratorService;
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
