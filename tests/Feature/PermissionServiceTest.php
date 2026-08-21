<?php

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Services\PermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('it lists all seeded permissions via the repository', function () {
    $service = app(PermissionService::class);

    expect($service->getAll())->toHaveCount(count(PermissionEnum::cases()));
});
