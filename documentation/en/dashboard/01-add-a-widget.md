# Add a widget

Worked example: an `Issue Age` widget, a stat card with a number of the
user's issues. (A new *number* does not need a type: add a metric to the
`stat` widget instead, see "Add a number to the statistic widget" in the
README.) Adding a type touches four
places; the layout editor, validation and the saved layouts pick it up
without further work.

## 1. Declare the type

In `app/Enums/Dashboard/DashboardWidgetType.php` add a case and answer every
`match`:

```php
case IssueAge = 'issue_age';

// label():       self::IssueAge => 'Issue Age',
// description(): self::IssueAge => 'How many issues you track',
// icon():        self::IssueAge => 'CalendarClock',   // a lucide icon
// variants():    add it to the stat group: ['default', 'vivid', 'accent']
// minWidth(), defaultWidth(), minHeight(), defaultHeight(): add it to the
//                stat group (20 / 30 / 20 / 32)
// props():       self::IssueAge => ['issueStats'],
```

- `options()` is for settings of the widget (see `Projects`, `limit`): each
  option lists its allowed values and a default that is one of them.
- `props()` names the Inertia props the widget reads. A widget that needs
  data nobody sends yet needs a new prop: add it to `DashboardController`
  through the `$prop(...)` helper so it is `Inertia::optional()` while no
  visible widget reads it, and to `DATA_PROPS` in `Pages/Dashboard.tsx`.

The default layout is `DashboardLayoutService::defaultWidgets()`. Add the
type there only if every user should see it from the start; otherwise users
add it from the library.

## 2. Send the data

If the widget reads an existing prop (`issueStats` here) there is nothing to
do. Otherwise compute it in the Repository, expose it through a Service and
add the prop as described above.

## 3. Draw it

In `resources/js/types/Dashboard.ts` add the type to `DashboardWidgetType`,
then give `Components/Organisms/DashboardWidget/DashboardWidget.tsx` a case:

```tsx
case 'issue_age':
    return issueStats ? (
        <StatCard
            {...statProps('warning', 'How many issues you track')}
            title="Issue Age"
            value={<AnimatedNumber value={issueStats.total} />}
            icon="CalendarClock"
        />
    ) : (
        <WidgetPlaceholder />
    );
```

`statProps(defaultColor, hint)` is defined in the component. It reads the style,
the color, the icon and the description options of the widget, so a statistic
follows them without more code.

Always render `<WidgetPlaceholder />` when the prop is `undefined`: that is
how a widget just added in the editor looks until its data arrives.

## 4. Test it

- PHP: `tests/Feature/DashboardLayoutServiceTest.php` already checks every
  case of the enum for a consistent catalog (default width among the
  allowed ones, defaults among the allowed option values). Add a case to
  `tests/Feature/DashboardLayoutControllerTest.php` if the type has options.
- Frontend: add the type to `DASHBOARD_CATALOG` in
  `resources/js/tests/dashboardLayout.ts`, a test to
  `DashboardWidget.test.tsx` (the data and the placeholder) and a story to
  `DashboardWidget.stories.tsx`.

Finally keep this guide and its Polish copy in `documentation/pl/dashboard/`
in step with any change to the shape of a widget.
