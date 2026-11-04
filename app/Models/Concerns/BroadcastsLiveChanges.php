<?php

namespace App\Models\Concerns;

use App\Support\Live\LiveUpdates;

/**
 * Tells live clients when this model is saved or deleted. The using model
 * names the project it belongs to and what kind of change a client should
 * react to; everything else (batching, queueing, being off without Reverb)
 * lives in LiveUpdates.
 *
 * Like BumpsIssueCache, model events do not fire for query-builder writes:
 * those call LiveUpdates by hand where they happen.
 */
trait BroadcastsLiveChanges
{
    protected static function bootBroadcastsLiveChanges(): void
    {
        static::created(fn ($model) => $model->broadcastLive('created'));
        static::updated(fn ($model) => $model->broadcastLive('updated'));
        static::deleted(fn ($model) => $model->broadcastLive('deleted'));
    }

    /** @return array{project: int, type: string, id: int|null}|null */
    abstract protected function liveChange(): ?array;

    protected function broadcastLive(string $action): void
    {
        $live = app(LiveUpdates::class);

        if (! $live->enabled()) {
            return;
        }

        $change = $this->liveChange();

        if ($change !== null) {
            $live->project($change['project'], $change['type'], $change['id'], $action);
        }
    }
}
