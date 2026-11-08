<?php

namespace App\Enums\Dashboard;

/**
 * Every widget the dashboard can show, with what the layout editor needs to
 * know about it: its variants, the widths it may take, the options it has and
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

    /** Widths, in twelfths of the dashboard, the widgets may take. */
    public const SPANS = [3, 4, 6, 8, 12];

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
        };
    }

    /** @return list<string> the first one is the default */
    public function variants(): array
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution => ['default', 'vivid', 'accent'],
            self::Completion => ['bars', 'ring'],
            self::Projects => ['cards', 'compact'],
            default => ['default'],
        };
    }

    /** @return list<int> allowed widths */
    public function spans(): array
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution => [3, 4, 6, 12],
            self::Trend, self::Activity => [6, 8, 12],
            default => [4, 6, 12],
        };
    }

    public function defaultSpan(): int
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution => 3,
            self::Trend, self::Activity => 8,
            self::PriorityBreakdown => 12,
            default => 4,
        };
    }

    /**
     * Options of the widget, keyed by name: label, the allowed values and the
     * default one.
     *
     * @return array<string, array{label: string, options: list<int|string>, default: int|string}>
     */
    public function options(): array
    {
        return match ($this) {
            self::Projects => [
                'limit' => ['label' => 'Projects shown', 'options' => [3, 5, 10], 'default' => 3],
            ],
            default => [],
        };
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
            self::StatOpenIssues, self::StatCritical, self::StatResolution, self::Completion, self::PriorityBreakdown => ['issueStats'],
            self::Trend => ['productivity_trend'],
            self::Activity => ['activityLogs', 'users', 'issueTypes'],
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
            'spans' => $this->spans(),
            'defaultSpan' => $this->defaultSpan(),
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
