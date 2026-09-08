<?php

namespace App\Events;

use App\Models\Comment;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

final class IssueMentioned
{
    use Dispatchable;

    public function __construct(
        public readonly Issue $issue,
        public readonly Comment $comment,
        public readonly User $mentionedUser,
        public readonly ?User $actor,
    ) {}
}
