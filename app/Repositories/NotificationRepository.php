<?php

namespace App\Repositories;

use App\Models\Notification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class NotificationRepository
{
    /**
     * How many notifications ride along on every page as a shared Inertia
     * prop. The popup loads everything older on demand (see paginateForUser),
     * so an account that never clears its inbox does not make every request
     * heavier forever.
     */
    public const int LIMIT = 20;

    /** Default and hard cap for one page of the popup's infinite scroll. */
    public const int PER_PAGE = 20;

    public const int MAX_PER_PAGE = 50;

    /** The most ids one bulk action may touch, so a request stays bounded. */
    public const int MAX_BULK_IDS = 200;

    /**
     * The user's newest notifications, at most LIMIT of them.
     */
    public function getAllForUser(int $userId): Collection
    {
        return $this->newestFirst($this->forUser($userId))->limit(self::LIMIT)->get();
    }

    /**
     * One keyset page, newest first: notifications with an id below $beforeId
     * (the last id the client already has), narrowed by the filters. One extra
     * row is fetched so the caller can tell whether another page exists
     * without a second COUNT query.
     *
     * @param  array{unread?: bool, type?: string|null}  $filters
     */
    public function pageForUser(int $userId, array $filters, ?int $beforeId, int $perPage): Collection
    {
        $perPage = max(1, min($perPage, self::MAX_PER_PAGE));

        return $this->newestFirst($this->filtered($this->forUser($userId), $filters))
            ->when($beforeId, fn (Builder $query) => $query->where('id', '<', $beforeId))
            ->limit($perPage + 1)
            ->get();
    }

    public function countUnreadForUser(int $userId): int
    {
        return $this->forUser($userId)->where('read', false)->count();
    }

    public function store(array $data): Notification
    {
        return Notification::query()->create($data);
    }

    public function update(Notification $notification, array $data): Notification
    {
        $notification->update($data);

        return $notification;
    }

    public function delete(Notification $notification): void
    {
        $notification->delete();
    }

    public function markAllAsReadForUser(int $userId): int
    {
        return $this->forUser($userId)
            ->where('read', false)
            ->update(['read' => true]);
    }

    /**
     * @param  list<int>  $ids
     */
    public function markAsReadForUser(int $userId, array $ids): int
    {
        return $this->forUser($userId)
            ->whereIn('id', $ids)
            ->where('read', false)
            ->update(['read' => true]);
    }

    /**
     * @param  list<int>  $ids
     */
    public function deleteForUser(int $userId, array $ids): int
    {
        return $this->forUser($userId)->whereIn('id', $ids)->delete();
    }

    public function deleteReadForUser(int $userId): int
    {
        return $this->forUser($userId)->where('read', true)->delete();
    }

    /**
     * Delete the user's notifications created before $before; with $onlyRead
     * the unread ones are kept so nothing the user has not seen is lost.
     */
    public function deleteOlderThanForUser(int $userId, Carbon $before, bool $onlyRead = false): int
    {
        return $this->forUser($userId)
            ->where('created_at', '<', $before)
            ->when($onlyRead, fn (Builder $query) => $query->where('read', true))
            ->delete();
    }

    private function forUser(int $userId): Builder
    {
        return Notification::query()->where('user_id', $userId);
    }

    /**
     * @param  array{unread?: bool, type?: string|null}  $filters
     */
    private function filtered(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['unread'] ?? false, fn (Builder $query) => $query->where('read', false))
            ->when($filters['type'] ?? null, fn (Builder $query, string $type) => $query->where('type', $type));
    }

    /**
     * Ordered by id alone: it grows with creation time, and it is the column
     * the keyset cursor in pageForUser() compares against, so the order and
     * the cursor can never disagree.
     */
    private function newestFirst(Builder $query): Builder
    {
        return $query->orderByDesc('id');
    }
}
