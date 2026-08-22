<?php

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Repositories\PermissionRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new PermissionRepository;
});

test('it returns all seeded permissions ordered by group and key', function () {
    $permissions = $this->repository->all();

    expect($permissions)->toHaveCount(count(PermissionEnum::cases()));
    expect($permissions->first()->key)->toBe('comments.create');
});
