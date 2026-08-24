<?php

namespace App\Events;

use App\Models\Issue;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

final class IssueAssigned
{
    use Dispatchable;

    public function __construct(
        public readonly Issue $issue,
        public readonly User $assignee,
        public readonly ?User $actor,
        public readonly array $otherChanges = [],
    ) {}
}
