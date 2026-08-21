<?php

use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a role belongs to a project', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    expect($role->project->is($project))->toBeTrue();
});

test('a role can have many permissions', function () {
    $project = Project::factory()->create();
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $permission = Permission::create(['key' => 'issues.view', 'name' => 'View issues', 'group' => 'issues']);

    $role->permissions()->attach($permission);

    expect($role->permissions)->toHaveCount(1);
    expect($role->permissions->first()->key)->toBe('issues.view');
});

test('a role can have many members', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $role = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $role->members()->attach($projectUser->id);

    expect($role->members)->toHaveCount(1);
});

test('the project_id and slug combination must be unique', function () {
    $project = Project::factory()->create();
    $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    expect(fn () => $project->roles()->create(['name' => 'QA 2', 'slug' => 'qa', 'role' => 'custom']))
        ->toThrow(QueryException::class);
});
