<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an admin can enable an available integration', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/integrations/discord", [
        'enabled' => true,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('project_integrations', [
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => true,
    ]);
});

test('an owner can disable an integration', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $this->actingAs($owner)->patch("/projects/$project->id/integrations/discord", ['enabled' => true]);

    $response = $this->actingAs($owner)->patch("/projects/$project->id/integrations/discord", [
        'enabled' => false,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('project_integrations', [
        'project_id' => $project->id,
        'integration' => 'discord',
        'enabled' => false,
    ]);
});

test('a member without the integrations.update permission cannot toggle an integration', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->patch("/projects/$project->id/integrations/discord", [
        'enabled' => true,
    ]);

    $response->assertForbidden();
    $this->assertDatabaseMissing('project_integrations', ['project_id' => $project->id]);
});

test('an outsider cannot toggle an integration', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())->patch("/projects/$project->id/integrations/discord", [
        'enabled' => true,
    ]);

    $response->assertForbidden();
});

test('an admin cannot enable an integration that is not available yet', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/integrations/slack", [
        'enabled' => true,
    ]);

    $response->assertSessionHasErrors('integration');
    $this->assertDatabaseMissing('project_integrations', ['project_id' => $project->id]);
});

test('toggling an integration requires a boolean enabled value', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/integrations/discord", []);

    $response->assertSessionHasErrors('enabled');
});

test('guests cannot toggle a project integration', function () {
    $project = Project::factory()->create();

    $response = $this->patch("/projects/$project->id/integrations/discord", ['enabled' => true]);

    $response->assertRedirect(route('login'));
});
