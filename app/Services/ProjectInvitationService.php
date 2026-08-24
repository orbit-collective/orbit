<?php

namespace App\Services;

use App\Enums\Permissions\RoleType;
use App\Events\ProjectInvited;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use App\Repositories\ProjectInvitationRepository;
use App\Repositories\ProjectMemberRepository;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProjectInvitationService
{
    private const int EXPIRES_IN_DAYS = 7;

    public function __construct(
        protected ProjectInvitationRepository $projectInvitationRepository,
        protected ProjectMemberRepository $projectMemberRepository,
        protected MailConfigurationService $mailConfigurationService,
        protected ActivityLogService $activityLogService,
        protected UserService $userService,
        protected RoleService $roleService
    ) {}

    public function invite(Project $project, string $email, RoleType $role, User $invitedBy, array $roleIds = []): ProjectInvitation
    {
        if (! $this->mailConfigurationService->isEnabled()) {
            throw ValidationException::withMessages([
                'email' => 'Project invitations are disabled because email notifications are not configured.',
            ]);
        }

        $email = strtolower(trim($email));

        if ($project->users()->where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => 'This user is already a member of the project.',
            ]);
        }

        if ($existing = $this->projectInvitationRepository->findPendingForEmail($project, $email)) {
            $this->projectInvitationRepository->delete($existing);
        }

        $invitation = $this->projectInvitationRepository->create([
            'project_id' => $project->id,
            'invited_by' => $invitedBy->id,
            'email' => $email,
            'token' => Str::random(64),
            'role' => $role->value,
            'expires_at' => Carbon::now()->addDays(self::EXPIRES_IN_DAYS),
        ]);

        if (! empty($roleIds)) {
            $this->projectInvitationRepository->syncRoles($invitation, $roleIds);
        }

        $this->sendInvitationNotification($invitation, $project, $email, $invitedBy);

        $this->activityLogService->log($project->id, "Invited $email to the project", $invitedBy->id);

        return $invitation;
    }

    public function getPending(Project $project): Collection
    {
        return $this->projectInvitationRepository->getPendingForProject($project);
    }

    public function revoke(ProjectInvitation $invitation): void
    {
        $this->activityLogService->log($invitation->project_id, "Revoked the invitation sent to $invitation->email");

        $this->projectInvitationRepository->delete($invitation);
    }

    public function findValidByToken(string $token): ?ProjectInvitation
    {
        $invitation = $this->projectInvitationRepository->findByToken($token);

        if (! $invitation || $invitation->isAccepted() || $invitation->isExpired()) {
            return null;
        }

        return $invitation;
    }

    public function acceptByToken(string $token, User $user): Project
    {
        $invitation = $this->findValidByToken($token);

        if (! $invitation) {
            throw ValidationException::withMessages([
                'token' => 'This invitation link is invalid or has expired.',
            ]);
        }

        if (strtolower($invitation->email) !== strtolower($user->email)) {
            throw ValidationException::withMessages([
                'token' => 'This invitation was sent to a different email address.',
            ]);
        }

        $project = $invitation->project;

        if (! $this->projectMemberRepository->isMember($project, $user->id)) {
            $project->users()->attach($user->id, ['role' => $invitation->role->value]);
            $this->roleService->syncSystemRoleForMember($project, $user->id, $invitation->role);

            $invitedRoleIds = $invitation->roles()->pluck('roles.id')->all();
            if (! empty($invitedRoleIds)) {
                $this->projectMemberRepository->attachRoles($project, $user->id, $invitedRoleIds);
            }

            $this->activityLogService->log($project->id, "$user->name joined the project", $user->id);
        }

        $this->projectInvitationRepository->markAccepted($invitation);

        return $project;
    }

    private function buildAcceptUrl(ProjectInvitation $invitation): string
    {
        return route('invitations.accept', $invitation->token);
    }

    /**
     * Reports the fact that an invitation was sent. Whether the invited
     * address already has an account (and therefore has notification
     * preferences to respect) is decided by the listener, not here.
     */
    private function sendInvitationNotification(ProjectInvitation $invitation, Project $project, string $email, User $invitedBy): void
    {
        $existingUser = $this->userService->getUserByEmail($email);

        event(new ProjectInvited($invitation, $project, $invitedBy, $existingUser, $this->buildAcceptUrl($invitation)));
    }
}
