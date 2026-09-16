<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an admin can create a template for an issue type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types/$issueType->id/templates", [
        'name' => 'Standard Bug Report',
        'description' => 'Steps to reproduce...',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('issue_type_templates', ['issue_type_id' => $issueType->id, 'name' => 'Standard Bug Report']);
});

test('a member without the issue_types.update permission cannot create a template', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($member)->post("/projects/$project->id/issue-types/$issueType->id/templates", [
        'name' => 'Standard',
    ]);

    $response->assertForbidden();
});

test('an admin can update and delete a template', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $template = $issueType->templates()->create(['name' => 'Standard']);

    $updateResponse = $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$issueType->id/templates/$template->id", [
        'name' => 'Detailed',
    ]);
    $updateResponse->assertRedirect();
    expect($template->refresh()->name)->toBe('Detailed');

    $destroyResponse = $this->actingAs($admin)->delete("/projects/$project->id/issue-types/$issueType->id/templates/$template->id");
    $destroyResponse->assertRedirect();
    $this->assertDatabaseMissing('issue_type_templates', ['id' => $template->id]);
});

test('a template belonging to a different issue type cannot be updated through a mismatched type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueTypeA = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $issueTypeB = $project->issueTypes()->create(['name' => 'Feature', 'icon' => 'Sparkles', 'color' => '#2196f3']);
    $template = $issueTypeB->templates()->create(['name' => 'Standard']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$issueTypeA->id/templates/$template->id", [
        'name' => 'Detailed',
    ]);

    $response->assertNotFound();
});

test('guests cannot manage issue type templates', function () {
    $project = Project::factory()->create();
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $template = $issueType->templates()->create(['name' => 'Standard']);

    $response = $this->delete("/projects/$project->id/issue-types/$issueType->id/templates/$template->id");

    $response->assertRedirect(route('login'));
});

test('a template description carrying a markdown image link round-trips unchanged', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $description = "Repro: ![shot.png](/storage/attachments/$project->id/shot.png)";

    $this->actingAs($admin)->post("/projects/$project->id/issue-types/$issueType->id/templates", [
        'name' => 'Standard',
        'description' => $description,
    ])->assertRedirect();

    $this->assertDatabaseHas('issue_type_templates', [
        'issue_type_id' => $issueType->id,
        'description' => $description,
    ]);
});

test('updating a template keeps a markdown image link intact', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);
    $template = $issueType->templates()->create(['name' => 'Standard', 'description' => 'No image yet']);

    $description = 'Now with ![shot.png](/storage/attachments/1/shot.png) added';

    $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$issueType->id/templates/$template->id", [
        'name' => 'Standard',
        'description' => $description,
    ])->assertRedirect();

    $this->assertDatabaseHas('issue_type_templates', [
        'id' => $template->id,
        'description' => $description,
    ]);
});
