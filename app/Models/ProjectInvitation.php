<?php

namespace App\Models;

use App\Enums\Permissions\RoleType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ProjectInvitation extends Model
{
    protected $fillable = [
        'project_id',
        'invited_by',
        'email',
        'token',
        'expires_at',
        'accepted_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'project_invitation_role');
    }

    /** The system role tier the invitee will join with (member when none is stored). */
    public function tier(): RoleType
    {
        $role = $this->roles->firstWhere('is_system', true)?->role;

        return RoleType::tryFrom($role ?? '') ?? RoleType::MEMBER;
    }

    /** @return list<int> ids of the custom (non-system) roles granted on top of the tier */
    public function customRoleIds(): array
    {
        return $this->roles->where('is_system', false)->pluck('id')->values()->all();
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isAccepted(): bool
    {
        return $this->accepted_at !== null;
    }
}
