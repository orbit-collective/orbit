<?php

use App\Enums\AutomationTriggerType;
use App\Models\AutomationRule;
use App\Models\AutomationRuleExecution;
use App\Models\Issue;
use App\Models\Project;
use App\Services\Automation\AutomationDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->dispatcher = app(AutomationDispatcher::class);
});

function makeAutomationRule(Project $project, AutomationTriggerType $trigger, array $conditions = [], bool $enabled = true): AutomationRule
{
    $rule = AutomationRule::query()->create([
        'project_id' => $project->id,
        'name' => 'Test rule',
        'trigger_type' => $trigger->value,
        'conditions' => $conditions,
        'enabled' => $enabled,
    ]);

    $rule->actions()->create([
        'type' => 'change_priority',
        'params' => ['priority' => 'high'],
        'sort_order' => 0,
    ]);

    return $rule;
}

test('a matching rule runs its actions once', function () {
    $issue = Issue::factory()->create(['priority' => 'low']);
    makeAutomationRule($issue->project, AutomationTriggerType::GithubPullRequestMerged);

    $this->dispatcher->dispatch(AutomationTriggerType::GithubPullRequestMerged, $issue, [], 'evt_1');

    expect($issue->fresh()->priority)->toBe('high');
    expect(AutomationRuleExecution::query()->count())->toBe(1);
});

test('a rule execution is written to the activity log', function () {
    $issue = Issue::factory()->create(['priority' => 'low']);
    makeAutomationRule($issue->project, AutomationTriggerType::GithubPullRequestMerged);

    $this->dispatcher->dispatch(AutomationTriggerType::GithubPullRequestMerged, $issue, [], 'evt_1');

    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $issue->project_id,
        'body' => "The \"Test rule\" automation rule ran on issue #$issue->id \"$issue->title\"",
    ]);
});

test('a rule that never matches never logs an execution', function () {
    $issue = Issue::factory()->create(['priority' => 'low']);
    makeAutomationRule($issue->project, AutomationTriggerType::GithubPullRequestMerged, [
        ['field' => 'pullRequest.title', 'operator' => 'equals', 'value' => 'Specific title'],
    ]);

    $this->dispatcher->dispatch(AutomationTriggerType::GithubPullRequestMerged, $issue, ['pullRequest' => ['title' => 'Other']], 'evt_1');

    $this->assertDatabaseMissing('activity_logs', ['project_id' => $issue->project_id]);
});

test('conditions that do not match prevent execution', function () {
    $issue = Issue::factory()->create(['priority' => 'low']);
    makeAutomationRule($issue->project, AutomationTriggerType::GithubPullRequestMerged, [
        ['field' => 'pullRequest.title', 'operator' => 'equals', 'value' => 'Specific title'],
    ]);

    $this->dispatcher->dispatch(AutomationTriggerType::GithubPullRequestMerged, $issue, ['pullRequest' => ['title' => 'Other']], 'evt_1');

    expect($issue->fresh()->priority)->toBe('low');
});

test('a disabled rule never executes', function () {
    $issue = Issue::factory()->create(['priority' => 'low']);
    makeAutomationRule($issue->project, AutomationTriggerType::GithubPullRequestMerged, enabled: false);

    $this->dispatcher->dispatch(AutomationTriggerType::GithubPullRequestMerged, $issue, [], 'evt_1');

    expect($issue->fresh()->priority)->toBe('low');
});

test('a rule for a different trigger never executes', function () {
    $issue = Issue::factory()->create(['priority' => 'low']);
    makeAutomationRule($issue->project, AutomationTriggerType::GithubPullRequestClosed);

    $this->dispatcher->dispatch(AutomationTriggerType::GithubPullRequestMerged, $issue, [], 'evt_1');

    expect($issue->fresh()->priority)->toBe('low');
});

test('the same idempotency key never executes a rule twice', function () {
    $issue = Issue::factory()->create(['priority' => 'low']);
    makeAutomationRule($issue->project, AutomationTriggerType::GithubPullRequestMerged);

    $this->dispatcher->dispatch(AutomationTriggerType::GithubPullRequestMerged, $issue, [], 'evt_1');
    $issue->update(['priority' => 'low']);
    $this->dispatcher->dispatch(AutomationTriggerType::GithubPullRequestMerged, $issue, [], 'evt_1');

    expect(AutomationRuleExecution::query()->count())->toBe(1);
    // priority was manually reset to low above; a second real execution would flip it back to high.
    expect($issue->fresh()->priority)->toBe('low');
});

test('a different idempotency key executes the rule again', function () {
    $issue = Issue::factory()->create(['priority' => 'low']);
    makeAutomationRule($issue->project, AutomationTriggerType::GithubPullRequestMerged);

    $this->dispatcher->dispatch(AutomationTriggerType::GithubPullRequestMerged, $issue, [], 'evt_1');
    $this->dispatcher->dispatch(AutomationTriggerType::GithubPullRequestMerged, $issue, [], 'evt_2');

    expect(AutomationRuleExecution::query()->count())->toBe(2);
});
