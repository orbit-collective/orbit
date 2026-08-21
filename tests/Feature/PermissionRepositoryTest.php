<?php

use App\Models\Permission;
use App\Repositories\PermissionRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new PermissionRepository;
});

test('it returns all permissions ordered by group and key', function () {
    Permission::create(['key' => 'issues.view', 'name' => 'View issues', 'group' => 'issues']);
    Permission::create(['key' => 'comments.create', 'name' => 'Create comments', 'group' => 'comments']);

    $permissions = $this->repository->all();

    expect($permissions)->toHaveCount(2);
    expect($permissions->first()->key)->toBe('comments.create');
});
