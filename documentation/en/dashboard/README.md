# Dashboard

The dashboard (`/`) is **a list of widgets** that every user can rearrange.
Its editor opens from the pen button in the page header or from the
`Edit dashboard` command (`dashboard.edit`) in the command palette: drag a
widget by its handle (mouse and touch) or use the up/down buttons, hide or
show it, change its style, width and options, add widgets from the library
and remove them. Nothing is stored until **Save**; **Cancel** drops the
draft and **Reset** brings the default layout back.

## Guides

1. **[Add a widget](./01-add-a-widget.md)** — worked example adding a
   hypothetical `Overdue Issues` widget: the catalog case, the data it
   reads, the component and the tests.

## The architecture in one paragraph

A layout is one row of `dashboard_layouts` per user (`user_id` unique,
`widgets` JSON, `version`); **no row means the default layout**, so nobody
sees a change until they save one. Each widget is `{id, type, variant,
span, visible, config}`: `span` is its width in twelfths of a 12 column
grid, `variant` a style of the type, `config` the values of the type's
options. `App\Enums\Dashboard\DashboardWidgetType` is the **single source
of what a widget can do**: label, description, icon, variants, allowed
widths (`spans()`, default `defaultSpan()`), options and the Inertia props
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

The widths are written out in `spanClass()` because Tailwind needs the full
class names. On a phone the grid is one column and the editor panel is a
sheet at the bottom of the screen.
