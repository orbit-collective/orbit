# Announce a change

Live clients only hear about a write if the write says so. There are three ways,
from most to least automatic. The worked example adds live updates for a
hypothetical `Milestone` model that belongs to a project.

## The one rule that matters most

**An event carries ids and kinds, never row contents.** `ProjectChanged` is
`{changes: [{type, id, action}], actor}`. The client uses it only to decide which
Inertia props to re-read, and the re-read goes through the normal authorised
routes. That is what keeps the channel safe: a client that is still subscribed
after losing access (a removed member's open tab) receives hints about things it
can no longer fetch. The one exception is `NotificationsChanged`, which carries
the new notification — but it travels on the recipient's own private channel.

## Step 1 — Models: use the trait

File: `app/Models/Concerns/BroadcastsLiveChanges.php`

```php
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
```

File: `app/Models/Milestone.php`

```php
class Milestone extends Model
{
    use BroadcastsLiveChanges;

    protected function liveChange(): ?array
    {
        return $this->project_id
            ? ['project' => $this->project_id, 'type' => 'milestones', 'id' => $this->id]
            : null;
    }
}
```

`type` is the word the client switches on (Step 3 of
[React to a change in the UI](./03-react-to-a-change-in-the-ui.md)). `id` is the
record, or `null` when the change is not about one record. Existing users:
`Issue` (`issue`), `Comment` (`comment`, with its issue's id, because a comment
is shown on its issue), `Project`, `Label` (`labels`), `Priority`
(`priorities`) and `IssueType` (`issue-types`).

## Step 2 — Writes that bypass model events

Query-builder writes (`->update()`, `->delete()` on a query, raw SQL, pivot
`attach`/`detach`) fire no model events, the same trap as the cache versions in
[`../redis/02-cache-a-value-and-invalidate-it.md`](../redis/02-cache-a-value-and-invalidate-it.md).
Call `LiveUpdates` where they happen, next to the `CacheVersion::bump(...)`:

File: `app/Repositories/IssueRepository.php`

```php
    public function bulkDelete(array $ids): void
    {
        $projectIds = Issue::whereIn('id', $ids)->distinct()->pluck('project_id');

        Issue::whereIn('id', $ids)->delete();

        // A query-builder delete fires no model events.
        CacheVersion::bump(CacheVersion::ISSUES);

        foreach ($projectIds as $projectId) {
            app(LiveUpdates::class)->issue($projectId, null, 'bulk');
        }
    }
```

`LiveUpdates` offers `issue()`, `comment()`, `project($projectId, $type, $id,
$action)`, `membership($projectId, $userId)` (a member joined, left or changed
role: tells the project and that person) and `access($userId, $projectId)`.
Every method is a no-op while live updates are off.

## Step 3 — Who is told, and when

File: `app/Support/Live/LiveUpdates.php`

Nothing is sent when you call it. Changes are collected per project, de-duplicated
(the same `type:id:action` once) and flushed when the HTTP response is done
(`app->terminating`) or the queue job finished (`JobProcessed`, `JobFailed`,
`JobExceptionOccurred`). Past 25 changes in one flush they collapse into one
`bulk` entry per type. So a request that edits fifty issues is one event per
project, and nothing is broadcast before the transaction that wrote the data has
committed (the events are `ShouldDispatchAfterCommit`).

Events travel on the `live` queue (`LiveChannels::QUEUE`); the worker reads it
before `default`.

## Step 4 — A user's own channel

Two events go to a single user's channel `user.{id}`:

- `AccessChanged` — their membership or role changed; open tabs re-read the page.
  Sent by `LiveUpdates::membership()`.
- `NotificationsChanged` — their inbox changed. **Every notification write already
  goes through `NotificationService`**, whose `store()` announces the new row and
  whose `forget()` announces everything else (read, delete, clean-up). A new
  write path for notifications must call `forget()` like the existing ones, and
  then needs no extra code.

## Step 5 — Tests

File: `tests/Feature/Live/LiveUpdatesTest.php` is the model to copy:

```php
beforeEach(function () {
    config(['live.enabled' => true]);
    Event::fake([ProjectChanged::class, AccessChanged::class, NotificationsChanged::class]);
});

test('saving a milestone is announced to its project', function () {
    $project = Project::factory()->create();
    $milestone = Milestone::factory()->create(['project_id' => $project->id]);
    app(LiveUpdates::class)->flush();
    Event::fake([ProjectChanged::class]);

    $milestone->update(['title' => 'Renamed']);
    app(LiveUpdates::class)->flush();

    Event::assertDispatched(ProjectChanged::class, fn (ProjectChanged $event) => $event->projectId === $project->id
        && in_array(['type' => 'milestones', 'id' => $milestone->id, 'action' => 'updated'], $event->changes, true));
});
```

Call `flush()` yourself in a test that does not make an HTTP request; a feature
test that does (see the last test in the file) flushes on terminate like
production.
