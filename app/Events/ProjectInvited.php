<?php

namespace App\Events;

use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

final class ProjectInvited
{
    use Dispatchable;

    public function __construct(
        public readonly ProjectInvitation $invitation,
        public readonly Project $project,
        public readonly User $invitedBy,
        public readonly ?User $existingUser,
        public readonly string $acceptUrl,
    ) {}
}
