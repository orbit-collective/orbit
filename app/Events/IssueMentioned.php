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
        /** Null when the mention is in the issue description rather than a comment. */
        public readonly ?Comment $comment,
        public readonly User $mentionedUser,
        public readonly ?User $actor,
    ) {}
}
