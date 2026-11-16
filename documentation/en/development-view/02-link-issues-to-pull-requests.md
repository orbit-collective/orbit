# Link issues to pull requests

A pull request can be linked to **several** Orbit issues. The view reads
and writes those links; this guide is what you need to know before
touching them.

## The model

`external_issue_links` has one row **per issue** of a pull request, unique
on `(project_integration_id, external_id, issue_id)` (migration
`2026_11_16_100000_allow_several_issues_per_pull_request.php`).
`external_id` is GitHub's numeric pull request id (orbit-api sends it as
`id`), `external_key` is `owner/name#number`. `ExternalIssueLinkRepository`
therefore has `getFor()` (every link of a pull request), `findFor(…,
$issueId)` and `upsertFor()` keyed by `$attributes['issue_id']`. Jira
imports still use one row per external id.

## Markers

File: `app/Services/Integrations/Github/GithubMarkerParser.php`

```php
$parser->parse('<!-- orbit-issue:2 --> <!-- orbit-issue:1 -->'); // [2, 1]
$parser->withMarker($body, 5);    // appends the marker unless it is there
$parser->withoutMarker($body, 5); // drops it and the blank line it leaves
```

An `opened` event with several markers links every issue that resolves in
the integration's project (one that does not is dropped on its own) and
posts **one** bot comment listing them
(`GithubCommentFormatter::format(array $issues, Project $project)`).
`reopened`/`closed`/`synchronize`, check and review events update **every**
link of the pull request; staleness is judged per link.

## Writes from the view

File: `app/Services/Integrations/Github/GithubDevelopmentService.php`

- `linkIssue()` reads the pull request, adds the marker to its description
  through orbit-api (`POST /v1/github/pull-request-update`) and writes the
  link row itself, because no `opened` event will come for an existing
  pull request.
- `unlinkIssue()` removes the marker and only that issue's row.
- `setPullRequestState()` closes or reopens. It deliberately **does not**
  touch the links: the webhook updates them and fires the automations
  listening for "pull request closed"; advancing them here would make the
  webhook look stale and silently skip those automations.

Each write logs to the project's activity log and bumps
`CacheVersion::development()`.

## Who may do it

| Action | Permission | Also needs |
|---|---|---|
| Open the view, read | `projects.github.development.view` | — |
| Close/reopen, link, unlink, search issues | `projects.github.development.manage` | the user's GitHub account linked |
| Create a branch | `projects.github.development.create` | the user's GitHub account linked |

Owner, Admin and Member get all of them by default, Viewer only `view`
(`RoleService`, and a migration for roles that already exist). Authorise
only through `ProjectPolicy` (`viewGithubDevelopment`,
`manageGithubDevelopment`, `createGithubDevelopment`).

## Tests

`tests/Feature/GithubRelayEventProcessorTest.php` (several markers, partial
resolution, lifecycle on every link), `GithubMarkerParserTest.php`,
`Repositories/ExternalIssueLinkRepositoryTest.php`,
`GithubDevelopmentControllerTest.php` (link, link twice, unlink, a
foreign issue, closing leaves links alone) and
`GithubDevelopmentPermissionsTest.php`.
