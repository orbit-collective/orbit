<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an admin can change a member\'s role', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($admin)->patch("/projects/{$project->id}/members/{$member->id}", [
        'role' => 'admin',
    ]);

    $response->assertRedirect();
    expect($project->users()->where('users.id', $member->id)->first()->pivot->role)->toBe('admin');
});

test('a member cannot change another member\'s role', function () {
    $project = Project::factory()->create();
    $memberA = User::factory()->create();
    $memberB = User::factory()->create();
    $project->users()->attach($memberA->id, ['role' => 'member']);
    $project->users()->attach($memberB->id, ['role' => 'member']);

    $response = $this->actingAs($memberA)->patch("/projects/{$project->id}/members/{$memberB->id}", [
        'role' => 'admin',
    ]);

    $response->assertForbidden();
});

test('an outsider cannot change a project\'s member roles', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs(User::factory()->create())->patch("/projects/{$project->id}/members/{$member->id}", [
        'role' => 'admin',
    ]);

    $response->assertForbidden();
});

test('changing a role requires a valid role value', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($admin)->patch("/projects/{$project->id}/members/{$member->id}", [
        'role' => 'owner',
    ]);

    $response->assertSessionHasErrors('role');
});

test('demoting the only admin fails with a validation error', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->patch("/projects/{$project->id}/members/{$admin->id}", [
        'role' => 'member',
    ]);

    $response->assertSessionHasErrors('role');
});

test('an admin can remove a member', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($admin)->delete("/projects/{$project->id}/members/{$member->id}");

    $response->assertRedirect();
    expect($project->users()->where('users.id', $member->id)->exists())->toBeFalse();
});

test('a member cannot remove another member', function () {
    $project = Project::factory()->create();
    $memberA = User::factory()->create();
    $memberB = User::factory()->create();
    $project->users()->attach($memberA->id, ['role' => 'member']);
    $project->users()->attach($memberB->id, ['role' => 'member']);

    $response = $this->actingAs($memberA)->delete("/projects/{$project->id}/members/{$memberB->id}");

    $response->assertForbidden();
});

test('removing the only admin fails with a validation error', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->delete("/projects/{$project->id}/members/{$admin->id}");

    $response->assertSessionHasErrors('member');
});

test('guests cannot manage project members', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->delete("/projects/{$project->id}/members/{$member->id}");

    $response->assertRedirect(route('login'));
});
