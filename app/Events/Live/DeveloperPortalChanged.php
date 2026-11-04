<?php

namespace App\Events\Live;

use App\Broadcasting\LiveChannels;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Something the Developer Portal shows changed (local development only).
 * Carries kinds, never rows: `users`, `projects`, `issues` (also comments)
 * and `errors`. The page re-reads the matching props through its normal,
 * authorised route.
 */
final class DeveloperPortalChanged implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable;

    public int $tries = 1;

    public int $timeout = 5;

    /** @param  list<string>  $kinds */
    public function __construct(public readonly array $kinds) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel(LiveChannels::DEVELOPER_PORTAL);
    }

    public function broadcastAs(): string
    {
        return 'developer-portal.changed';
    }

    public function broadcastQueue(): string
    {
        return LiveChannels::QUEUE;
    }

    /** @return array{kinds: list<string>} */
    public function broadcastWith(): array
    {
        return ['kinds' => $this->kinds];
    }
}
