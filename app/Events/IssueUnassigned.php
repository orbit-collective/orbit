<?php

namespace App\Events;

use App\Models\Issue;
use App\Models\User;

final class IssueUnassigned
{

    public function __construct(
        public readonly Issue $issue,
        public readonly User $previousAssignee,
        public readonly ?User $actor,
    ) {}
}
