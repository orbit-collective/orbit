<?php

use App\Models\Permission;
use App\Models\Project;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a permission can belong to many roles', function () {
    $permission = Permission::where('key', 'issues.view')->first();
    $project = Project::factory()->create();
    $roleA = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $roleB = $project->roles()->create(['name' => 'Support', 'slug' => 'support', 'role' => 'custom']);

    $permission->roles()->attach([$roleA->id, $roleB->id]);

    expect($permission->roles)->toHaveCount(2);
});

test('the key column must be unique', function () {
    Permission::create(['key' => 'custom.test.permission', 'name' => 'Test', 'group' => 'custom']);

    expect(fn () => Permission::create(['key' => 'custom.test.permission', 'name' => 'Duplicate', 'group' => 'custom']))
        ->toThrow(QueryException::class);
});
