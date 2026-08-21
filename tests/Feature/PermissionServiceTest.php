<?php

use App\Models\Permission;
use App\Services\PermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('it lists all permissions via the repository', function () {
    Permission::create(['key' => 'issues.view', 'name' => 'View issues', 'group' => 'issues']);

    $service = app(PermissionService::class);

    expect($service->getAll())->toHaveCount(1);
});
