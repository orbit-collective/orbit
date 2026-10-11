# Redis

Redis is Orbit's cache, session and queue backend. Everything it holds is
disposable except queued jobs and live sessions (it runs with append-only
persistence so those survive a restart); the SQLite database stays the single
source of truth.

## Guides, in the order you'd actually need them

1. **[Run and operate Redis](./01-run-and-operate-redis.md)** — the `redis`
   Docker service, the env variables (including Doppler), switching the
   cache/session/queue drivers one by one, and inspecting or flushing it.
2. **[Cache a value and invalidate it](./02-cache-a-value-and-invalidate-it.md)**
   — `CacheVersion`, the membership scope, and what must move the version
   when you add a write path.
3. **[Sessions on Redis](./03-sessions-on-redis.md)** — why the Security page
   needs the `SessionRegistry` and how it works.

## What is cached today

| Data | Where | Invalidated by |
| --- | --- | --- |
| A user's notifications (newest 100) | `NotificationService::getAllForUser` | store, update, delete, mark-all-read |
| A user's project list and "has projects" | `ProjectService` | the membership version |
| A user's role and permissions on a project | `Project::membershipOf()` | the membership version |
| Issue lists: dashboard, a project's table page, the calendar | `IssueService` | the issues, users and membership versions (2-minute TTL) |
| Sessions, rate limiter, queue, locks | Laravel drivers | not applicable |

The notification, project-list and permission reads are shared Inertia props or
authorization checks that run on (almost) every request; the issue lists are the
heaviest page queries.
