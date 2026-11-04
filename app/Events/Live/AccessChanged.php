<?php

namespace App\Events\Live;

use App\Broadcasting\LiveChannels;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * A user's membership, role or permissions changed. Tells their open tabs to
 * re-read the page (abilities, project list), or leave a project they lost.
 */
final class AccessChanged implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable;

    public int $tries = 1;

    public int $timeout = 5;

    public function __construct(
        public readonly int $userId,
        public readonly ?int $projectId,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel(LiveChannels::user($this->userId));
    }

    public function broadcastAs(): string
    {
        return 'access.changed';
    }

    public function broadcastQueue(): string
    {
        return LiveChannels::QUEUE;
    }

    /** @return array{project: int|null} */
    public function broadcastWith(): array
    {
        return ['project' => $this->projectId];
    }
}
