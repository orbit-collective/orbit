<?php

namespace App\Events\Live;

use App\Broadcasting\LiveChannels;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Something changed inside a project. Carries ids and kinds only - never row
 * contents - so what a client sees on the wire is what it could already read,
 * and every refresh goes through the normal authorised Inertia routes.
 *
 * `changes` is a list of `{type, id, action}` (type: issue, comment, project,
 * members, roles; action: created, updated, deleted, bulk).
 */
final class ProjectChanged implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets;

    public int $tries = 1;

    public int $timeout = 5;

    /**
     * @param  list<array{type: string, id: int|null, action: string}>  $changes
     */
    public function __construct(
        public readonly int $projectId,
        public readonly array $changes,
        public readonly ?int $actorId,
    ) {
        $this->dontBroadcastToCurrentUser();
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel(LiveChannels::project($this->projectId));
    }

    public function broadcastAs(): string
    {
        return 'project.changed';
    }

    public function broadcastQueue(): string
    {
        return LiveChannels::QUEUE;
    }

    /** @return array{changes: list<array{type: string, id: int|null, action: string}>, actor: int|null} */
    public function broadcastWith(): array
    {
        return ['changes' => $this->changes, 'actor' => $this->actorId];
    }
}
