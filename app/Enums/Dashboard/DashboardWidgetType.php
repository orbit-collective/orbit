<?php

namespace App\Enums\Dashboard;

/**
 * Every widget the dashboard can show, with what the layout editor needs to
 * know about it: its variants, how small it may get, the options it has and
 * the page props it reads. The frontend gets this as the `catalog` and only
 * maps a type to a component, so a new widget is one case here plus that map
 * (documentation/en/dashboard/).
 */
enum DashboardWidgetType: string
{
    case StatProjects = 'stat_projects';
    case StatOpenIssues = 'stat_open_issues';
    case StatCritical = 'stat_critical';
    case StatResolution = 'stat_resolution';
    case Trend = 'trend';
    case Completion = 'completion';
    case PriorityBreakdown = 'priority_breakdown';
    case Activity = 'activity';
    case Projects = 'projects';
    case StatOverdue = 'stat_overdue';
    case StatAssigned = 'stat_assigned';
    case StatDueSoon = 'stat_due_soon';
    case MyIssues = 'my_issues';
    case Deadlines = 'deadlines';
    case TypesBreakdown = 'types_breakdown';
    case WeekSummary = 'week_summary';
    case QuickActions = 'quick_actions';
    case Greeting = 'greeting';

    /** A widget's width is counted in these parts of the dashboard's width. */
    public const GRID_COLUMNS = 120;

    /** The coarse step the editor snaps to: a twelfth of the width. */
    public const COLUMN_SNAP = 10;

    /** A widget's height is counted in rows of this many pixels. */
    public const ROW_HEIGHT = 4;

    /** The tallest a widget may be, in rows. */
    public const MAX_HEIGHT = 400;

    public function label(): string
    {
        return match ($this) {
            self::StatProjects => 'Active Projects',
            self::StatOpenIssues => 'Open Issues',
            self::StatCritical => 'Critical Tasks',
            self::StatResolution => 'Resolution Rate',
            self::Trend => 'Productivity Trend',
            self::Completion => 'Completion Ratio',
            self::PriorityBreakdown => 'Priority Breakdown',
            self::Activity => 'Recent Work Activity',
            self::Projects => 'Projects Directory',
            self::StatOverdue => 'Overdue Issues',
            self::StatAssigned => 'Assigned to Me',
            self::StatDueSoon => 'Due Soon',
            self::MyIssues => 'My Issues',
            self::Deadlines => 'Upcoming Deadlines',
            self::TypesBreakdown => 'Issue Types',
            self::WeekSummary => 'Week Summary',
            self::QuickActions => 'Quick Actions',
            self::Greeting => 'Welcome',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::StatProjects => 'How many projects you track',
            self::StatOpenIssues => 'Issues that are not done yet',
            self::StatCritical => 'Issues at the top of their priority scale',
            self::StatResolution => 'Share of issues that are done',
            self::Trend => 'Issues created and resolved over time',
            self::Completion => 'To do, in progress and done at a glance',
            self::PriorityBreakdown => 'Your issues grouped by priority',
            self::Activity => 'Latest changes across your projects',
            self::Projects => 'Your projects with their progress',
            self::StatOverdue => 'Open issues past their due date',
            self::StatAssigned => 'Open issues assigned to you',
            self::StatDueSoon => 'Open issues due within a week',
            self::MyIssues => 'The open issues assigned to you',
            self::Deadlines => 'What is due next, and what is late',
            self::TypesBreakdown => 'Your issues grouped by type',
            self::WeekSummary => 'This week at a glance',
            self::QuickActions => 'Shortcuts to what you do often',
            self::Greeting => 'A greeting with your day in numbers',
        };
    }

    /** A lucide icon name. */
    public function icon(): string
    {
        return match ($this) {
            self::StatProjects => 'FolderGit2',
            self::StatOpenIssues => 'Layers',
            self::StatCritical => 'TriangleAlert',
            self::StatResolution => 'CircleCheck',
            self::Trend => 'ChartLine',
            self::Completion => 'ChartPie',
            self::PriorityBreakdown => 'ChartBarBig',
            self::Activity => 'Activity',
            self::Projects => 'FolderOpen',
            self::StatOverdue => 'CalendarX',
            self::StatAssigned => 'UserCheck',
            self::StatDueSoon => 'CalendarClock',
            self::MyIssues => 'ListChecks',
            self::Deadlines => 'CalendarRange',
            self::TypesBreakdown => 'Shapes',
            self::WeekSummary => 'Gauge',
            self::QuickActions => 'Zap',
            self::Greeting => 'Sun',
        };
    }

    /** @return list<string> the first one is the default */
    public function variants(): array
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution, self::StatOverdue, self::StatAssigned, self::StatDueSoon => ['default', 'vivid', 'accent', 'glass', 'outline'],
            self::Trend => ['bars', 'line', 'area'],
            self::Completion => ['bars', 'ring', 'stacked'],
            self::PriorityBreakdown => ['bar', 'list', 'donut'],
            self::Activity => ['feed', 'compact'],
            self::Projects => ['cards', 'grid', 'compact'],
            self::MyIssues => ['list', 'compact', 'cards'],
            self::Deadlines => ['list', 'timeline', 'week'],
            self::TypesBreakdown => ['bar', 'list', 'donut'],
            self::WeekSummary => ['numbers', 'sparkline', 'bars'],
            self::QuickActions => ['grid', 'list', 'bar'],
            self::Greeting => ['banner', 'compact', 'minimal'],
        };
    }

    /** The narrowest the widget may be, in grid columns. */
    public function minWidth(): int
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution, self::StatOverdue, self::StatAssigned, self::StatDueSoon => 20,
            default => 30,
        };
    }

    public function defaultWidth(): int
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution, self::StatOverdue, self::StatAssigned, self::StatDueSoon => 30,
            self::Trend, self::Activity => 80,
            self::PriorityBreakdown, self::Greeting => 120,
            self::MyIssues, self::Deadlines, self::QuickActions => 60,
            default => 40,
        };
    }

    /** The shortest the widget may be, in rows. */
    public function minHeight(): int
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution, self::StatOverdue, self::StatAssigned, self::StatDueSoon => 20,
            self::Trend => 56,
            self::Completion => 70,
            self::MyIssues, self::Deadlines, self::TypesBreakdown => 60,
            self::QuickActions, self::Greeting => 24,
            default => 40,
        };
    }

    public function defaultHeight(): int
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution, self::StatOverdue, self::StatAssigned, self::StatDueSoon => 32,
            self::Trend, self::Completion => 85,
            self::Activity, self::Projects => 170,
            self::PriorityBreakdown => 60,
            self::MyIssues, self::Deadlines => 120,
            self::TypesBreakdown => 85,
            self::WeekSummary => 60,
            self::QuickActions, self::Greeting => 36,
        };
    }

    /**
     * Options of the widget, keyed by name: label, the allowed values, the
     * default one, optionally how each value is called in the editor and
     * `kind` => `color` for a choice of colors.
     *
     * @return array<string, array{label: string, options: list<int|string>, default: int|string, labels?: array<string, string>, kind?: string}>
     */
    public function options(): array
    {
        return match ($this) {
            self::StatProjects => self::statOptions('accent'),
            self::StatOpenIssues => [
                'count' => [
                    'label' => 'Count',
                    'options' => ['open', 'todo', 'in_progress', 'done', 'all'],
                    'default' => 'open',
                    'labels' => ['open' => 'Open', 'todo' => 'To do', 'in_progress' => 'In progress', 'done' => 'Done', 'all' => 'All'],
                ],
            ] + self::statOptions('info'),
            self::StatCritical => self::statOptions('error'),
            self::StatOverdue => self::statOptions('error'),
            self::StatAssigned => self::statOptions('accent'),
            self::StatDueSoon => self::statOptions('warning'),
            self::StatResolution => [
                'show' => [
                    'label' => 'Show',
                    'options' => ['percent', 'count'],
                    'default' => 'percent',
                    'labels' => ['percent' => 'Percent', 'count' => 'Done / all'],
                ],
            ] + self::statOptions('success'),
            self::Trend => [
                'header' => self::toggle('Title'),
                'grid' => self::toggle('Grid lines'),
                'values' => [
                    'label' => 'Values',
                    'options' => ['hover', 'always'],
                    'default' => 'hover',
                    'labels' => ['hover' => 'On hover', 'always' => 'Always'],
                ],
                'today' => self::toggle('Highlight today'),
                'color' => self::colorOption('accent'),
            ],
            self::Completion => [
                'header' => self::toggle('Title'),
                'tier' => self::toggle('Status label'),
            ],
            self::PriorityBreakdown => [
                'header' => self::toggle('Title'),
                'noPriority' => self::toggle('No priority'),
                'percent' => self::toggle('Percentages'),
                'sort' => [
                    'label' => 'Order',
                    'options' => ['priority', 'count'],
                    'default' => 'priority',
                    'labels' => ['priority' => 'By priority', 'count' => 'By count'],
                ],
            ],
            self::Activity => [
                'header' => self::toggle('Title'),
                'pagination' => self::toggle('Pagination'),
            ],
            self::Projects => [
                'limit' => ['label' => 'Projects shown', 'options' => [3, 5, 10, 15], 'default' => 3],
                'sort' => [
                    'label' => 'Order',
                    'options' => ['latest', 'name', 'progress', 'issues'],
                    'default' => 'latest',
                    'labels' => ['latest' => 'Latest', 'name' => 'Name', 'progress' => 'Progress', 'issues' => 'Issues'],
                ],
                'header' => self::toggle('Title'),
                'viewAll' => self::toggle('View all link'),
            ],
            self::MyIssues => [
                'limit' => ['label' => 'Issues shown', 'options' => [5, 10, 15], 'default' => 5],
                'sort' => [
                    'label' => 'Order',
                    'options' => ['priority', 'due', 'updated'],
                    'default' => 'priority',
                    'labels' => ['priority' => 'Priority', 'due' => 'Due date', 'updated' => 'Last updated'],
                ],
                'header' => self::toggle('Title'),
                'type' => self::toggle('Issue type'),
                'project' => self::toggle('Project'),
                'priority' => self::toggle('Priority'),
                'due' => self::toggle('Due date'),
            ],
            self::Deadlines => [
                'scope' => [
                    'label' => 'Whose issues',
                    'options' => ['mine', 'all'],
                    'default' => 'mine',
                    'labels' => ['mine' => 'Assigned to me', 'all' => 'All projects'],
                ],
                'range' => [
                    'label' => 'Looking ahead',
                    'options' => [7, 14, 30],
                    'default' => 14,
                    'labels' => ['7' => '7 days', '14' => '14 days', '30' => '30 days'],
                ],
                'overdue' => self::toggle('Overdue issues'),
                'limit' => ['label' => 'Issues shown', 'options' => [5, 10, 15], 'default' => 10],
                'header' => self::toggle('Title'),
            ],
            self::TypesBreakdown => [
                'header' => self::toggle('Title'),
                'percent' => self::toggle('Percentages'),
                'sort' => [
                    'label' => 'Order',
                    'options' => ['count', 'name'],
                    'default' => 'count',
                    'labels' => ['count' => 'By count', 'name' => 'By name'],
                ],
            ],
            self::WeekSummary => [
                'header' => self::toggle('Title'),
                'average' => self::toggle('Daily average'),
                'best' => self::toggle('Best day'),
                'color' => self::colorOption('accent'),
            ],
            self::QuickActions => [
                'header' => self::toggle('Title'),
                'labels' => self::toggle('Labels'),
                'color' => self::colorOption('accent'),
                'newProject' => self::toggle('New project'),
                'search' => self::toggle('Search'),
                'projects' => self::toggle('Projects'),
                'notifications' => self::toggle('Notifications'),
                'editDashboard' => self::toggle('Edit dashboard'),
                'shortcuts' => self::toggle('Keyboard shortcuts', 'off'),
            ],
            self::Greeting => [
                'name' => self::toggle('Your name'),
                'date' => self::toggle('Date'),
                'summary' => self::toggle('Day in numbers'),
                'icon' => self::toggle('Time of day icon'),
                'color' => self::colorOption('accent'),
            ],
        };
    }

    /** An option that shows or hides a part of the widget. */
    private static function toggle(string $label, string $default = 'on'): array
    {
        return [
            'label' => $label,
            'options' => ['on', 'off'],
            'default' => $default,
            'labels' => ['on' => 'Show', 'off' => 'Hide'],
        ];
    }

    /** A color to pick from the palette of the app; the editor shows swatches. */
    private static function colorOption(string $default): array
    {
        return [
            'label' => 'Color',
            'kind' => 'color',
            'options' => ['accent', 'success', 'warning', 'error', 'info'],
            'default' => $default,
        ];
    }

    /** What every statistic has: its color, its icon and its description. */
    private static function statOptions(string $color): array
    {
        return [
            'color' => self::colorOption($color),
            'icon' => self::toggle('Icon'),
            'description' => self::toggle('Description'),
        ];
    }

    /**
     * The Inertia props the widget draws from, besides `projects` which every
     * dashboard has for the sidebar.
     *
     * @return list<string>
     */
    public function props(): array
    {
        return match ($this) {
            self::StatProjects, self::Projects => ['projects'],
            self::StatOpenIssues, self::StatCritical, self::StatResolution, self::StatOverdue, self::StatAssigned, self::StatDueSoon, self::Completion, self::PriorityBreakdown, self::TypesBreakdown, self::Greeting => ['issueStats'],
            self::Trend => ['productivity_trend'],
            self::Activity => ['activityLogs', 'users', 'issueTypes'],
            self::MyIssues => ['myIssues'],
            self::Deadlines => ['deadlines'],
            self::WeekSummary => ['productivity_trend'],
            self::QuickActions => [],
        };
    }

    /** What the frontend editor reads about this type. */
    public function toCatalogEntry(): array
    {
        return [
            'type' => $this->value,
            'label' => $this->label(),
            'description' => $this->description(),
            'icon' => $this->icon(),
            'variants' => $this->variants(),
            'minWidth' => $this->minWidth(),
            'defaultWidth' => $this->defaultWidth(),
            'minHeight' => $this->minHeight(),
            'defaultHeight' => $this->defaultHeight(),
            'options' => collect($this->options())
                ->map(fn (array $option, string $key) => ['key' => $key] + $option)
                ->values()
                ->all(),
            'props' => $this->props(),
        ];
    }

    /** @return list<array> */
    public static function catalog(): array
    {
        return array_map(fn (self $type) => $type->toCatalogEntry(), self::cases());
    }
}
