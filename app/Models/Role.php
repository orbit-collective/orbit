<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    protected $fillable = [
        'project_id',
        'name',
        'slug',
        'role',
        'is_system',
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(ProjectUser::class, 'project_user_role', 'role_id', 'project_user_id');
    }
}
