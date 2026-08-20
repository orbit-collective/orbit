<?php

namespace Database\Seeders;

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Seed the application's permissions from the Permission enum.
     */
    public function run(): void
    {
        foreach (PermissionEnum::cases() as $permission) {
            [$group] = explode('.', $permission->value);

            Permission::query()->updateOrCreate(
                ['key' => $permission->value],
                [
                    'name' => $permission->name,
                    'group' => $group,
                ]
            );
        }
    }
}
