<?php

use App\Enums\IssueFieldType;
use App\Models\IssueTypeField;
use App\Models\Project;
use App\Models\User;
use App\Services\IssueTypeService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function projectWithTypes(string $role = 'admin'): array
{
    $project = Project::factory()->create();
    $user = User::factory()->create();
    $project->users()->attach($user->id, ['role' => $role]);
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);

    return [$project, $user, $project->issueTypes()->where('name', 'Bug')->first()];
}

test('an admin can add a custom field to an issue type', function () {
    [$project, $admin, $type] = projectWithTypes();

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types/$type->id/fields", [
        'label' => 'Repro notes',
        'type' => 'textarea',
        'is_required' => true,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('issue_type_fields', [
        'issue_type_id' => $type->id, 'label' => 'Repro notes', 'type' => 'textarea', 'is_required' => true,
    ]);
});

test('a select field keeps only its non-empty unique options', function () {
    [$project, $admin, $type] = projectWithTypes();

    $this->actingAs($admin)->post("/projects/$project->id/issue-types/$type->id/fields", [
        'label' => 'Urgency',
        'type' => 'select',
        'options' => ['Low', 'High', 'Low', '  '],
    ])->assertSessionHasNoErrors();

    expect($type->fields()->where('label', 'Urgency')->first()->options)->toBe(['Low', 'High']);
});

test('a non-select field stores no options', function () {
    [$project, $admin, $type] = projectWithTypes();

    $this->actingAs($admin)->post("/projects/$project->id/issue-types/$type->id/fields", [
        'label' => 'Scratch notes', 'type' => 'text', 'options' => ['ignored'],
    ]);

    expect($type->fields()->where('label', 'Scratch notes')->first()->options)->toBe([]);
});

test('two fields on one issue type cannot share a label', function () {
    [$project, $admin, $type] = projectWithTypes();
    IssueTypeField::factory()->create(['issue_type_id' => $type->id, 'label' => 'Urgency']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types/$type->id/fields", [
        'label' => 'Urgency', 'type' => 'text',
    ]);

    $response->assertSessionHasErrors('label');
});

test('a member cannot manage custom fields', function () {
    [$project, $member, $type] = projectWithTypes('member');

    $response = $this->actingAs($member)->post("/projects/$project->id/issue-types/$type->id/fields", [
        'label' => 'Urgency', 'type' => 'text',
    ]);

    $response->assertForbidden();
});

test('a field belonging to another issue type cannot be edited through this one', function () {
    [$project, $admin, $type] = projectWithTypes();
    $otherType = $project->issueTypes()->where('name', 'Task')->first();
    $field = IssueTypeField::factory()->create(['issue_type_id' => $otherType->id]);

    $response = $this->actingAs($admin)->patch(
        "/projects/$project->id/issue-types/$type->id/fields/$field->id",
        ['label' => 'Hacked', 'type' => 'text'],
    );

    $response->assertNotFound();
});

test('an admin can delete a custom field', function () {
    [$project, $admin, $type] = projectWithTypes();
    $field = IssueTypeField::factory()->create(['issue_type_id' => $type->id]);

    $response = $this->actingAs($admin)->delete("/projects/$project->id/issue-types/$type->id/fields/$field->id");

    $response->assertRedirect();
    expect(IssueTypeField::find($field->id))->toBeNull();
});

test('deleting an issue type cascades to its custom fields', function () {
    [, , $type] = projectWithTypes();
    $field = IssueTypeField::factory()->create(['issue_type_id' => $type->id]);

    $type->delete();

    expect(IssueTypeField::find($field->id))->toBeNull();
});

test('creating an issue stores only values for fields of its own type', function () {
    [$project, $admin, $bugType] = projectWithTypes();
    $taskType = $project->issueTypes()->where('name', 'Task')->first();
    $ownField = IssueTypeField::factory()->create(['issue_type_id' => $bugType->id, 'label' => 'Host']);
    $foreignField = IssueTypeField::factory()->create(['issue_type_id' => $taskType->id, 'label' => 'Effort estimate']);

    $this->actingAs($admin)->post('/issues', [
        'title' => 'A bug', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open',
        'issue_type_id' => $bugType->id,
        'custom_fields' => [$ownField->id => 'Production', $foreignField->id => 'ignored'],
    ])->assertRedirect();

    $issue = $project->issues()->where('title', 'A bug')->first();
    expect($issue->custom_fields)->toBe([(string) $ownField->id => 'Production']);
});

test('a required custom field blocks creating an issue of that type', function () {
    [$project, $admin, $bugType] = projectWithTypes();
    IssueTypeField::factory()->create([
        'issue_type_id' => $bugType->id, 'label' => 'Host', 'is_required' => true,
    ]);

    $response = $this->actingAs($admin)->post('/issues', [
        'title' => 'A bug', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open',
        'issue_type_id' => $bugType->id,
    ]);

    $response->assertSessionHasErrors('custom_fields');
});

test('a select field only accepts one of its configured options', function () {
    [$project, $admin, $bugType] = projectWithTypes();
    $field = IssueTypeField::factory()->create([
        'issue_type_id' => $bugType->id, 'label' => 'Urgency',
        'type' => IssueFieldType::SELECT, 'options' => ['Low', 'High'],
    ]);

    $this->actingAs($admin)->post('/issues', [
        'title' => 'A bug', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open',
        'issue_type_id' => $bugType->id,
        'custom_fields' => [$field->id => 'Nonsense'],
    ])->assertRedirect();

    expect($project->issues()->where('title', 'A bug')->first()->custom_fields)->toBe([]);
});

test('updating an issue merges custom field values instead of replacing them', function () {
    [$project, $admin, $bugType] = projectWithTypes();
    $one = IssueTypeField::factory()->create(['issue_type_id' => $bugType->id, 'label' => 'Host']);
    $two = IssueTypeField::factory()->create(['issue_type_id' => $bugType->id, 'label' => 'Browser']);
    $issue = $project->issues()->create([
        'title' => 'A bug', 'project_id' => $project->id, 'user_id' => $admin->id,
        'issue_type_id' => $bugType->id, 'priority' => 'low', 'status' => 'open',
        'custom_fields' => [(string) $one->id => 'Production'],
    ]);

    $this->actingAs($admin)->patch("/issues/$issue->id", [
        'custom_fields' => [$two->id => 'Firefox'],
    ])->assertRedirect();

    expect($issue->refresh()->custom_fields)->toBe([
        (string) $one->id => 'Production',
        (string) $two->id => 'Firefox',
    ]);
});
