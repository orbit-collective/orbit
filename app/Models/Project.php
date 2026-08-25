<?php

namespace App\Models;

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Enums\Permissions\RoleType;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    protected $fillable = [
        'id',
        'name',
        'slug',
        'description',
        'color',
        'columns',
        'role',
        'is_system',
    ];

    protected $casts = [
        'columns' => 'array',
    ];

    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class);
    }

    public function savedFilters(): HasMany
    {
        return $this->hasMany(SavedFilter::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->using(ProjectUser::class)
            ->withPivot('id', 'role')
            ->withTimestamps();
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(ProjectInvitation::class);
    }

    public function integrations(): HasMany
    {
        return $this->hasMany(ProjectIntegration::class);
    }

    public function hasPermission(User $user, PermissionEnum $permission): bool
    {
        $member = $this->users()->where('users.id', $user->id)->first();

        if (! $member) {
            return false;
        }

        if ($member->pivot->role === RoleType::OWNER->value) {
            return true;
        }

        return $member->pivot->roles()
            ->whereHas('permissions', fn ($query) => $query->where('key', $permission->value))
            ->exists();
    }

    /**
     * The tiers listed keep working regardless of whether their system role has
     * been synced onto the project_user_role pivot yet — only a tier outside the
     * list (and anyone whose system role hasn't synced) falls through to the
     * granular permission, which a custom role can still grant them.
     */
    public function hasPermissionOrTier(User $user, PermissionEnum $permission, array $tiers): bool
    {
        $role = $this->users()->where('users.id', $user->id)->first()?->pivot->role;

        if (in_array($role, array_map(fn (RoleType $tier) => $tier->value, $tiers), true)) {
            return true;
        }

        return $this->hasPermission($user, $permission);
    }
}
