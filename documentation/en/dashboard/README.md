# Dashboard

The dashboard (`/`) is **a list of widgets** that every user can rearrange.
Its editor opens from the pen button in the page header or from the
`Edit dashboard` command (`dashboard.edit`) in the command palette: drag a
widget (anywhere on it, mouse and touch; it is drawn exactly as on the
dashboard, with only a tag on its border), resize it by its right edge, bottom
edge or corner (to any size, or snapped to the grid: see the `Snap to grid`
switch), hide or show it, change its style and options, add widgets from
the library and remove them. The panel has _Earlier_ / _Later_ buttons for
moving without dragging. Nothing is stored until **Save**; **Cancel** drops the
draft and **Reset** brings the default layout back.

## Guides

1. **[Add a widget](./01-add-a-widget.md)** — worked example adding a
   hypothetical `Overdue Issues` widget: the catalog case, the data it
   reads, the component and the tests.

## The architecture in one paragraph

A layout is one row of `dashboard_layouts` per user (`user_id` unique,
`widgets` JSON, `version`); **no row means the default layout**, so nobody
sees a change until they save one. Each widget is `{id, type, variant,
width, height, visible, config}`: `width` counts 120ths of the dashboard's
width and `height` rows of 4 px, so a widget can be any size; `variant` is
a style of the type, `config` the values of the type's
options. `App\Enums\Dashboard\DashboardWidgetType` is the **single source
of what a widget can do**: label, description, icon, variants, minimum
and default size (`minWidth()`, `defaultWidth()`, `minHeight()`,
`defaultHeight()`), options and the Inertia props
it reads (`props()`). `DashboardController` sends `dashboardLayout`
(`widgets` and the `catalog` made from that enum), so the frontend only
maps a type to a component (`Components/Organisms/DashboardWidget`).
`DashboardLayoutService` (Repository → Service → Controller as usual)
gives the default layout, saves through `normalize()` and reads through it
too: unknown types are dropped and anything invalid falls back to the
type's default, so removing a widget type or variant later cannot break a
saved layout. `PUT /dashboard/layout` (`UpdateDashboardLayoutRequest`
validates the shape and what depends on the type) and `DELETE
/dashboard/layout` (reset) both redirect back.

## The widgets

| Type | Styles | Reads |
| --- | --- | --- |
| `stat` | default, vivid, accent, glass, outline | `projects`, `issueStats` |
| `trend` | bars, line, area | `productivity_trend` |
| `completion` | bars, ring, stacked | `issueStats` |
| `priority_breakdown`, `types_breakdown` | bar, list, donut | `issueStats` |
| `activity` | feed, compact | `activityLogs`, `users`, `issueTypes` |
| `projects` | cards, grid, compact | `projects` |
| `my_issues` | list, compact, cards | `myIssues` |
| `deadlines` | list, timeline, week | `deadlines` |
| `week_summary` | numbers, sparkline, bars | `productivity_trend` |
| `quick_actions` | grid, list, bar | nothing (runs commands of the palette) |
| `greeting` | banner, compact, minimal | `issueStats` and the user of the page |

### One statistic widget, many numbers

The numbers (active projects, open issues, critical tasks, resolution rate,
overdue, assigned to me, due soon) are one widget type, `stat`, not one type
each. What it shows is its `metric` option; the options that only fit some
metrics carry `when` in the catalog (`{"metric": ["open_issues"]}`), and the
editor shows an option only while it applies (`visibleOptions()` in
`utils/dashboardLayout.ts`):

| Option | Meaning |
| --- | --- |
| `metric` | `projects`, `open_issues`, `critical`, `resolution`, `overdue`, `assigned`, `due_soon` |
| `count` | for `open_issues`: open, to do, in progress, done or all |
| `show` | `value` (the number), `fraction` (part / whole, with the share as a badge, a ring in the vivid style) or `percent` |
| `color` | `auto` (the metric's own color) or one of the palette |

Every metric but `projects` is a part of a whole, so every one can be shown
as a fraction or a percent: the whole is all the issues for the issue
metrics and the open issues for `overdue`, `assigned` and `due_soon`. The
editor and the grid name a statistic by its metric (`widgetLabel()`).

Layouts saved when each number was its own type (`stat_projects`,
`stat_open_issues`, ...) are upgraded in `DashboardLayoutService::normalize()`
to a `stat` with the metric, keeping their id, style and options (the old
resolution "Done / all" became `fraction`).

#### Add a number to the statistic widget

1. Add the metric to `DashboardWidgetType::STAT_METRICS` (its title) and to
   `when` of the options that apply to it.
2. Add it to `STAT_METRICS` and the `statFigures()` switch in
   `resources/js/utils/dashboardStat.ts`: title, hint, icon, default color,
   the value and the whole it is a part of.
3. If it reads a new prop, add it to the `Stat` entry of `props()`.
4. Add a case to `utils/dashboardStat.test.ts` and the widget tests.

The widgets that came after the first nine are in the library but not in the
default layout, so nobody's dashboard changes until they add one.

### Data of the issue widgets

`issueStats` also holds `overdue`, `dueSoon` (due within seven days), `assigned`
(open issues assigned to the user) and `types` (issues per issue type, types of
the same name across projects merged). They come from
`IssueRepository::openCountersForUser()` and `typeCountsForUser()`, merged in
`IssueService::getStatsForUser()` and cached with the other stats.
`myIssues` (`getMyIssuesForUser()`) and `deadlines` (`getDeadlinesForUser()`) are
lists of plain rows (`IssueService::dashboardRow()`: ids, number, title,
project, type, priority, status, assignee, end date) so they can be cached and
sent as they are. Both are capped (30 and 60 issues), `myIssues` is ordered by
the position of the priority, then the end date, and `deadlines` holds the open
issues due within a month and every overdue one. The options of a widget (sort,
limit, range, scope) are applied in the browser to that capped list
(`utils/dashboardIssues.ts`). "Today" comes from the browser (`utils/dueDate.ts`),
so a date is never shifted by the time zone of the server.

Both are `Inertia::optional()` while no visible widget reads them and are part of
the live and polling refreshes. The cached `deadlines` has the day in its key,
so it does not live past midnight.

### Making a widget friendly

The new widgets follow what the first ones do, and a widget added later should
too: every row or card is a real link or button with a name that says all of it
(the number, the title, the project, how late it is), a status is a word and an
icon as well as a color (`DueChip`), lists are `ul` or `ol` with `role="list"` and a
label, controls are at least 44px tall and show the keyboard focus, a widget
measures its own width (`useElementWidth`) and drops its extras when narrow
instead of overflowing, and anything that moves is under the page's
`MotionConfig reducedMotion="user"`.

## Saved layouts

The panel's **Saved** tab keeps layouts under a name (`dashboard_saved_layouts`:
`user_id`, `name` up to 40 characters, `widgets`, unique per user and name, at
most `DashboardSavedLayoutService::MAX_PER_USER` = 20). `POST
/dashboard/saved-layouts` saves the draft being edited and replaces a layout
that has the same name; `DELETE /dashboard/saved-layouts/{id}` removes one of
the user's own (someone else's is a 404). The widgets are checked by the same
rules as the layout itself (`StoreDashboardSavedLayoutRequest` extends
`UpdateDashboardLayoutRequest`) and run through `normalize()` both on the way
in and out, so a layout saved before a type or variant was removed still
applies. The page gets them as the `savedLayouts` prop. **Apply** only puts a
saved layout on the draft (nothing is stored until **Save**). `PATCH
/dashboard/saved-layouts/{id}` renames a layout and/or replaces its widgets with
the ones being edited (`UpdateDashboardSavedLayoutRequest`; a name another
layout of the user has is refused). The pictures are `LayoutPreview`, which
draws the layout on the real grid; each block is a `WidgetGlyph`, a tiny drawing
of the widget as it is configured (kind, style, show/hide options), drawn in
grays only so a preview shows the shape of a layout and not the colors of its
widgets; when a widget gets a new style or option, teach its glyph too. Blocks
of the preview must not grow with their content (`min-h-0 overflow-hidden`),
or the grid stretches and the proportions are lost.

## Options of a widget

An option is a choice from a list (`DashboardWidgetType::options()`): its label,
its values, its default and optionally `labels` (how a value is called in the
editor). A show/hide option is `toggle()` (`on`/`off`). A choice of colors is
`colorOption()`, marked `kind => 'color'`: the editor shows swatches
(`ColorSwatches`) instead of text, from the colors of `utils/dashboardColors.ts`
(`accent`, `success`, `warning`, `error`, `info`), which follow the theme.

## Styling notes

The project builds with Tailwind 3 (`tailwind.config.js`), which has no container
queries (`@container`, `@md:`, `cqw`) and no trailing `!`. Where a widget has to
adapt to the width of its own box (the grid style of the projects, the preview of
a layout) it reads that width with `useElementWidth` and passes it on as a style
or a CSS variable. A Tailwind translate class on an element that `framer-motion`
animates is replaced by the animation's inline `transform`, so such an element is
positioned with plain offsets and a nested element is the one that scales.

## Motion

The editor moves with `framer-motion` and the shared `EASE`/`DURATION` of
`utils/motion.ts`: the bar unfolds under the page header, the panel grows
at the side (below on a phone, see `useMediaQuery`), the tags of the widgets
and the pictures of saved layouts appear one after another, widgets that
are added grow in and removed ones shrink away while the others slide into
place (`layout="position"` on the cell, the drag transform on an inner
element so the two never fight). Widgets already there when editing starts
do not animate in (`AnimatePresence initial={false}`), and the whole page is
inside `MotionConfig reducedMotion="user"`. Anything a test must see right
away should not depend on an exit animation: tabs and the reset question
only animate in. The choices of the panel (`SegmentedControl`) sit on a pill
that slides from the old pick to the new one, the content of a tab comes in from
the side of the pick, and the settings of a widget lay out one after another
when another widget is picked.

## Data is loaded for visible widgets only

`DashboardController` wraps every prop a **hidden** widget would have used
in `Inertia::optional()`, so a widget that is not on the dashboard costs no
queries; `projects` always arrives (the sidebar draws it). The editor asks
for what a widget added to the draft is missing with a partial reload
(`useDashboardEditor`), and the live and polling refreshes
(`dashboardReloads(changes, loaded)` / `dashboardFallbackReloads(loaded)`)
only re-read the props that are loaded.

## Frontend map

| What | Where |
| --- | --- |
| Draft state, save / reset, missing data | `hooks/useDashboardEditor.ts` |
| Pure helpers (move, shift, create, `requiredProps`, width classes) | `utils/dashboardLayout.ts` |
| Type → component | `Components/Organisms/DashboardWidget/DashboardWidget.tsx` |
| Grid, drag and drop (`@dnd-kit/core`) | `Components/Organisms/DashboardGrid/` + `Molecules/WidgetEditFrame/` |
| Library and widget settings | `Components/Organisms/DashboardEditorPanel/` |
| Save / cancel / reset bar | `Components/Molecules/DashboardEditorBar/` |
| Saved layouts tab and its pictures | `Components/Organisms/DashboardSavedLayouts/` + `Molecules/LayoutPreview/` |

The dashboard is a CSS grid of 120 columns and 4 px rows packed densely
(`GRID_CLASS`); a cell gets its size from the `--widget-width` and
`--widget-height` variables (`gridItemStyle()`). Snap only changes the step
of a resize (`sizeAfterResize()`): a twelfth of the width and 40 px, or one
column and one row. Layouts saved with the old twelfths (`span`) are read
as `span × 10` columns by `normalize()`. On a phone every widget is full
width (only the height resizes) and the editor panel is a sheet at the
bottom of the screen.
