<?php

use App\Models\Issue;
use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an admin can create an issue type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types", [
        'name' => 'Marketing Campaign',
        'icon' => 'Megaphone',
        'color' => '#ff0000',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('issue_types', ['project_id' => $project->id, 'name' => 'Marketing Campaign', 'is_system' => false]);
});

test('creating an issue type requires a name, icon and a hex color', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types", [
        'color' => 'not-a-hex-color',
    ]);

    $response->assertSessionHasErrors(['name', 'icon', 'color']);
});

test('creating an issue type rejects a duplicate name within the same project', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->issueTypes()->create(['name' => 'Custom', 'icon' => 'Bug', 'color' => '#ff0000']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types", [
        'name' => 'Custom',
        'icon' => 'Bug',
        'color' => '#000000',
    ]);

    $response->assertSessionHasErrors('name');
});

test('creating an issue type seeds the project\'s starter catalog first, so a custom type cannot shadow a system one', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types", [
        'name' => 'Bug',
        'icon' => 'Bug',
        'color' => '#000000',
    ]);

    $response->assertSessionHasErrors('name');
    $this->assertDatabaseHas('issue_types', ['project_id' => $project->id, 'name' => 'Bug', 'is_system' => true, 'color' => '#ef4444']);
});

test('a member with a custom role granting only issue_types.create can create but not update or delete issue types', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $permission = Permission::where('key', 'projects.issue_types.create')->first();
    $role = $project->roles()->create(['name' => 'Type Creator', 'slug' => 'type-creator', 'role' => 'custom']);
    $role->permissions()->attach($permission);
    ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first()->roles()->attach($role->id);
    $issueType = $project->issueTypes()->create(['name' => 'Custom', 'icon' => 'Bug', 'color' => '#f44336']);

    $createResponse = $this->actingAs($member)->post("/projects/$project->id/issue-types", [
        'name' => 'Another',
        'icon' => 'Bug',
        'color' => '#ff0000',
    ]);
    $updateResponse = $this->actingAs($member)->patch("/projects/$project->id/issue-types/$issueType->id", [
        'name' => 'Renamed',
        'icon' => 'Bug',
        'color' => '#111111',
    ]);
    $deleteResponse = $this->actingAs($member)->delete("/projects/$project->id/issue-types/$issueType->id");

    $createResponse->assertRedirect();
    $this->assertDatabaseHas('issue_types', ['project_id' => $project->id, 'name' => 'Another']);
    $updateResponse->assertForbidden();
    $deleteResponse->assertForbidden();
});

test('an outsider cannot create an issue type', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post("/projects/$project->id/issue-types", [
        'name' => 'Custom',
        'icon' => 'Bug',
        'color' => '#ff0000',
    ]);

    $response->assertForbidden();
});

test('an admin can update an issue type, including a system type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336', 'is_system' => true]);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$issueType->id", [
        'name' => 'Defect',
        'icon' => 'Bug',
        'color' => '#111111',
    ]);

    $response->assertRedirect();
    expect($issueType->refresh()->name)->toBe('Defect')
        ->and($issueType->color)->toBe('#111111');
});

test('an admin can set required fields and restricted role types on an issue type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$issueType->id", [
        'name' => 'Bug',
        'icon' => 'Bug',
        'color' => '#f44336',
        'required_fields' => ['description', 'assignee'],
        'restricted_role_types' => ['owner', 'admin'],
    ]);

    $response->assertRedirect();
    expect($issueType->refresh()->required_fields)->toBe(['description', 'assignee'])
        ->and($issueType->restricted_role_types)->toBe(['owner', 'admin']);
});

test('setting an invalid restricted role type is rejected', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$issueType->id", [
        'name' => 'Bug',
        'icon' => 'Bug',
        'color' => '#f44336',
        'restricted_role_types' => ['not-a-role'],
    ]);

    $response->assertSessionHasErrors('restricted_role_types.0');
});

test('an issue type from another project cannot be updated through a mismatched project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $otherProject->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$issueType->id", [
        'name' => 'Defect',
        'icon' => 'Bug',
        'color' => '#111111',
    ]);

    $response->assertNotFound();
});

test('a member without the issue_types.update permission cannot update an issue type', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($member)->patch("/projects/$project->id/issue-types/$issueType->id", [
        'name' => 'Defect',
        'icon' => 'Bug',
        'color' => '#111111',
    ]);

    $response->assertForbidden();
});

test('an admin can delete a custom issue type not referenced by any issue', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Custom', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->delete("/projects/$project->id/issue-types/$issueType->id");

    $response->assertRedirect();
    $this->assertDatabaseMissing('issue_types', ['id' => $issueType->id]);
});

test('an admin cannot delete a system issue type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336', 'is_system' => true]);

    $response = $this->actingAs($admin)->delete("/projects/$project->id/issue-types/$issueType->id");

    $response->assertSessionHasErrors('name');
    $this->assertDatabaseHas('issue_types', ['id' => $issueType->id]);
});

test('an admin cannot delete a custom issue type still referenced by an issue', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Custom', 'icon' => 'Bug', 'color' => '#f44336']);
    Issue::factory()->create(['project_id' => $project->id, 'issue_type_id' => $issueType->id]);

    $response = $this->actingAs($admin)->delete("/projects/$project->id/issue-types/$issueType->id");

    $response->assertSessionHasErrors('name');
    $this->assertDatabaseHas('issue_types', ['id' => $issueType->id]);
});

test('a member without the issue_types.delete permission cannot delete an issue type', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $issueType = $project->issueTypes()->create(['name' => 'Custom', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($member)->delete("/projects/$project->id/issue-types/$issueType->id");

    $response->assertForbidden();
    $this->assertDatabaseHas('issue_types', ['id' => $issueType->id]);
});

test('an issue type from another project cannot be deleted through a mismatched project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $otherProject->issueTypes()->create(['name' => 'Custom', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->delete("/projects/$project->id/issue-types/$issueType->id");

    $response->assertNotFound();
    $this->assertDatabaseHas('issue_types', ['id' => $issueType->id]);
});

test('an admin can set which types are allowed as sub-issues of another type', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $epicType = $project->issueTypes()->create(['name' => 'Epic', 'icon' => 'Zap', 'color' => '#a855f7', 'allows_children' => true]);
    $storyType = $project->issueTypes()->create(['name' => 'Story', 'icon' => 'BookOpen', 'color' => '#22c55e']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$epicType->id/allowed-children", [
        'child_issue_type_ids' => [$storyType->id],
    ]);

    $response->assertRedirect();
    expect($epicType->allowedChildTypes()->pluck('issue_types.id')->all())->toBe([$storyType->id]);
});

test('setting allowed children rejects an issue type id from another project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $epicType = $project->issueTypes()->create(['name' => 'Epic', 'icon' => 'Zap', 'color' => '#a855f7', 'allows_children' => true]);
    $foreignType = $otherProject->issueTypes()->create(['name' => 'Story', 'icon' => 'BookOpen', 'color' => '#22c55e']);

    $response = $this->actingAs($admin)->patch("/projects/$project->id/issue-types/$epicType->id/allowed-children", [
        'child_issue_type_ids' => [$foreignType->id],
    ]);

    $response->assertSessionHasErrors('child_issue_type_ids.0');
});

test('a member without the issue_types.update permission cannot set allowed children', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $epicType = $project->issueTypes()->create(['name' => 'Epic', 'icon' => 'Zap', 'color' => '#a855f7', 'allows_children' => true]);
    $storyType = $project->issueTypes()->create(['name' => 'Story', 'icon' => 'BookOpen', 'color' => '#22c55e']);

    $response = $this->actingAs($member)->patch("/projects/$project->id/issue-types/$epicType->id/allowed-children", [
        'child_issue_type_ids' => [$storyType->id],
    ]);

    $response->assertForbidden();
});

test('guests cannot manage project issue types', function () {
    $project = Project::factory()->create();
    $issueType = $project->issueTypes()->create(['name' => 'Custom', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->delete("/projects/$project->id/issue-types/$issueType->id");

    $response->assertRedirect(route('login'));
});
