<?php

use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use App\Services\PriorityService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function projectWithMember(string $tier): array
{
    $project = Project::factory()->create();
    $user = User::factory()->create();
    addProjectMember($project, $user->id, $tier);

    return [$project, $user];
}

test('an admin can create a priority', function () {
    [$project, $admin] = projectWithMember('admin');

    $response = $this->actingAs($admin)->post("/projects/$project->id/priorities", [
        'name' => 'Urgent',
        'color' => '#ff0000',
        'icon' => 'Flame',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('priorities', ['project_id' => $project->id, 'name' => 'Urgent', 'icon' => 'Flame', 'position' => 3]);
});

test('creating a priority requires a name, a hex color and an icon', function () {
    [$project, $admin] = projectWithMember('admin');

    $this->actingAs($admin)->post("/projects/$project->id/priorities", ['color' => 'red'])
        ->assertSessionHasErrors(['name', 'color', 'icon']);
});

test('creating a priority rejects a duplicate name within the project', function () {
    [$project, $admin] = projectWithMember('admin');

    $this->actingAs($admin)->post("/projects/$project->id/priorities", ['name' => 'high', 'color' => '#ff0000', 'icon' => 'Flag'])
        ->assertSessionHasErrors('name');
});

test('a member cannot create, update or reorder priorities', function () {
    [$project, $member] = projectWithMember('member');
    $priority = app(PriorityService::class)->getPriorities($project)->first();

    $this->actingAs($member)->post("/projects/$project->id/priorities", ['name' => 'Urgent', 'color' => '#ff0000', 'icon' => 'Flag'])->assertForbidden();
    $this->actingAs($member)->patch("/projects/$project->id/priorities/$priority->id", ['name' => 'X', 'color' => '#ff0000', 'icon' => 'Flag'])->assertForbidden();
    $this->actingAs($member)->patch("/projects/$project->id/priorities/order", ['order' => [$priority->id]])->assertForbidden();
});

test('an outsider cannot touch a project\'s priorities', function () {
    $project = Project::factory()->create();
    $outsider = User::factory()->create();

    $this->actingAs($outsider)->post("/projects/$project->id/priorities", ['name' => 'Urgent', 'color' => '#ff0000', 'icon' => 'Flag'])->assertForbidden();
});

test('a custom role granting priorities.create is enough to create one', function () {
    [$project, $member] = projectWithMember('member');
    $role = $project->roles()->create(['name' => 'Scale keeper', 'slug' => 'scale-keeper', 'role' => 'custom']);
    $role->permissions()->sync(Permission::where('key', 'projects.priorities.create')->pluck('id'));
    ProjectUser::where('user_id', $member->id)->first()->roles()->attach($role->id);

    $this->actingAs($member)->post("/projects/$project->id/priorities", ['name' => 'Urgent', 'color' => '#ff0000', 'icon' => 'Flag'])
        ->assertRedirect();
});

test('an admin can update a priority', function () {
    [$project, $admin] = projectWithMember('admin');
    $high = app(PriorityService::class)->getPriorities($project)->firstWhere('name', 'High');

    $this->actingAs($admin)->patch("/projects/$project->id/priorities/$high->id", [
        'name' => 'Critical',
        'color' => '#990000',
        'icon' => 'Flame',
        'is_default' => true,
    ])->assertRedirect();

    $this->assertDatabaseHas('priorities', ['id' => $high->id, 'name' => 'Critical', 'color' => '#990000', 'is_default' => true]);
    expect($project->priorities()->where('is_default', true)->count())->toBe(1);
});

test('a priority of another project is not found through this project', function () {
    [$project, $admin] = projectWithMember('admin');
    $foreign = app(PriorityService::class)->getPriorities(Project::factory()->create())->first();

    $this->actingAs($admin)->patch("/projects/$project->id/priorities/$foreign->id", ['name' => 'X', 'color' => '#ff0000', 'icon' => 'Flag'])
        ->assertNotFound();
});

test('an admin can reorder the priorities', function () {
    [$project, $admin] = projectWithMember('admin');
    $ids = app(PriorityService::class)->getPriorities($project)->pluck('id', 'name');

    $this->actingAs($admin)->patch("/projects/$project->id/priorities/order", [
        'order' => [$ids['Low'], $ids['Medium'], $ids['High']],
    ])->assertRedirect();

    expect($project->priorities()->orderBy('position')->pluck('name')->all())->toBe(['Low', 'Medium', 'High']);
});

test('reordering rejects an incomplete or foreign list', function () {
    [$project, $admin] = projectWithMember('admin');
    $ids = app(PriorityService::class)->getPriorities($project)->pluck('id')->all();

    $this->actingAs($admin)->patch("/projects/$project->id/priorities/order", ['order' => [$ids[0]]])
        ->assertSessionHasErrors('order');
});
