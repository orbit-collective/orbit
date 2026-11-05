<?php

namespace App\Support\Live;

use App\Events\Live\AccessChanged;
use App\Events\Live\DeveloperPortalChanged;
use App\Events\Live\ProjectChanged;
use App\Services\DeveloperPortal\ErrorLogService;

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

    /**
     * Deleted issues keep their ids when a flush collapses (a client showing
     * one must leave it), up to this many, which keeps a message well under
     * Reverb's 10 KB limit. Past it they collapse like everything else.
     */
    private const int MAX_DELETED_IDS = 200;

    /** @var array<int, array<string, array{type: string, id: int|null, action: string}>> */
    private array $projects = [];

    /** @var array<int, int|null> user id => project id (null = everything) */
    private array $access = [];

    /** @var array<string, true> kinds the Developer Portal shows that changed */
    private array $portal = [];

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

        $this->portal(match ($type) {
            // A workflow status changing category moves issues between the portal's buckets.
            'issue', 'comment', 'issue-types' => 'issues',
            'project', 'members' => 'projects',
            default => null,
        });
    }

    /**
     * The Developer Portal's totals or lists changed (`users`, `projects`,
     * `issues`, `errors`). A no-op unless the portal is on (APP_ENV=local), so
     * production never broadcasts it.
     */
    public function portal(?string $kind): void
    {
        if ($kind === null || ! $this->enabled() || ! config('developer-portal.enabled')) {
            return;
        }

        $this->portal[$kind] = true;
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
        return $this->projects !== [] || $this->access !== [] || $this->portal !== [];
    }

    public function flush(): void
    {
        $projects = $this->projects;
        $access = $this->access;
        $portal = array_keys($this->portal);
        $this->projects = [];
        $this->access = [];
        $this->portal = [];

        $actor = auth()->id();

        foreach ($projects as $projectId => $changes) {
            $changes = array_values($changes);

            if (count($changes) > self::MAX_CHANGES) {
                $changes = $this->collapse($changes);
            }

            ProjectChanged::dispatch($projectId, $changes, $actor);
        }

        foreach ($access as $userId => $projectId) {
            AccessChanged::dispatch($userId, $projectId);
        }

        if ($portal !== []) {
            // The log was just written to: the reload this triggers must not get a cached read.
            if (in_array('errors', $portal, true)) {
                app(ErrorLogService::class)->forget();
            }

            DeveloperPortalChanged::dispatch($portal);
        }
    }

    /**
     * @param  list<array{type: string, id: int|null, action: string}>  $changes
     * @return list<array{type: string, id: int|null, action: string}>
     */
    private function collapse(array $changes): array
    {
        $deleted = array_values(array_filter(
            $changes,
            fn (array $change) => $change['type'] === 'issue' && $change['action'] === 'deleted' && $change['id'] !== null,
        ));
        $keep = count($deleted) <= self::MAX_DELETED_IDS ? $deleted : [];
        $rest = array_filter($changes, fn (array $change) => ! in_array($change, $keep, true));

        $bulk = array_map(
            fn (string $type) => ['type' => $type, 'id' => null, 'action' => 'bulk'],
            array_values(array_unique(array_map(fn (array $change) => $change['type'], $rest))),
        );

        return [...$keep, ...$bulk];
    }
}
