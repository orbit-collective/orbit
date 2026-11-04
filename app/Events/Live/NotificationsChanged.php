<?php

namespace App\Events\Live;

use App\Broadcasting\LiveChannels;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * A user's inbox changed (a notification arrived, was read or deleted). Goes
 * only to that user's private channel, so it may carry the new notification
 * itself (for the browser notification) and the real unread count.
 */
final class NotificationsChanged implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable;

    public int $tries = 1;

    public int $timeout = 5;

    public function __construct(
        public readonly int $userId,
        public readonly ?Notification $created = null,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel(LiveChannels::user($this->userId));
    }

    public function broadcastAs(): string
    {
        return 'notifications.changed';
    }

    public function broadcastQueue(): string
    {
        return LiveChannels::QUEUE;
    }

    /** @return array{unread: int, created: array<string, mixed>|null} */
    public function broadcastWith(): array
    {
        return [
            'unread' => app(NotificationService::class)->unreadCountForUser($this->userId),
            'created' => $this->created ? [
                'id' => $this->created->id,
                'type' => $this->created->type,
                'title' => $this->created->title,
                'message' => $this->created->message,
                'action_url' => $this->created->action_url,
            ] : null,
        ];
    }
}
