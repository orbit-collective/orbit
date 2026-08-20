<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ProjectUser extends Pivot
{
    public $incrementing = true;

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'project_user_role', 'project_user_id', 'role_id');
    }
}
