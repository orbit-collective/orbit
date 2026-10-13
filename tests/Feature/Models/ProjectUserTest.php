<?php

use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a project member can have many roles', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $member->id, 'member');
    $roleA = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $roleB = $project->roles()->create(['name' => 'Support', 'slug' => 'support', 'role' => 'custom']);

    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $member->id)->first();
    $projectUser->roles()->attach([$roleA->id, $roleB->id]);

    expect($projectUser->roles->pluck('slug')->sort()->values()->all())->toBe(['member', 'qa', 'support']);
});

test('project users() relation is backed by the ProjectUser pivot model', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $member->id, 'member');

    $pivot = $project->users()->where('users.id', $member->id)->first()->pivot;

    expect($pivot)->toBeInstanceOf(ProjectUser::class);
});
