<?php

namespace App\Policies;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function view(User $user, Project $project): bool
    {
        return $project->users()->where('users.id', $user->id)->exists();
    }

    public function update(User $user, Project $project): bool
    {
        return $this->view($user, $project);
    }

    public function manageMembers(User $user, Project $project): bool
    {
        return $project->users()
            ->where('users.id', $user->id)
            ->wherePivotIn('role', [RoleType::OWNER->value, RoleType::ADMIN->value])
            ->exists();
    }
}
