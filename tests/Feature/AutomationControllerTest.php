<?php

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Models\AutomationRule;
use App\Models\Permission;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('settings page grants an admin access to view and update automation', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, 'admin');

    $response = $this->actingAs($user)->get('/settings/automation');

    $response->assertInertia(fn (Assert $page) => $page
        ->where('hasAutomationAccess', true)
        ->where('canUpdateAutomation', true)
    );
});

test('settings page grants a plain member view-only access to automation', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, 'member');

    $response = $this->actingAs($user)->get('/settings/automation');

    $response->assertInertia(fn (Assert $page) => $page
        ->where('hasAutomationAccess', true)
        ->where('canUpdateAutomation', false)
    );
});

test('settings page hides automation data from a viewer whose role lacks the view permission', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, 'viewer');
    $project->roles()->where('slug', 'viewer')->first()->permissions()
        ->detach(Permission::where('key', PermissionEnum::AUTOMATION_VIEW->value)->value('id'));

    $response = $this->actingAs($user)->get('/settings/automation');

    $response->assertInertia(fn (Assert $page) => $page
        ->where('hasAutomationAccess', false)
        ->where('automationRules', [])
    );
});

test('an admin can create an automation rule with a condition and an action', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, 'admin');

    $response = $this->actingAs($user)->post("/projects/$project->id/automation-rules", [
        'name' => 'Merge to done',
        'trigger_type' => 'github.pull_request.merged',
        'enabled' => true,
        'conditions' => [
            ['field' => 'pullRequest.title', 'operator' => 'contains', 'value' => 'fix'],
        ],
        'actions' => [
            ['type' => 'change_priority', 'params' => ['priority' => 'high']],
        ],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('automation_rules', [
        'project_id' => $project->id,
        'name' => 'Merge to done',
        'trigger_type' => 'github.pull_request.merged',
    ]);
    $rule = AutomationRule::query()->where('name', 'Merge to done')->first();
    expect($rule->actions()->count())->toBe(1);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'body' => 'Created the "Merge to done" automation rule',
    ]);
});

test('a member cannot create an automation rule', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, 'member');

    $response = $this->actingAs($user)->post("/projects/$project->id/automation-rules", [
        'name' => 'Merge to done',
        'trigger_type' => 'github.pull_request.merged',
        'actions' => [['type' => 'change_priority', 'params' => ['priority' => 'high']]],
    ]);

    $response->assertForbidden();
    $this->assertDatabaseMissing('automation_rules', ['name' => 'Merge to done']);
});

test('an admin can update an automation rule', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, 'admin');
    $rule = AutomationRule::query()->create([
        'project_id' => $project->id,
        'name' => 'Original',
        'trigger_type' => 'github.pull_request.merged',
        'conditions' => [],
        'enabled' => true,
    ]);
    $rule->actions()->create(['type' => 'change_priority', 'params' => ['priority' => 'low'], 'sort_order' => 0]);

    $response = $this->actingAs($user)->patch("/projects/$project->id/automation-rules/$rule->id", [
        'name' => 'Renamed',
        'trigger_type' => 'github.pull_request.merged',
        'enabled' => false,
        'actions' => [['type' => 'change_priority', 'params' => ['priority' => 'high']]],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('automation_rules', ['id' => $rule->id, 'name' => 'Renamed', 'enabled' => false]);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'body' => 'Updated the "Renamed" automation rule',
    ]);
});

test('toggling only the enabled state logs a distinct enabled/disabled message', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, 'admin');
    $rule = AutomationRule::query()->create([
        'project_id' => $project->id,
        'name' => 'Toggleable',
        'trigger_type' => 'github.pull_request.merged',
        'conditions' => [],
        'enabled' => true,
    ]);
    $rule->actions()->create(['type' => 'change_priority', 'params' => ['priority' => 'low'], 'sort_order' => 0]);

    $this->actingAs($user)->patch("/projects/$project->id/automation-rules/$rule->id", [
        'name' => 'Toggleable',
        'trigger_type' => 'github.pull_request.merged',
        'enabled' => false,
        'conditions' => [],
        'actions' => [['type' => 'change_priority', 'params' => ['priority' => 'low']]],
    ]);

    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'body' => 'Disabled the "Toggleable" automation rule',
    ]);
    $this->assertDatabaseMissing('activity_logs', [
        'project_id' => $project->id,
        'body' => 'Updated the "Toggleable" automation rule',
    ]);
});

test('a rule belonging to another project cannot be updated', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    addProjectMember($project, $user->id, 'admin');
    $rule = AutomationRule::query()->create([
        'project_id' => $otherProject->id,
        'name' => 'Foreign rule',
        'trigger_type' => 'github.pull_request.merged',
        'conditions' => [],
        'enabled' => true,
    ]);

    $response = $this->actingAs($user)->patch("/projects/$project->id/automation-rules/$rule->id", [
        'name' => 'Hijacked',
        'trigger_type' => 'github.pull_request.merged',
        'actions' => [['type' => 'change_priority', 'params' => ['priority' => 'high']]],
    ]);

    $response->assertNotFound();
});

test('an admin can delete an automation rule', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, 'admin');
    $rule = AutomationRule::query()->create([
        'project_id' => $project->id,
        'name' => 'Deletable',
        'trigger_type' => 'github.pull_request.merged',
        'conditions' => [],
        'enabled' => true,
    ]);

    $response = $this->actingAs($user)->delete("/projects/$project->id/automation-rules/$rule->id");

    $response->assertRedirect();
    $this->assertDatabaseMissing('automation_rules', ['id' => $rule->id]);
    $this->assertDatabaseHas('activity_logs', [
        'project_id' => $project->id,
        'body' => 'Deleted the "Deletable" automation rule',
    ]);
});
