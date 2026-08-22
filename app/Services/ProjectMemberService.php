<?php

namespace App\Services;

use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\User;
use App\Repositories\ProjectMemberRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class ProjectMemberService
{
    public function __construct(
        protected ProjectMemberRepository $projectMemberRepository,
        protected ActivityLogService $activityLogService,
        protected RoleService $roleService
    ) {}

    public function getMembers(Project $project): Collection
    {
        return $this->projectMemberRepository->getMembers($project);
    }

    public function updateRole(Project $project, User $member, RoleType $newRole): void
    {
        $this->assertIsMember($project, $member);
        $this->assertNotOwner($project, $member, 'role', "The project owner's role cannot be changed.");

        $this->projectMemberRepository->updateRole($project, $member->id, $newRole);
        $this->roleService->syncSystemRoleForMember($project, $member->id, $newRole);
        $this->activityLogService->log($project->id, "Changed $member->name's role to $newRole->value");
    }

    public function removeMember(Project $project, User $member): void
    {
        $this->assertIsMember($project, $member);
        $this->assertNotOwner($project, $member, 'member', 'The project owner cannot be removed from the project.');

        $this->projectMemberRepository->removeMember($project, $member->id);
        $this->activityLogService->log($project->id, "Removed $member->name from the project");
    }

    public function syncRoles(Project $project, User $member, array $roleIds): void
    {
        $this->assertIsMember($project, $member);

        $this->projectMemberRepository->syncRoles($project, $member->id, $roleIds);
        $this->activityLogService->log($project->id, "Updated $member->name's custom roles");
    }

    public function transferOwnership(Project $project, User $currentOwner, User $newOwner): void
    {
        if ($this->projectMemberRepository->roleOf($project, $currentOwner->id) !== RoleType::OWNER) {
            throw ValidationException::withMessages([
                'owner' => 'Only the current owner can transfer ownership.',
            ]);
        }

        $this->assertIsMember($project, $newOwner);

        if ($newOwner->id === $currentOwner->id) {
            throw ValidationException::withMessages([
                'user' => 'This user already owns the project.',
            ]);
        }

        $this->projectMemberRepository->updateRole($project, $currentOwner->id, RoleType::ADMIN);
        $this->projectMemberRepository->updateRole($project, $newOwner->id, RoleType::OWNER);
        $this->roleService->syncSystemRoleForMember($project, $currentOwner->id, RoleType::ADMIN);
        $this->roleService->syncSystemRoleForMember($project, $newOwner->id, RoleType::OWNER);

        $this->activityLogService->log(
            $project->id,
            "Transferred project ownership from $currentOwner->name to $newOwner->name"
        );
    }

    private function assertIsMember(Project $project, User $member): void
    {
        if (! $this->projectMemberRepository->isMember($project, $member->id)) {
            throw ValidationException::withMessages([
                'member' => 'This user is not a member of the project.',
            ]);
        }
    }

    private function assertNotOwner(Project $project, User $member, string $field, string $message): void
    {
        if ($this->projectMemberRepository->roleOf($project, $member->id) === RoleType::OWNER) {
            throw ValidationException::withMessages([
                $field => $message,
            ]);
        }
    }
}
