<?php

namespace App\Repositories;

use App\Models\Permission;
use Illuminate\Database\Eloquent\Collection;

class PermissionRepository
{
    public function all(): Collection
    {
        return Permission::query()->orderBy('group')->orderBy('key')->get();
    }
}
