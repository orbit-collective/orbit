<?php

declare(strict_types=1);

return [
    'widgets' => [
        'stat' => [
            'label' => 'Statistic',
            'description' => 'One number: pick what it counts, how it is shown and its style',
            'options' => [
                'metric' => [
                    'label' => 'Shows',
                    'values' => [
                        'projects' => 'Active Projects',
                        'open_issues' => 'Open Issues',
                        'critical' => 'Critical Tasks',
                        'resolution' => 'Resolution Rate',
                        'overdue' => 'Overdue Issues',
                        'assigned' => 'Assigned to Me',
                        'due_soon' => 'Due Soon',
                    ],
                ],
                'count' => [
                    'label' => 'Count',
                    'values' => [
                        'open' => 'Open',
                        'todo' => 'To do',
                        'in_progress' => 'In progress',
                        'done' => 'Done',
                        'all' => 'All',
                    ],
                ],
                'show' => [
                    'label' => 'As',
                    'values' => [
                        'value' => 'Number',
                        'fraction' => 'Part / whole',
                        'percent' => 'Percent',
                    ],
                ],
                'color' => [
                    'label' => 'Color',
                ],
                'icon' => [
                    'label' => 'Icon',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'description' => [
                    'label' => 'Description',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
            ],
        ],
        'trend' => [
            'label' => 'Productivity Trend',
            'description' => 'Issues created and resolved over time',
            'options' => [
                'header' => [
                    'label' => 'Title',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'grid' => [
                    'label' => 'Grid lines',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'values' => [
                    'label' => 'Values',
                    'values' => [
                        'hover' => 'On hover',
                        'always' => 'Always',
                    ],
                ],
                'today' => [
                    'label' => 'Highlight today',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'color' => [
                    'label' => 'Color',
                ],
            ],
        ],
        'completion' => [
            'label' => 'Completion Ratio',
            'description' => 'To do, in progress and done at a glance',
            'options' => [
                'header' => [
                    'label' => 'Title',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'tier' => [
                    'label' => 'Status label',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
            ],
        ],
        'priority_breakdown' => [
            'label' => 'Priority Breakdown',
            'description' => 'Your issues grouped by priority',
            'options' => [
                'header' => [
                    'label' => 'Title',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'noPriority' => [
                    'label' => 'No priority',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'percent' => [
                    'label' => 'Percentages',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'sort' => [
                    'label' => 'Order',
                    'values' => [
                        'priority' => 'By priority',
                        'count' => 'By count',
                    ],
                ],
            ],
        ],
        'activity' => [
            'label' => 'Recent Work Activity',
            'description' => 'Latest changes across your projects',
            'options' => [
                'header' => [
                    'label' => 'Title',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'pagination' => [
                    'label' => 'Pagination',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
            ],
        ],
        'projects' => [
            'label' => 'Projects Directory',
            'description' => 'Your projects with their progress',
            'options' => [
                'limit' => [
                    'label' => 'Projects shown',
                ],
                'sort' => [
                    'label' => 'Order',
                    'values' => [
                        'latest' => 'Latest',
                        'name' => 'Name',
                        'progress' => 'Progress',
                        'issues' => 'Issues',
                    ],
                ],
                'header' => [
                    'label' => 'Title',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'viewAll' => [
                    'label' => 'View all link',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
            ],
        ],
        'my_issues' => [
            'label' => 'My Issues',
            'description' => 'The open issues assigned to you',
            'options' => [
                'limit' => [
                    'label' => 'Issues shown',
                ],
                'sort' => [
                    'label' => 'Order',
                    'values' => [
                        'priority' => 'Priority',
                        'due' => 'Due date',
                        'updated' => 'Last updated',
                    ],
                ],
                'header' => [
                    'label' => 'Title',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'type' => [
                    'label' => 'Issue type',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'project' => [
                    'label' => 'Project',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'priority' => [
                    'label' => 'Priority',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'due' => [
                    'label' => 'Due date',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
            ],
        ],
        'deadlines' => [
            'label' => 'Upcoming Deadlines',
            'description' => 'What is due next, and what is late',
            'options' => [
                'scope' => [
                    'label' => 'Whose issues',
                    'values' => [
                        'mine' => 'Assigned to Me',
                        'all' => 'All projects',
                    ],
                ],
                'range' => [
                    'label' => 'Looking ahead',
                    'values' => [
                        '7' => '7 days',
                        '14' => '14 days',
                        '30' => '30 days',
                    ],
                ],
                'overdue' => [
                    'label' => 'Overdue issues',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'limit' => [
                    'label' => 'Issues shown',
                ],
                'header' => [
                    'label' => 'Title',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
            ],
        ],
        'types_breakdown' => [
            'label' => 'Issue Types',
            'description' => 'Your issues grouped by type',
            'options' => [
                'header' => [
                    'label' => 'Title',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'percent' => [
                    'label' => 'Percentages',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'sort' => [
                    'label' => 'Order',
                    'values' => [
                        'count' => 'By count',
                        'name' => 'By name',
                    ],
                ],
            ],
        ],
        'week_summary' => [
            'label' => 'Week Summary',
            'description' => 'This week at a glance',
            'options' => [
                'header' => [
                    'label' => 'Title',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'average' => [
                    'label' => 'Daily average',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'best' => [
                    'label' => 'Best day',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'color' => [
                    'label' => 'Color',
                ],
            ],
        ],
        'quick_actions' => [
            'label' => 'Quick Actions',
            'description' => 'Shortcuts to what you do often',
            'options' => [
                'header' => [
                    'label' => 'Title',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'labels' => [
                    'label' => 'Labels',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'color' => [
                    'label' => 'Color',
                ],
                'newProject' => [
                    'label' => 'New project',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'search' => [
                    'label' => 'Search',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'projects' => [
                    'label' => 'Projects',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'notifications' => [
                    'label' => 'Notifications',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'editDashboard' => [
                    'label' => 'Edit dashboard',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'shortcuts' => [
                    'label' => 'Keyboard shortcuts',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
            ],
        ],
        'greeting' => [
            'label' => 'Welcome',
            'description' => 'A greeting with your day in numbers',
            'options' => [
                'name' => [
                    'label' => 'Your name',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'date' => [
                    'label' => 'Date',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'summary' => [
                    'label' => 'Day in numbers',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'icon' => [
                    'label' => 'Time of day icon',
                    'values' => [
                        'on' => 'Show',
                        'off' => 'Hide',
                    ],
                ],
                'color' => [
                    'label' => 'Color',
                ],
            ],
        ],
    ],
    'colors' => [
        'auto' => 'Automatic',
        'accent' => 'Accent',
        'success' => 'Success',
        'warning' => 'Warning',
        'error' => 'Error',
        'info' => 'Info',
    ],
    'variants' => [
        'default' => 'Default',
        'vivid' => 'Vivid',
        'accent' => 'Accent',
        'glass' => 'Glass',
        'outline' => 'Outline',
        'bars' => 'Bars',
        'line' => 'Line',
        'area' => 'Area',
        'ring' => 'Ring',
        'stacked' => 'Stacked',
        'bar' => 'Bar',
        'list' => 'List',
        'donut' => 'Donut',
        'feed' => 'Feed',
        'compact' => 'Compact',
        'cards' => 'Cards',
        'grid' => 'Grid',
        'timeline' => 'Timeline',
        'week' => 'Week',
        'numbers' => 'Numbers',
        'sparkline' => 'Sparkline',
        'banner' => 'Banner',
        'minimal' => 'Minimal',
    ],
    'widths' => [
        '120' => 'Full',
    ],
];
