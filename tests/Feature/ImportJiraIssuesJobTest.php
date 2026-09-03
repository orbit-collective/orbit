<?php

use App\Enums\Notifications\NotificationChannel;
use App\Enums\Notifications\NotificationType;
use App\Jobs\ImportJiraIssuesJob;
use App\Models\Issue;
use App\Models\Notification;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use App\Services\NotificationSettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->project = Project::factory()->create();
    $this->projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'jira',
        'enabled' => true,
        'credentials' => ['instance_url' => 'https://example.atlassian.net', 'email' => 'a@b.com', 'api_token' => 'secret'],
    ]);
});

function fakeJiraPage(array $issues): void
{
    Http::fake(['*/rest/api/3/search/jql*' => Http::response(['issues' => $issues], 200)]);
}

function jiraIssueFixture(string $id, string $key, string $summary): array
{
    return [
        'id' => $id,
        'key' => $key,
        'fields' => [
            'summary' => $summary,
            'status' => ['name' => 'To Do'],
            'issuetype' => ['name' => 'Task'],
        ],
    ];
}

test('handle() imports issues and marks progress done with a run id', function () {
    fakeJiraPage([jiraIssueFixture('1', 'PR-1', 'First issue')]);

    $job = new ImportJiraIssuesJob($this->projectIntegration, $this->project, $this->user->id, ['project_key' => 'PR']);
    app()->call([$job, 'handle']);

    expect(Issue::where('project_id', $this->project->id)->count())->toBe(1);

    $progress = $this->projectIntegration->refresh()->options['import_progress'];
    expect($progress['status'])->toBe('done')
        ->and($progress['imported'])->toBe(1)
        ->and($progress['run_id'])->toBeString()
        ->and($progress['run_id'])->not->toBeEmpty();
});

test('handle() persists a last_import summary alongside the progress record', function () {
    fakeJiraPage([jiraIssueFixture('1', 'PR-1', 'First issue')]);

    $job = new ImportJiraIssuesJob($this->projectIntegration, $this->project, $this->user->id, ['project_key' => 'PR']);
    app()->call([$job, 'handle']);

    $lastImport = $this->projectIntegration->refresh()->options['last_import'];
    expect($lastImport)->toMatchArray(['imported' => 1, 'updated' => 0, 'skipped' => 0, 'failed' => 0]);
});

test('handle() passes sync_existing through to the orchestrator, so a re-import overwrites the existing issue', function () {
    // A single Http::fake() registration with a sequence - calling
    // Http::fake() a second time in the same test does NOT replace the
    // first registration for an overlapping URL pattern (the earliest
    // registered stub wins), so both pages must be queued up front.
    Http::fake(['*/rest/api/3/search/jql*' => Http::sequence()
        ->push(['issues' => [jiraIssueFixture('1', 'PR-1', 'Original title')]], 200)
        ->push(['issues' => [jiraIssueFixture('1', 'PR-1', 'Changed remotely')]], 200)]);

    $firstJob = new ImportJiraIssuesJob($this->projectIntegration, $this->project, $this->user->id, ['project_key' => 'PR']);
    app()->call([$firstJob, 'handle']);

    $issue = Issue::where('project_id', $this->project->id)->firstOrFail();
    $issue->update(['title' => 'Locally edited']);

    $syncJob = new ImportJiraIssuesJob($this->projectIntegration, $this->project, $this->user->id, [
        'project_key' => 'PR',
        'sync_existing' => true,
    ]);
    app()->call([$syncJob, 'handle']);

    expect($issue->refresh()->title)->toBe('Changed remotely');

    $progress = $this->projectIntegration->refresh()->options['import_progress'];
    expect($progress['updated'])->toBe(1)
        ->and($progress['imported'])->toBe(0);
});

test('handle() does nothing but log a warning when the integration has no registered importer', function () {
    $unknownIntegration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'not-a-real-integration',
        'enabled' => true,
    ]);

    $job = new ImportJiraIssuesJob($unknownIntegration, $this->project, $this->user->id, []);
    app()->call([$job, 'handle']);

    expect(Issue::where('project_id', $this->project->id)->count())->toBe(0);
});

test('failed() records a failed progress status and notifies the importing user', function () {
    app(NotificationSettingService::class)->update(
        $this->user->id, NotificationType::IntegrationActivity, NotificationChannel::InApp, true,
    );

    $job = new ImportJiraIssuesJob($this->projectIntegration, $this->project, $this->user->id, ['project_key' => 'PR']);
    $job->failed(new Exception('Jira is unreachable'));

    $progress = $this->projectIntegration->refresh()->options['import_progress'];
    expect($progress['status'])->toBe('failed');

    $notification = Notification::where('user_id', $this->user->id)->latest()->first();
    expect($notification)->not->toBeNull()
        ->and($notification->notification_type)->toBe(NotificationType::IntegrationActivity)
        ->and($notification->title)->toBe('Jira import failed')
        ->and($notification->message)->toContain('Jira is unreachable');
});
