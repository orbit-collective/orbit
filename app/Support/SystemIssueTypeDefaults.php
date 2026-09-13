<?php

namespace App\Support;

use App\Enums\IssueFieldType as F;
use App\Enums\WorkflowStatusCategory as C;

/**
 * What each system issue type ships with out of the box: its own workflow
 * statuses, which types it accepts as sub-issues, a starter template, and
 * the custom fields that make the type actually mean what its name says.
 *
 * Kept out of IssueTypeService purely for readability - it is data, not
 * behaviour. Transitions are derived from the status order rather than
 * listed by hand, see IssueTypeService::defaultTransitionPairs().
 *
 * Labels used by templates must exist in LabelService::SYSTEM_LABELS.
 *
 * No seeded field is is_required: quick-add creates an issue from a title
 * alone, and a required field would make that fail for the whole type. Marking
 * one required is a deliberate per-project choice, made from Settings.
 */
final class SystemIssueTypeDefaults
{
    /**
     * Fallback workflow for a type with no statuses of its own (and for any
     * custom type an owner creates).
     */
    public const array DEFAULT_STATUSES = [
        ['name' => 'To Do', 'color' => '#94a3b8', 'category' => C::TODO],
        ['name' => 'In Progress', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
        ['name' => 'Done', 'color' => '#22c55e', 'category' => C::DONE],
    ];

    /** @return array<string, array<string, mixed>> keyed by issue type name */
    public static function all(): array
    {
        return [
            'Task' => [
                'statuses' => self::DEFAULT_STATUSES,
                'allows_children' => true,
                'allowed_children' => ['Chore', 'Bug'],
                'template' => [
                    'name' => 'Standard task',
                    'description' => "## What needs doing\n\n## Definition of done\n",
                    'priority' => 'medium',
                    'labels' => ['chore'],
                ],
                'fields' => [
                    ['label' => 'Estimate (hours)', 'type' => F::NUMBER],
                    ['label' => 'Blocked by', 'type' => F::TEXT, 'placeholder' => 'What is holding this up?'],
                ],
            ],

            'Feature' => [
                'statuses' => [
                    ['name' => 'Backlog', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Designing', 'color' => '#ec4899', 'category' => C::IN_PROGRESS],
                    ['name' => 'Building', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'In Review', 'color' => '#6366f1', 'category' => C::IN_PROGRESS],
                    ['name' => 'Shipped', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => true,
                'allowed_children' => ['Story', 'Task', 'Bug', 'Design', 'Documentation'],
                'template' => [
                    'name' => 'Feature brief',
                    'description' => "## Problem\n\n## Proposed solution\n\n## Out of scope\n",
                    'priority' => 'medium',
                    'labels' => ['feature'],
                ],
                'fields' => [
                    ['label' => 'Problem statement', 'type' => F::TEXTAREA],
                    ['label' => 'Success metric', 'type' => F::TEXT, 'placeholder' => 'How will we know it worked?'],
                    ['label' => 'Target release', 'type' => F::TEXT],
                ],
            ],

            'Story' => [
                'statuses' => [
                    ['name' => 'Backlog', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Ready', 'color' => '#38bdf8', 'category' => C::TODO],
                    ['name' => 'In Progress', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'In Review', 'color' => '#6366f1', 'category' => C::IN_PROGRESS],
                    ['name' => 'Done', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => true,
                'allowed_children' => ['Task', 'Bug', 'Chore'],
                'template' => [
                    'name' => 'User story',
                    'description' => "**As a** \n**I want** \n**So that** \n\n## Acceptance criteria\n- [ ] \n",
                    'priority' => 'medium',
                    'labels' => ['feature', 'ux'],
                ],
                'fields' => [
                    ['label' => 'User story', 'type' => F::TEXTAREA, 'placeholder' => 'As a … I want … so that …'],
                    ['label' => 'Acceptance criteria', 'type' => F::TEXTAREA],
                    ['label' => 'Story points', 'type' => F::SELECT, 'options' => ['1', '2', '3', '5', '8', '13']],
                ],
            ],

            'Bug' => [
                'statuses' => [
                    ['name' => 'Reported', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Triaged', 'color' => '#38bdf8', 'category' => C::TODO],
                    ['name' => 'Fixing', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'In Review', 'color' => '#6366f1', 'category' => C::IN_PROGRESS],
                    ['name' => 'Fixed', 'color' => '#22c55e', 'category' => C::DONE],
                    ['name' => "Won't Fix", 'color' => '#78716c', 'category' => C::DONE],
                ],
                'allows_children' => false,
                'template' => [
                    'name' => 'Bug report',
                    'description' => "## Steps to reproduce\n1. \n\n## Expected\n\n## Actual\n",
                    'priority' => 'high',
                    'labels' => ['bug'],
                ],
                'fields' => [
                    ['label' => 'Steps to reproduce', 'type' => F::TEXTAREA],
                    ['label' => 'Expected result', 'type' => F::TEXTAREA],
                    ['label' => 'Actual result', 'type' => F::TEXTAREA],
                    ['label' => 'Severity', 'type' => F::SELECT, 'options' => ['Low', 'Medium', 'High', 'Critical']],
                    ['label' => 'Environment', 'type' => F::SELECT, 'options' => ['Production', 'Staging', 'Local']],
                    ['label' => 'Regression', 'type' => F::CHECKBOX],
                ],
            ],

            'Epic' => [
                'statuses' => [
                    ['name' => 'Planned', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'In Progress', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'Done', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => true,
                'allowed_children' => ['Story', 'Feature', 'Task', 'Bug', 'Spike', 'Design', 'Documentation', 'Improvement', 'Chore'],
                'template' => [
                    'name' => 'Epic brief',
                    'description' => "## Goal\n\n## Why now\n\n## Scope\n\n## Not in scope\n",
                    'priority' => 'medium',
                    'labels' => ['feature'],
                ],
                'fields' => [
                    ['label' => 'Goal', 'type' => F::TEXTAREA],
                    ['label' => 'Target quarter', 'type' => F::TEXT, 'placeholder' => 'e.g. Q3 2026'],
                    ['label' => 'Stakeholder', 'type' => F::TEXT],
                ],
            ],

            'Spike' => [
                'statuses' => [
                    ['name' => 'Open', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Investigating', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'Concluded', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => false,
                'template' => [
                    'name' => 'Spike',
                    'description' => "## Question\n\n## Timebox\n\n## Findings\n",
                    'priority' => 'medium',
                    'labels' => [],
                ],
                'fields' => [
                    ['label' => 'Question to answer', 'type' => F::TEXTAREA],
                    ['label' => 'Timebox (days)', 'type' => F::NUMBER],
                    ['label' => 'Outcome', 'type' => F::TEXTAREA],
                ],
            ],

            'Chore' => [
                'statuses' => self::DEFAULT_STATUSES,
                'allows_children' => false,
                'template' => [
                    'name' => 'Chore',
                    'description' => "## What\n\n## Why now\n",
                    'priority' => 'low',
                    'labels' => ['chore'],
                ],
                'fields' => [
                    ['label' => 'Reason', 'type' => F::TEXT, 'placeholder' => 'Why does this need doing?'],
                    ['label' => 'Recurring', 'type' => F::CHECKBOX],
                ],
            ],

            'Improvement' => [
                'statuses' => [
                    ['name' => 'Proposed', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Accepted', 'color' => '#38bdf8', 'category' => C::TODO],
                    ['name' => 'In Progress', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'Done', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => false,
                'template' => [
                    'name' => 'Improvement',
                    'description' => "## Today\n\n## Proposed\n\n## Impact\n",
                    'priority' => 'low',
                    'labels' => ['performance'],
                ],
                'fields' => [
                    ['label' => 'Current behaviour', 'type' => F::TEXTAREA],
                    ['label' => 'Proposed behaviour', 'type' => F::TEXTAREA],
                ],
            ],

            'Incident' => [
                'statuses' => [
                    ['name' => 'Detected', 'color' => '#ef4444', 'category' => C::TODO],
                    ['name' => 'Mitigating', 'color' => '#f97316', 'category' => C::IN_PROGRESS],
                    ['name' => 'Monitoring', 'color' => '#eab308', 'category' => C::IN_PROGRESS],
                    ['name' => 'Resolved', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => true,
                'allowed_children' => ['Task', 'Bug', 'Security'],
                'template' => [
                    'name' => 'Incident report',
                    'description' => "## Impact\n\n## Timeline\n\n## Mitigation\n\n## Follow-ups\n",
                    'priority' => 'high',
                    'labels' => ['bug'],
                ],
                'fields' => [
                    ['label' => 'Impact', 'type' => F::TEXTAREA],
                    ['label' => 'Severity', 'type' => F::SELECT, 'options' => ['SEV1', 'SEV2', 'SEV3', 'SEV4']],
                    ['label' => 'Detected at', 'type' => F::DATE],
                    ['label' => 'Root cause', 'type' => F::TEXTAREA],
                    ['label' => 'Postmortem link', 'type' => F::URL],
                ],
            ],

            'Security' => [
                'statuses' => [
                    ['name' => 'Reported', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Assessing', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'Patching', 'color' => '#f97316', 'category' => C::IN_PROGRESS],
                    ['name' => 'Verified', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => false,
                'template' => [
                    'name' => 'Security finding',
                    'description' => "## Summary\n\n## Affected versions\n\n## Remediation\n",
                    'priority' => 'high',
                    'labels' => ['bug'],
                ],
                'fields' => [
                    ['label' => 'Severity', 'type' => F::SELECT, 'options' => ['Low', 'Medium', 'High', 'Critical']],
                    ['label' => 'CVE or advisory', 'type' => F::TEXT],
                    ['label' => 'Affected component', 'type' => F::TEXT],
                    ['label' => 'Disclosure date', 'type' => F::DATE],
                ],
            ],

            'Infrastructure' => [
                'statuses' => [
                    ['name' => 'Planned', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Provisioning', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'Verifying', 'color' => '#6366f1', 'category' => C::IN_PROGRESS],
                    ['name' => 'Done', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => false,
                'template' => [
                    'name' => 'Infrastructure change',
                    'description' => "## Change\n\n## Blast radius\n\n## Rollback plan\n",
                    'priority' => 'medium',
                    'labels' => ['chore'],
                ],
                'fields' => [
                    ['label' => 'Environment', 'type' => F::SELECT, 'options' => ['Production', 'Staging', 'Development']],
                    ['label' => 'Change window', 'type' => F::DATE],
                    ['label' => 'Rollback plan', 'type' => F::TEXTAREA],
                    ['label' => 'Needs downtime', 'type' => F::CHECKBOX],
                ],
            ],

            'Research' => [
                'statuses' => [
                    ['name' => 'Open', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Researching', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'Summarised', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => true,
                'allowed_children' => ['Spike', 'Experiment', 'Documentation'],
                'template' => [
                    'name' => 'Research note',
                    'description' => "## Question\n\n## Sources\n\n## Findings\n",
                    'priority' => 'low',
                    'labels' => [],
                ],
                'fields' => [
                    ['label' => 'Question', 'type' => F::TEXTAREA],
                    ['label' => 'Sources', 'type' => F::TEXTAREA],
                    ['label' => 'Findings', 'type' => F::TEXTAREA],
                ],
            ],

            'Experiment' => [
                'statuses' => [
                    ['name' => 'Designed', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Running', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'Analysing', 'color' => '#6366f1', 'category' => C::IN_PROGRESS],
                    ['name' => 'Concluded', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => false,
                'template' => [
                    'name' => 'Experiment',
                    'description' => "## Hypothesis\n\n## Method\n\n## Result\n",
                    'priority' => 'low',
                    'labels' => [],
                ],
                'fields' => [
                    ['label' => 'Hypothesis', 'type' => F::TEXTAREA],
                    ['label' => 'Metric', 'type' => F::TEXT],
                    ['label' => 'Result', 'type' => F::SELECT, 'options' => ['Inconclusive', 'Confirmed', 'Rejected']],
                ],
            ],

            'Documentation' => [
                'statuses' => [
                    ['name' => 'Outlined', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Drafting', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'In Review', 'color' => '#6366f1', 'category' => C::IN_PROGRESS],
                    ['name' => 'Published', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => false,
                'template' => [
                    'name' => 'Doc page',
                    'description' => "## Audience\n\n## Outline\n",
                    'priority' => 'low',
                    'labels' => [],
                ],
                'fields' => [
                    ['label' => 'Audience', 'type' => F::TEXT, 'placeholder' => 'Who is this for?'],
                    ['label' => 'Doc link', 'type' => F::URL],
                ],
            ],

            'Design' => [
                'statuses' => [
                    ['name' => 'Brief', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Exploring', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'In Review', 'color' => '#6366f1', 'category' => C::IN_PROGRESS],
                    ['name' => 'Approved', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => false,
                'template' => [
                    'name' => 'Design brief',
                    'description' => "## Goal\n\n## Constraints\n\n## References\n",
                    'priority' => 'medium',
                    'labels' => ['design', 'ux'],
                ],
                'fields' => [
                    ['label' => 'Design link', 'type' => F::URL, 'placeholder' => 'Figma, Penpot, …'],
                    ['label' => 'Stage', 'type' => F::SELECT, 'options' => ['Wireframe', 'Hi-fi', 'Prototype']],
                ],
            ],

            'AI Task' => [
                'statuses' => [
                    ['name' => 'Queued', 'color' => '#94a3b8', 'category' => C::TODO],
                    ['name' => 'Running', 'color' => '#f59e0b', 'category' => C::IN_PROGRESS],
                    ['name' => 'Needs Review', 'color' => '#6366f1', 'category' => C::IN_PROGRESS],
                    ['name' => 'Accepted', 'color' => '#22c55e', 'category' => C::DONE],
                ],
                'allows_children' => false,
                'template' => [
                    'name' => 'AI task',
                    'description' => "## Prompt\n\n## Constraints\n\n## Review notes\n",
                    'priority' => 'medium',
                    'labels' => [],
                ],
                'fields' => [
                    ['label' => 'Prompt', 'type' => F::TEXTAREA],
                    ['label' => 'Model', 'type' => F::TEXT],
                    ['label' => 'Human review required', 'type' => F::CHECKBOX],
                ],
            ],
        ];
    }
}
