<?php

namespace App\Services;

use App\Enums\ProjectRole;
use App\Models\Project;
use App\Models\User;
use App\Repositories\ProjectMemberRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class ProjectMemberService
{
    public function __construct(
        protected ProjectMemberRepository $projectMemberRepository,
        protected ActivityLogService $activityLogService
    ) {}

    public function getMembers(Project $project): Collection
    {
        return $this->projectMemberRepository->getMembers($project);
    }

    public function updateRole(Project $project, User $member, ProjectRole $newRole): void
    {
        $this->assertIsMember($project, $member);

        $currentRole = $this->projectMemberRepository->roleOf($project, $member->id);

        if ($currentRole === ProjectRole::ADMIN
            && $newRole === ProjectRole::MEMBER
            && $this->projectMemberRepository->countAdmins($project) <= 1
        ) {
            throw ValidationException::withMessages([
                'role' => 'A project must have at least one admin.',
            ]);
        }

        $this->projectMemberRepository->updateRole($project, $member->id, $newRole);
        $this->activityLogService->log($project->id, "Changed $member->name's role to $newRole->value");
    }

    public function removeMember(Project $project, User $member): void
    {
        $this->assertIsMember($project, $member);

        $currentRole = $this->projectMemberRepository->roleOf($project, $member->id);

        if ($currentRole === ProjectRole::ADMIN && $this->projectMemberRepository->countAdmins($project) <= 1) {
            throw ValidationException::withMessages([
                'member' => 'A project must have at least one admin.',
            ]);
        }

        $this->projectMemberRepository->removeMember($project, $member->id);
        $this->activityLogService->log($project->id, "Removed $member->name from the project");
    }

    private function assertIsMember(Project $project, User $member): void
    {
        if (! $this->projectMemberRepository->isMember($project, $member->id)) {
            throw ValidationException::withMessages([
                'member' => 'This user is not a member of the project.',
            ]);
        }
    }
}
