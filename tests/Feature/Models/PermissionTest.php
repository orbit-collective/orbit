<?php

use App\Models\Permission;
use App\Models\Project;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a permission can belong to many roles', function () {
    $permission = Permission::create(['key' => 'issues.view', 'name' => 'View issues', 'group' => 'issues']);
    $project = Project::factory()->create();
    $roleA = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $roleB = $project->roles()->create(['name' => 'Support', 'slug' => 'support', 'role' => 'custom']);

    $permission->roles()->attach([$roleA->id, $roleB->id]);

    expect($permission->roles)->toHaveCount(2);
});

test('the key column must be unique', function () {
    Permission::create(['key' => 'issues.view', 'name' => 'View issues', 'group' => 'issues']);

    expect(fn () => Permission::create(['key' => 'issues.view', 'name' => 'Duplicate', 'group' => 'issues']))
        ->toThrow(QueryException::class);
});
