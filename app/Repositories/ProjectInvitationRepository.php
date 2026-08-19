<?php

namespace App\Repositories;

use App\Models\Project;
use App\Models\ProjectInvitation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class ProjectInvitationRepository
{
    public function create(array $data): ProjectInvitation
    {
        return ProjectInvitation::query()->create($data);
    }

    public function findByToken(string $token): ?ProjectInvitation
    {
        return ProjectInvitation::query()->where('token', $token)->first();
    }

    public function findPendingForEmail(Project $project, string $email): ?ProjectInvitation
    {
        return ProjectInvitation::query()
            ->where('project_id', $project->id)
            ->where('email', $email)
            ->whereNull('accepted_at')
            ->first();
    }

    public function getPendingForProject(Project $project): Collection
    {
        return ProjectInvitation::query()
            ->where('project_id', $project->id)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', Carbon::now())
            ->with('invitedBy')
            ->latest()
            ->get();
    }

    public function markAccepted(ProjectInvitation $invitation): void
    {
        $invitation->update(['accepted_at' => Carbon::now()]);
    }

    public function delete(ProjectInvitation $invitation): void
    {
        $invitation->delete();
    }
}
