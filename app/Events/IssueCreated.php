<?php

namespace App\Events;

use App\Models\Issue;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

final class IssueCreated
{
    use Dispatchable;

    public function __construct(
        public readonly Issue $issue,
        public readonly ?User $actor,
    ) {}
}
