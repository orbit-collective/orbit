<?php

use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an admin can create a label', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/labels", [
        'name' => 'urgent',
        'color' => '#ff0000',
        'description' => 'Needs immediate attention.',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('labels', ['project_id' => $project->id, 'name' => 'urgent', 'is_system' => false]);
});

test('creating a label requires a name and a hex color', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/labels", [
        'color' => 'not-a-hex-color',
    ]);

    $response->assertSessionHasErrors(['name', 'color']);
});

test('creating a label rejects a duplicate name within the same project', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->labels()->create(['name' => 'urgent', 'color' => '#ff0000']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/labels", [
        'name' => 'urgent',
        'color' => '#000000',
    ]);

    $response->assertSessionHasErrors('name');
});

test('creating a label seeds the project\'s starter taxonomy first, so a custom label cannot shadow a system one', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/labels", [
        'name' => 'bug',
        'color' => '#000000',
    ]);

    $response->assertSessionHasErrors('name');
    $this->assertDatabaseHas('labels', ['project_id' => $project->id, 'name' => 'bug', 'is_system' => true, 'color' => '#f44336']);
});

test('a member with a custom role granting only labels.create can create but not update or delete labels', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $permission = Permission::where('key', 'projects.labels.create')->first();
    $role = $project->roles()->create(['name' => 'Label Creator', 'slug' => 'label-creator', 'role' => 'custom']);
    $role->permissions()->attach($permission);
    ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first()->roles()->attach($role->id);
    $label = $project->labels()->create(['name' => 'bug', 'color' => '#f44336']);

    $createResponse = $this->actingAs($member)->post("/projects/$project->id/labels", [
        'name' => 'urgent',
        'color' => '#ff0000',
    ]);
    $updateResponse = $this->actingAs($member)->patch("/projects/$project->id/labels/$label->id", [
        'name' => 'defect',
        'color' => '#111111',
    ]);
    $deleteResponse = $this->actingAs($member)->delete("/projects/$project->id/labels/$label->id");

    $createResponse->assertRedirect();
    $this->assertDatabaseHas('labels', ['project_id' => $project->id, 'name' => 'urgent']);
    $updateResponse->assertForbidden();
    $deleteResponse->assertForbidden();
});

test('a member without the labels.update permission cannot create a label', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->post("/projects/$project->id/labels", [
        'name' => 'urgent',
        'color' => '#ff0000',
    ]);

    $response->assertForbidden();
    $this->assertDatabaseMissing('labels', ['project_id' => $project->id, 'name' => 'urgent']);
});

test('an outsider cannot create a label', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post("/projects/$project->id/labels", [
        'name' => 'urgent',
        'color' => '#ff0000',
    ]);

    $response->assertForbidden();
});

test('an admin can update a label, including a system label', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $label = $project->labels()->create(['name' => 'bug', 'color' => '#f44336', 'is_system' => true]);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/labels/$label->id", [
        'name' => 'defect',
        'color' => '#111111',
    ]);

    $response->assertRedirect();
    expect($label->refresh()->name)->toBe('defect')
        ->and($label->color)->toBe('#111111');
});

test('a label from another project cannot be updated through a mismatched project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $label = $otherProject->labels()->create(['name' => 'bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/labels/$label->id", [
        'name' => 'defect',
        'color' => '#111111',
    ]);

    $response->assertNotFound();
});

test('a member without the labels.update permission cannot update a label', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $label = $project->labels()->create(['name' => 'bug', 'color' => '#f44336']);

    $response = $this->actingAs($member)->patch("/projects/$project->id/labels/$label->id", [
        'name' => 'defect',
        'color' => '#111111',
    ]);

    $response->assertForbidden();
});

test('an admin can delete a label, including a system label', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $label = $project->labels()->create(['name' => 'bug', 'color' => '#f44336', 'is_system' => true]);

    $response = $this->actingAs($admin)->delete("/projects/$project->id/labels/$label->id");

    $response->assertRedirect();
    $this->assertDatabaseMissing('labels', ['id' => $label->id]);
});

test('a member without the labels.update permission cannot delete a label', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $label = $project->labels()->create(['name' => 'bug', 'color' => '#f44336']);

    $response = $this->actingAs($member)->delete("/projects/$project->id/labels/$label->id");

    $response->assertForbidden();
    $this->assertDatabaseHas('labels', ['id' => $label->id]);
});

test('a label from another project cannot be deleted through a mismatched project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $label = $otherProject->labels()->create(['name' => 'bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->delete("/projects/$project->id/labels/$label->id");

    $response->assertNotFound();
    $this->assertDatabaseHas('labels', ['id' => $label->id]);
});

test('guests cannot manage project labels', function () {
    $project = Project::factory()->create();
    $label = $project->labels()->create(['name' => 'bug', 'color' => '#f44336']);

    $response = $this->delete("/projects/$project->id/labels/$label->id");

    $response->assertRedirect(route('login'));
});
