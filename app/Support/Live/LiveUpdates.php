<?php

namespace App\Support\Live;

use App\Events\Live\AccessChanged;
use App\Events\Live\ProjectChanged;

/**
 * The one place the application says "this changed" for live updates.
 *
 * Writes call `issue()`, `comment()`, `project()` or `access()`; nothing is
 * sent right away. Changes are collected and de-duplicated, then flushed once
 * the HTTP response is done (or the queue job finished), so a bulk update of
 * fifty issues is one event per project instead of fifty. While live updates
 * are off (no Reverb) every call is a no-op.
 */
final class LiveUpdates
{
    /** More changes than this in one flush collapse into a single "bulk" hint. */
    private const int MAX_CHANGES = 25;

    /** @var array<int, array<string, array{type: string, id: int|null, action: string}>> */
    private array $projects = [];

    /** @var array<int, int|null> user id => project id (null = everything) */
    private array $access = [];

    public function enabled(): bool
    {
        return (bool) config('live.enabled');
    }

    public function issue(int $projectId, ?int $issueId, string $action = 'updated'): void
    {
        $this->project($projectId, 'issue', $issueId, $action);
    }

    public function comment(int $projectId, ?int $issueId, string $action = 'updated'): void
    {
        $this->project($projectId, 'comment', $issueId, $action);
    }

    /** The comment's `id` is its issue's id: the client only needs to know which issue to refresh. */
    public function project(int $projectId, string $type, ?int $id = null, string $action = 'updated'): void
    {
        if (! $this->enabled()) {
            return;
        }

        $this->projects[$projectId]["$type:$id:$action"] = ['type' => $type, 'id' => $id, 'action' => $action];
    }

    /** A member joined, left or got another role: the project's people and that person's abilities changed. */
    public function membership(int $projectId, int $userId): void
    {
        $this->project($projectId, 'members');
        $this->access($userId, $projectId);
    }

    public function access(int $userId, ?int $projectId = null): void
    {
        if (! $this->enabled()) {
            return;
        }

        $this->access[$userId] = $projectId;
    }

    public function hasPending(): bool
    {
        return $this->projects !== [] || $this->access !== [];
    }

    public function flush(): void
    {
        $projects = $this->projects;
        $access = $this->access;
        $this->projects = [];
        $this->access = [];

        $actor = auth()->id();

        foreach ($projects as $projectId => $changes) {
            $changes = array_values($changes);

            if (count($changes) > self::MAX_CHANGES) {
                $changes = array_values(array_unique(array_map(
                    fn (array $change) => $change['type'],
                    $changes,
                )));
                $changes = array_map(fn (string $type) => ['type' => $type, 'id' => null, 'action' => 'bulk'], $changes);
            }

            ProjectChanged::dispatch($projectId, $changes, $actor);
        }

        foreach ($access as $userId => $projectId) {
            AccessChanged::dispatch($userId, $projectId);
        }
    }
}
