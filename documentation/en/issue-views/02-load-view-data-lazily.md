# Load a view's data lazily

The project page does not send every view's data on every visit. The
table and board read `issues` (one page), Activity reads `activityLogs`,
and the **calendar's data is optional**: `calendarIssues` and
`upcomingDeadlines` are only sent when the Calendar view asks for them,
and only for the days on screen. This guide shows the pattern, so a new
view that needs its own dataset can follow it.

## 1. Make the props optional on the controller

In `ProjectController::show()` (`app/Http/Controllers/ProjectController.php`)
heavy props are closures (evaluated only when the response includes
them) and view-only props are `Inertia::optional()` (never part of a
normal visit at all):

```php
return Inertia::render('Projects/Show', [
    'issues' => fn () => $this->issueService->getAllByProjectID($project->id, $sortParams, $perPage, $searchParams, $filters),
    'calendarIssues' => Inertia::optional(fn () => $this->issueService->getCalendarIssues($project->id, $calendarFrom, $calendarTo, $searchParams, $filters)),
    'upcomingDeadlines' => Inertia::optional(fn () => $this->issueService->getUpcomingDeadlines($project->id, $searchParams, $filters)),
]);
```

## 2. Scope the query to what is on screen

`calendarRange()` reads `calendar_from` / `calendar_to` (`Y-m-d`,
validated), defaults to the current month grid and caps the span.
`IssueRepository::getForProjectInRange()` returns only the issues that
overlap that range and reuses `applySearchAndFilters()`, so the filter
chips still apply. Counts that a view only draws (the dashboard's
`issueStats`) come from one grouped query
(`IssueRepository::statsForUser()`), never from issue rows.

## 3. Ask for the props from the view

The view reports what it shows and the page reloads only its own props
(`resources/js/Pages/Projects/Show.tsx`):

```tsx
router.reload({
    only: ['calendarIssues', 'upcomingDeadlines'],
    data: { calendar_from: from, calendar_to: to },
});
```

`CalendarView` calls `onRangeChange(from, to)` on mount and whenever the
visible month or week changes. A filter or search change is a normal
visit, which drops the optional props, so `Show.tsx` reloads them again
for the range still on screen.

## 4. Test it

`ProjectControllerTest` asserts the props are missing on a normal visit
and present on `reloadOnly([...])`; `IssueListCacheTest` covers the
range and deadlines queries.
