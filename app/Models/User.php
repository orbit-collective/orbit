<?php

namespace App\Models;

use App\Models\Concerns\BumpsUserCache;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * @property mixed $pivot
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use BumpsUserCache, HasFactory, Notifiable;

    protected $fillable = [
        'id',
        'name',
        'email',
        'password',
        'github_id',
        'github_username',
        'has_completed_onboarding',
        'has_completed_project_onboarding',
        'avatar',
        'session_lifetime',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'has_completed_onboarding' => 'boolean',
            'has_completed_project_onboarding' => 'boolean',
        ];
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class)
            ->withTimestamps();
    }
}
