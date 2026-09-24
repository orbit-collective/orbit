# The GitHub integration

Unlike the **notify** (webhook) and **import** (pull) integrations
covered in the other guides in this category, GitHub is a third kind:
a GitHub App installation, connected through a small public relay
service, that links a pull request to an Orbit issue. This guide
documents the actual feature — architecture, how to connect a project,
the marker syntax, and troubleshooting — rather than "how to add
another one", since GitHub is the only integration of this kind.

## Why a relay is needed

Orbit is self-hosted, so a typical Orbit Local instance isn't publicly
reachable — GitHub can't deliver a webhook straight to it. `orbit-api`
(a small, separately-hosted Netlify Functions service, `api.orbit-dev.app`
by default) exists to bridge that gap:

```
GitHub  --webhook-->  orbit-api  <--poll--  Orbit Local  --comment request-->  orbit-api  --GitHub App API-->  GitHub
```

1. GitHub sends a `pull_request` webhook to orbit-api for a supported
   action — `opened`, `reopened`, `closed`, or `synchronize`.
2. orbit-api verifies the webhook signature and stores it as a pending
   "relay event", scoped to the project's connection.
3. Orbit Local polls orbit-api once a minute (`PollGithubRelayEvents`,
   scheduled in `routes/console.php`) for pending events.
4. For an `opened` event, Orbit Local parses the PR body for an
   `<!-- orbit-issue:ID -->` marker, resolves the issue, and persists
   the link. For `reopened`/`closed`/`synchronize`, Orbit Local looks
   up the *existing* link by GitHub's own stable identifiers instead
   (see [Pull request lifecycle synchronization](#pull-request-lifecycle-synchronization)
   below) and never re-parses the marker.
5. Only `opened` triggers a confirmation comment on the PR, via
   orbit-api's GitHub App installation token — Orbit Local never holds
   a GitHub token or the GitHub App's private key itself, and never
   posts a comment for a lifecycle event.
6. Orbit Local acknowledges the event, which removes it from the
   pending queue.

orbit-api's own source is the authority for its API contract; this
guide only covers the Orbit Local side.

## Local storage

There is no dedicated table for the GitHub connection — it extends the
same `project_integrations` row every other integration uses (see
[guide 05](./05-add-an-import-integration.md)'s "never add
per-integration schema" rule), with GitHub-specific columns
(`github_status`, `github_relay_token`, `github_installation_id`,
`github_repository_owner`/`github_repository_name`, etc.) added by a
migration. `github_relay_token` is encrypted at rest (`'encrypted'`
cast on `App\Models\ProjectIntegration`) and is never included in any
Inertia prop — the settings page only ever receives a small status DTO
(`GithubIntegrationService::getConnectStatus()`).

The PR ↔ issue link itself reuses `external_issue_links` (the same
table Jira's import integration uses for dedup), tagged with
`external_type = 'github_pull_request'`. Its unique constraint on
`(project_integration_id, external_id)` — where `external_id` is
GitHub's own numeric pull request id — is what makes relinking the
same PR (e.g. on a retried relay event) idempotent instead of creating
a duplicate row.

That same row also carries the PR's title, source/target branch,
`status`, and `draft` flag (`pull_request_title`, `source_branch`,
`target_branch`, `status`, `draft` — all nullable), plus `github_updated_at`
and `merged_at` (v0.9.3, also nullable). A link created before these
columns existed simply has nulls in them; the issue page's Development
panel (`IssueDevelopmentPanel`) renders around missing fields rather
than erroring, and nothing backfills old rows from GitHub. Reprocessing
an event never overwrites already-stored metadata with a null — see
`GithubRelayEventProcessor`'s null-filtering before the `upsertFor()`/
`touch()` calls.

## Environment

```
ORBIT_API_URL=https://api.orbit-dev.app
```

Set in `.env`/`.env.example` and read via `config('services.orbit_api.url')`
(`config/services.php`) — never hardcode the URL in a service. Point
this at a self-hosted orbit-api instance if you're not using the
default one.

## Connecting a project

1. Project Settings → Integrations → GitHub → **Connect with GitHub**.
2. Orbit Local asks orbit-api to create a connection
   (`GithubIntegrationService::connect()`), stores the connection id
   and relay token (encrypted), and opens the returned GitHub App
   install URL in a new tab.
3. The settings page polls (`WorkspaceSettingsIntegrationsTab`, every
   ~2 seconds, giving up after 5 minutes) while the connection is
   `pending`.
4. Once the GitHub App installation completes and exactly one
   repository has been selected, orbit-api marks the connection
   `connected`; the next poll picks that up and the UI shows the
   connected repository.

**Disconnect** revokes the connection with orbit-api and marks the
local row `revoked` — it does not uninstall the GitHub App from the
GitHub organization (see [limitations](#mvp-limitations)).

## Marker syntax

The only supported way to link a pull request to an Orbit issue is a
hidden marker in the PR's description:

```
<!-- orbit-issue:213769 -->
```

- **No marker** → the event is ignored (acknowledged, not retried).
- **Exactly one marker** → that issue is resolved and linked, as long
  as it belongs to the same Orbit project the GitHub integration is
  connected to. An issue from a different project is never linked.
- **Two or more markers** → treated as ambiguous. Nothing is linked,
  and the ambiguity is logged for diagnostics. This is a permanent
  outcome, not a transient failure — the event is still acknowledged.

There is no fallback: no title, branch, or commit-message parsing.
See `App\Services\Integrations\Github\GithubMarkerParser`.

The marker is only used for the *initial* link, on `opened`. A
`reopened`/`closed`/`synchronize` event never re-parses it — see the
next section.

## Pull request lifecycle synchronization

Once a pull request is linked, Orbit Local keeps its `status` current
by reacting to further webhook events, without ever touching the
marker again:

| GitHub action | Resulting `status` | Notes |
| --- | --- | --- |
| `reopened` | `open` | |
| `closed`, `merged: false` | `closed` | GitHub uses `closed` for both a plain close and a merge; the payload's own `merged` field (never branch names, commits, or timestamps) decides which. |
| `closed`, `merged: true` | `merged` | `merged_at` is stored if GitHub provides it. |
| `synchronize` | unchanged | New commits were pushed to the PR's branch. Only refreshes title/branches/draft — no commit list or count is stored. |

Lookup is by GitHub's own stable identifiers — the connection (which
implies the repository) plus the pull request's numeric id — never by
re-parsing the PR body, title, branch name, or PR number in isolation.
A lifecycle event for a pull request Orbit never linked (no `opened`
event was ever processed for it, or its marker didn't resolve) is
acknowledged and ignored: it never triggers marker-based linking
itself, and never creates a new link. See
`GithubRelayEventProcessor::handleLifecycleEvent()`.

A lifecycle event never posts or edits a bot comment, never creates a
new pull request link, and never changes the linked Orbit issue's own
workflow status — this release is synchronization only. Automatic
Orbit issue status changes based on pull request state are a
deliberate non-goal of this release.

**Stale-event protection.** GitHub does not guarantee webhook delivery
order. Each relay event carries the pull request's own `updated_at`
from GitHub (persisted locally as `github_updated_at`); an incoming
lifecycle event whose `updated_at` is older than the link's currently
stored one is ignored (acknowledged, not applied) rather than
reverting a newer state — e.g. a `synchronize` event that arrives
after the pull request has already been merged does not flip the
status back to `open`. A link with no `github_updated_at` yet (created
before v0.9.3, or never lifecycle-synced) has nothing to compare
against, so the first lifecycle event for it is always applied.

State here is **eventually consistent**, not real-time: it reflects
the last relay event Orbit Local has polled and processed, not
GitHub's live state at the moment you look at the issue.

## Acknowledgement semantics

An event is acknowledged (removed from the pending queue) once
`GithubRelayEventProcessor::process()` returns without throwing — this
covers a successful link, a successful lifecycle sync, and every
permanently-invalid case (no marker, ambiguous, issue missing, wrong
project, unsupported event/action, an unlinked lifecycle event, or a
stale lifecycle event). A **transient** failure — orbit-api
unreachable, the comment request failing, a database error — makes
`process()` throw, and `PollGithubRelayEvents` deliberately does not
acknowledge the event in that case: it stays pending and is retried on
the next poll. There is no separate retry-queue infrastructure; the
relay's own pending state is the retry mechanism.

## Reliability and health

Every sync — scheduled or manual — goes through one shared
`GithubIntegrationSynchronizer::sync()`, which records what happened
on the project's `project_integrations` row: `github_last_sync_attempt_at`
(every attempt), `github_last_synced_at` (last fully successful cycle),
`github_last_failed_sync_at`/`github_last_error_code`/`github_last_error_message`
(the last failure, if any), and `github_consecutive_failures`.
`GithubIntegrationHealthService` derives one of four states from those
signals — it's never stored itself, so it can't drift out of sync with
the data behind it:

| Health | Meaning | Shown when |
| --- | --- | --- |
| **Healthy** | Connected, last sync succeeded. | `connected`, zero consecutive failures. |
| **Degraded** | Connected, but the last sync failed transiently (network, orbit-api unavailable, a temporary GitHub error). | `connected`, at least one consecutive failure, no permanent error code. |
| **Error** | Connected locally, but the relay token or connection itself is unusable (e.g. `INVALID_RELAY_TOKEN`). | `connected`, last error is a permanent, token/connection-level code. |
| **Revoked** | The connection was explicitly revoked, locally or by orbit-api. | connection status is `revoked`. |

There's no numeric health score and no time-based staleness check —
purely the connection status, the last error code, and the failure
count already being tracked.

**Retry sync** (shown for a degraded integration) runs the exact same
synchronizer the scheduler uses, via `POST .../integrations/github/retry`
— there's no separate manual-sync code path. Concurrent syncs for the
same integration are prevented with a short-lived
`Cache::lock("github-sync:{id}", 55)`; if a scheduled poll and a manual
retry land at the same time, the second one is skipped rather than
running twice.

**Reconnect** (shown for an error or revoked integration) reuses the
same connect flow as the initial setup — it always requests a brand
new orbit-api connection and clears every reliability field, so a
previous connection's failure history never carries over. If orbit-api
reports `CONNECTION_REVOKED` during a sync, Orbit Local marks the
connection revoked itself (not just displays an error) — the scheduler
then stops polling it automatically, since it only syncs `connected`
integrations.

A **temporary orbit-api outage** never acknowledges the in-flight
relay event (unchanged from the MVP's ack semantics) and never touches
GitHub App access — once orbit-api is reachable again, the next
scheduled sync (or a manual retry) picks the pending event back up and
health returns to Healthy.

A **stale relay event** — acknowledging succeeds locally but orbit-api
reports `EVENT_EXPIRED` or `EVENT_NOT_FOUND` after the PR was already
linked and the comment already requested — is treated as a completed
outcome, not a failure: the actual work already happened, only the
relay's own pending record expired or vanished first.

## MVP limitations

- Only `pull_request.opened`, `reopened`, `closed`, and `synchronize`
  are handled — `edited` (including a title-only edit), reviews,
  requested reviewers, labels, assignees, and CI/check runs are not
  synced. A PR's title/branches only refresh opportunistically as a
  side effect of a lifecycle event that already carries them, not
  immediately when someone edits just the title on GitHub.
- One GitHub connection per Orbit project, one repository per
  connection, and one Orbit issue per pull request.
- No status automation: a pull request's lifecycle (opened, merged,
  closed, reopened) never transitions the linked Orbit issue's own
  workflow status or closes it — see
  [Pull request lifecycle synchronization](#pull-request-lifecycle-synchronization).
  That kind of automation is expected to arrive later as part of
  Workspace Automation, not this release.
- No commit-level tracking: `synchronize` only refreshes the existing
  metadata snapshot, never a commit list or count.
- No comment sync in either direction beyond the single confirmation
  comment orbit-api posts once on `opened` — a lifecycle event never
  posts or edits a comment.
- No full lifecycle history: only the pull request's current known
  state is stored and shown, not a timeline of past transitions.
- Disconnecting in Orbit does not uninstall the GitHub App from
  GitHub — it only stops Orbit Local from trusting that connection.

## Troubleshooting

**Connection stuck on "pending"** — the GitHub App installation was
never completed, or completed with zero or more than one repository
selected (orbit-api requires exactly one). Reopen the install page
from the integration panel and try again.

**Connection shows "revoked" and won't reconnect** — click
**Reconnect**; this always requests a brand-new orbit-api connection
rather than trying to resume the old one.

**A PR isn't getting linked** — check the marker is exactly
`<!-- orbit-issue:ID -->` with a numeric id, appears exactly once in
the PR description, and that the issue id belongs to the same Orbit
project as the connected repository. Also confirm the connection's
status is `connected`, not `pending`, and check the health pill and
diagnostics panel for a recorded error before assuming the marker is
the problem.

**Integration shows Degraded** — a transient failure on the last sync
(orbit-api unreachable, a temporary GitHub error). Check the error
message and the diagnostics panel's "Last attempt"/"Last successful
sync" timestamps, then either wait for the next scheduled sync or
click **Retry sync**.

**Integration shows "Needs attention" (Error)** — the relay token or
connection itself is no longer usable (a permanent error, e.g. an
invalid token). Retrying won't help; click **Reconnect**.

**Events not processing at all** — confirm something is actually
invoking Laravel's scheduler: the Docker Compose stack has a dedicated
`scheduler` service running `php artisan schedule:work`
(`docker-compose.yml`), or in a non-Docker deployment, a cron entry
calling `php artisan schedule:run` every minute. `PollGithubRelayEvents`
never runs on its own without one of these.

## Security notes

- Orbit Local only ever holds the orbit-api relay token — it never
  receives or stores a GitHub token or the GitHub App's private key.
  Those secrets live entirely in orbit-api.
- Orbit Local never calls the GitHub REST API directly; all
  GitHub-authenticated actions (posting the confirmation comment) are
  proxied through orbit-api using its own GitHub App installation
  token.
- `github_relay_token` is encrypted at rest and is never logged or
  sent to the frontend.
- **Trust boundary:** any Orbit member of the connected project can see
  the linked pull request's metadata (title, source/target branch,
  status) on the issue page, regardless of whether that individual has
  GitHub access to the repository. The GitHub App installation is
  per-project, not per-user - Orbit Local has no notion of an
  individual's own GitHub identity or permissions, so it cannot check
  "does this specific Orbit user have GitHub access to this repo"
  before rendering the Development panel. This has been true since the
  MVP for the bare PR label/URL and simply extends to the richer
  metadata added for the Development panel. Per-user authorization
  would require GitHub OAuth per Orbit user, which is planned for a
  future release but does not exist yet - until then, treat connecting
  a private repository to an Orbit project as making that repository's
  linked-PR metadata visible to the whole project team.
