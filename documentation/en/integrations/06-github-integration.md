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

1. GitHub sends a `pull_request` webhook to orbit-api when a PR is opened.
2. orbit-api verifies the webhook signature and stores it as a pending
   "relay event", scoped to the project's connection.
3. Orbit Local polls orbit-api once a minute (`PollGithubRelayEvents`,
   scheduled in `routes/console.php`) for pending events.
4. For each event, Orbit Local parses the PR body for an
   `<!-- orbit-issue:ID -->` marker, resolves the issue, and persists
   the link.
5. Orbit Local asks orbit-api to post a confirmation comment on the PR,
   using orbit-api's GitHub App installation token — Orbit Local never
   holds a GitHub token or the GitHub App's private key itself.
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

## Acknowledgement semantics

An event is acknowledged (removed from the pending queue) once
`GithubRelayEventProcessor::process()` returns without throwing — this
covers both a successful link *and* every permanently-invalid case
above (no marker, ambiguous, issue missing, wrong project, unsupported
event/action). A **transient** failure — orbit-api unreachable, the
comment request failing, a database error — makes `process()` throw,
and `PollGithubRelayEvents` deliberately does not acknowledge the
event in that case: it stays pending and is retried on the next poll.
There is no separate retry-queue infrastructure; the relay's own
pending state is the retry mechanism.

## MVP limitations

- Only `pull_request.opened` is handled — edits, closes, merges,
  reviews, and CI/check runs are not synced.
- One GitHub connection per Orbit project, one repository per
  connection, and one Orbit issue per pull request.
- No status automation: linking a PR never transitions the issue's
  status or closes it.
- No comment sync in either direction beyond the single confirmation
  comment orbit-api posts once.
- Disconnecting in Orbit does not uninstall the GitHub App from
  GitHub — it only stops Orbit Local from trusting that connection.

## Troubleshooting

**Connection stuck on "pending"** — the GitHub App installation was
never completed, or completed with zero or more than one repository
selected (orbit-api requires exactly one). Reopen the install page
from the integration panel and try again.

**Connection shows "revoked" and won't reconnect** — click **Connect
with GitHub** again; this always requests a brand-new orbit-api
connection rather than trying to resume the old one.

**A PR isn't getting linked** — check the marker is exactly
`<!-- orbit-issue:ID -->` with a numeric id, appears exactly once in
the PR description, and that the issue id belongs to the same Orbit
project as the connected repository. Also confirm the connection's
status is `connected`, not `pending`.

**Events not processing** — confirm the scheduler is actually running
(`composer dev`'s queue/schedule processes, or your production cron
entry for `php artisan schedule:run`); `PollGithubRelayEvents` only
runs once a minute if something is invoking Laravel's scheduler.

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
