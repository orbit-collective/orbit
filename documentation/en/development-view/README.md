# Development view (GitHub in a project)

The fifth project view, next to List, Board, Calendar and Activity: a
connected repository's pull requests, CI, commits, branches and
statistics, plus the few things you can do about them (close or reopen a
pull request, link Orbit issues to it, start a branch). It is the first
part of Orbit that *reads* GitHub through orbit-api instead of only
reacting to webhook events.

## Guides, in the order you'd actually need them

1. **[Add a development read model](./01-add-a-development-read-model.md)** —
   worked example adding "releases" end to end: an orbit-api endpoint, the
   relay client method, the Orbit service and route, the frontend resource
   and panel, and every test.

2. **[Link issues to pull requests](./02-link-issues-to-pull-requests.md)** —
   how one pull request carries several issues (markers, link rows,
   lifecycle events), what the write actions do, and which permissions and
   GitHub-account checks guard them.

## The architecture in one paragraph

orbit-api (`orbit-api/src/github/development/`) is the only thing that
talks to GitHub for this view: `DevelopmentService` authorises the
repository against the caller's connection (`RepositoryAccessService`),
reads through `GitHubDevelopmentClient` and returns shaped DTOs
(`development.dto.ts`), never GitHub's own payloads. Orbit's
`OrbitRelayClient` wraps those endpoints, `GithubDevelopmentService` adds
the project rules (the repository must be one of the project's, reads are
cached 30 s as plain arrays under `CacheVersion::development($projectId)`,
every write bumps that scope, each pull request gets the issues linked to
it) and `GithubDevelopmentController` serves JSON under
`/projects/{project}/development/*` (the exception to "no JSON API" is
listed in `bootstrap/app.php`, like the command palette). The project page
itself only sends a cheap `development` prop (connection, repositories,
abilities, no GitHub call); `Components/Organisms/DevelopmentView` reads
everything else per repository through `useDevelopmentResource`, so the
data is never part of Inertia's live reloads. Reading needs
`projects.github.development.view`; closing, reopening and linking need
`.manage` **and** a GitHub account linked to the acting user. Nothing here
works against production data until the matching orbit-api commits are on
its `main` branch (Netlify deploys functions from there).

## Live updates

`GithubDevelopmentAnnouncer::announce($projectId)` is the one place that says
"what the view shows changed": it bumps `CacheVersion::development()` (so the
reload that follows reads GitHub afresh) and sends a `development` change on
the project's live channel. `GithubDevelopmentService::forget()` calls it for
every write made from the view, and `GithubRelayEventProcessor::process()` for
every `pull_request`, `check_suite` and `pull_request_review` relay event,
linked to an issue or not. In the browser `live/useDevelopmentLive.ts` reloads
the view after a short pause (a burst is one reload, the person's own changes
are skipped); without a working socket it polls at `LIVE_POLL_INTERVAL` and
catches up when the socket returns. What the relay never hears of (a push to
another branch, an issue, a branch made on GitHub) cannot be announced, so a
visible tab also sweeps everything every five minutes. To announce more, give
the relay another event type and call the announcer from the processor; the
App must also be subscribed to that event on GitHub.

