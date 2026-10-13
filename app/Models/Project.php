<?php

namespace App\Models;

use App\Enums\Permissions\Permission as PermissionEnum;
use App\Enums\Permissions\RoleType;
use App\Support\Cache\CacheVersion;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    /** Seconds a membership lookup stays cached; writes retire it sooner (see membershipOf()). */
    private const int MEMBERSHIP_CACHE_TTL = 600;

    protected $fillable = [
        'id',
        'name',
        'slug',
        'description',
        'color',
        'columns',
        'labels_seeded_at',
        'issue_types_seeded_at',
        'issue_type_defaults_version',
        'next_issue_number',
    ];

    protected $casts = [
        'columns' => 'array',
        'labels_seeded_at' => 'datetime',
        'issue_types_seeded_at' => 'datetime',
        'issue_type_defaults_version' => 'integer',
    ];

    public function issues(): HasMany
    {
        return $this->hasMany(Issue::class);
    }

    public function automationRules(): HasMany
    {
        return $this->hasMany(AutomationRule::class);
    }

    public function savedFilters(): HasMany
    {
        return $this->hasMany(SavedFilter::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->using(ProjectUser::class)
            ->withPivot('id')
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

    public function labels(): HasMany
    {
        return $this->hasMany(Label::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    public function issueTypes(): HasMany
    {
        return $this->hasMany(IssueType::class);
    }

    /**
     * Whether the user belongs to this project, with which system role (the
     * tier: owner, admin, member or viewer) and which granular permissions. Every authorization check starts here, so the
     * answer is cached per project and user under the membership version
     * (see CacheVersion::MEMBERSHIP), which every write to membership, roles
     * and role permissions moves.
     *
     * @return array{member: bool, role: ?string, permissions: list<string>}
     */
    public function membershipOf(User $user): array
    {
        return CacheVersion::remember(
            CacheVersion::MEMBERSHIP,
            "project:$this->id:user:$user->id:membership",
            self::MEMBERSHIP_CACHE_TTL,
            function () use ($user) {
                $membership = ProjectUser::query()
                    ->where('project_id', $this->id)
                    ->where('user_id', $user->id)
                    ->with('roles.permissions')
                    ->first();

                if (! $membership) {
                    return ['member' => false, 'role' => null, 'permissions' => []];
                }

                return [
                    'member' => true,
                    'role' => $membership->roles->firstWhere('is_system', true)?->role,
                    'permissions' => $membership->roles
                        ->flatMap(fn ($role) => $role->permissions->pluck('key'))
                        ->unique()
                        ->values()
                        ->all(),
                ];
            },
        );
    }

    public function hasMember(User $user): bool
    {
        return $this->membershipOf($user)['member'];
    }

    /** The user's system role tier on this project (owner, admin, ...), or null without one. */
    public function roleOf(User $user): ?string
    {
        return $this->membershipOf($user)['role'];
    }

    public function hasPermission(User $user, PermissionEnum $permission): bool
    {
        $membership = $this->membershipOf($user);

        if (! $membership['member']) {
            return false;
        }

        if ($membership['role'] === RoleType::OWNER->value) {
            return true;
        }

        return in_array($permission->value, $membership['permissions'], true);
    }
}
