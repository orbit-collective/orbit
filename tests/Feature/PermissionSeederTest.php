<?php

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Models\Permission;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('it seeds a row for every case of the Permission enum', function () {
    (new PermissionSeeder)->run();

    expect(Permission::count())->toBe(count(PermissionEnum::cases()));
    $this->assertDatabaseHas('permissions', ['key' => PermissionEnum::ROLES_ASSIGN->value, 'group' => 'projects']);
});

test('it is idempotent when run more than once', function () {
    (new PermissionSeeder)->run();
    (new PermissionSeeder)->run();

    expect(Permission::count())->toBe(count(PermissionEnum::cases()));
});
