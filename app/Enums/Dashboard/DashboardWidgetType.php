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

    /** The narrowest the widget may be, in grid columns. */
    public function minWidth(): int
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution => 20,
            default => 30,
        };
    }

    public function defaultWidth(): int
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution => 30,
            self::Trend, self::Activity => 80,
            self::PriorityBreakdown => 120,
            default => 40,
        };
    }

    /** The shortest the widget may be, in rows. */
    public function minHeight(): int
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution => 20,
            self::Trend => 56,
            self::Completion => 60,
            default => 40,
        };
    }

    public function defaultHeight(): int
    {
        return match ($this) {
            self::StatProjects, self::StatOpenIssues, self::StatCritical, self::StatResolution => 32,
            self::Trend, self::Completion => 85,
            self::Activity, self::Projects => 170,
            self::PriorityBreakdown => 60,
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
