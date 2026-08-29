# Saved filters

A `SavedFilter` is a named, stored combination of search/label/status/
priority/assignee query params for a project, created from
`useSavedFilters()`'s `saveFilter(name, queryParams)` and listed back
via `Project::savedFilters()`. This category documents two real gaps
found while researching it: the Controller bypasses the Service layer
entirely (see
[`../activity-log/01-log-a-new-kind-of-activity.md`](../activity-log/01-log-a-new-kind-of-activity.md),
which already introduces the missing `SavedFilterService` as its
worked example), and the `context` column is written on every save
but never actually read anywhere — every saved filter shows up
regardless of which view (List/Board/Calendar) it was saved from.

## Guides, in the order you'd actually need them

1. **[Extract the Service layer](./01-extract-the-service-layer.md)**
   — the same `SavedFilterService` introduced in
   [`../activity-log/01-log-a-new-kind-of-activity.md`](../activity-log/01-log-a-new-kind-of-activity.md),
   covered here in full (both `create()` and `delete()`, plus the
   Controller/route/test changes) since this category is where it
   actually belongs.
2. **[Make `context` actually scope which filters show](./02-make-context-scope-which-filters-show.md)**
   — worked example fixing the second gap: filtering the saved-filter
   list by the active view's context instead of showing every saved
   filter for the project everywhere.

## The architecture in one paragraph

`SavedFilter` (`project_id`, `name`, `context`, `query_params` — the
last cast to `array`) has no dedicated Policy; both
`SavedFilterController::store()`/`destroy()` authorize only against
`view` on the **project** (`Project::savedFilters()`'s parent), so any
member can create or delete *any* saved filter belonging to a project
they're in — there's no per-filter ownership concept today, unlike
[comments'](../permissions/README.md) own/any distinction. On the
frontend, `useSavedFilters()` computes `context` as
`` `project_${projectId}` `` whenever a `projectId` is given, and
refuses to save at all (logging to the console, not surfacing a user
-facing error) when one isn't — meaning the hook's own fallback
context value, the literal string `'project_issues'`, is **never
actually sent to the server** by any real call site today, since
reaching that branch requires *not* having a `projectId`, which the
very next line turns into an early return. `context` is stored
faithfully either way, but nothing on the frontend currently reads or
filters by it when listing saved filters back — see guide 2.
