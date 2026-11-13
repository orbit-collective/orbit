import type { icons } from 'lucide-react';

export interface AutomationNodeMeta {
    icon: keyof typeof icons;
    color: string;
}

/**
 * Purely visual metadata (icon + tint) for each trigger/action type - kept
 * separate from the {value, label} pairs the backend sends
 * (SettingsController::mapAutomationTriggerTypes()/mapAutomationActionTypes())
 * since the backend owns the source of truth for which types exist, this
 * file only owns how they look. A type with no entry here still renders
 * (falls back to a neutral zap icon) - a new trigger/action type added
 * server-side never breaks this UI, it just looks generic until given its
 * own entry.
 */
export const TRIGGER_META: Record<string, AutomationNodeMeta> = {
    'issue.status_changed': {
        icon: 'ArrowRightLeft',
        color: 'var(--info-color)',
    },
    'github.pull_request.opened': {
        icon: 'GitPullRequest',
        color: 'var(--success-color)',
    },
    'github.pull_request.reopened': {
        icon: 'RotateCcw',
        color: 'var(--info-color)',
    },
    'github.pull_request.closed': {
        icon: 'GitPullRequestClosed',
        color: 'var(--error-color)',
    },
    'github.pull_request.merged': {
        icon: 'GitMerge',
        color: 'var(--accent-color)',
    },
    'github.pull_request.synchronized': {
        icon: 'RefreshCw',
        color: 'var(--pending-color)',
    },
};

export const ACTION_META: Record<string, AutomationNodeMeta> = {
    change_status: { icon: 'Workflow', color: 'var(--info-color)' },
    change_priority: { icon: 'Flame', color: 'var(--warning-color)' },
    assign_user: { icon: 'UserPlus', color: 'var(--accent-color)' },
    add_label: { icon: 'Tag', color: 'var(--success-color)' },
    remove_label: { icon: 'TagX', color: 'var(--error-color)' },
    send_notification: { icon: 'Bell', color: 'var(--pending-color)' },
};

const FALLBACK_META: AutomationNodeMeta = {
    icon: 'Zap',
    color: 'var(--text-gray-color)',
};

export function triggerMeta(type: string): AutomationNodeMeta {
    return TRIGGER_META[type] ?? FALLBACK_META;
}

export function actionMeta(type: string): AutomationNodeMeta {
    return ACTION_META[type] ?? FALLBACK_META;
}

export interface ConditionFieldOption {
    value: string;
    /** A translation key (`automation_meta.fields.*`), translated at render. */
    label: string;
}

/**
 * The context Issue.status_changed itself builds (see
 * IssueService::updateIssue()'s dispatch() call) - only the fields it
 * actually passes, nothing else.
 */
const ISSUE_STATUS_CHANGED_FIELDS: ConditionFieldOption[] = [
    {
        value: 'issue.id',
        label: 'automation_meta.fields.status_changed.issue_id',
    },
    {
        value: 'issue.status',
        label: 'automation_meta.fields.status_changed.issue_status',
    },
    {
        value: 'issue.previousStatus',
        label: 'automation_meta.fields.status_changed.issue_previousStatus',
    },
    {
        value: 'issue.category',
        label: 'automation_meta.fields.status_changed.issue_category',
    },
    {
        value: 'issue.previousCategory',
        label: 'automation_meta.fields.status_changed.issue_previousCategory',
    },
];

/** Condition fields whose value is a status category rather than free text. */
export const CATEGORY_CONDITION_FIELDS = [
    'issue.category',
    'issue.previousCategory',
];

/** Condition fields whose value is the name of one of the project's statuses. */
export const STATUS_NAME_CONDITION_FIELDS = [
    'issue.status',
    'issue.previousStatus',
];

/**
 * The context every github.pull_request.* trigger shares - built once by
 * GithubAutomationContextBuilder::build() and reused by every GitHub call
 * site, so this single list covers all five GitHub trigger types.
 */
const GITHUB_PULL_REQUEST_FIELDS: ConditionFieldOption[] = [
    {
        value: 'issue.id',
        label: 'automation_meta.fields.pull_request.issue_id',
    },
    {
        value: 'issue.title',
        label: 'automation_meta.fields.pull_request.issue_title',
    },
    {
        value: 'issue.status',
        label: 'automation_meta.fields.pull_request.issue_status',
    },
    {
        value: 'issue.category',
        label: 'automation_meta.fields.pull_request.issue_category',
    },
    {
        value: 'project.id',
        label: 'automation_meta.fields.pull_request.project_id',
    },
    {
        value: 'project.name',
        label: 'automation_meta.fields.pull_request.project_name',
    },
    {
        value: 'repository.owner',
        label: 'automation_meta.fields.pull_request.repository_owner',
    },
    {
        value: 'repository.name',
        label: 'automation_meta.fields.pull_request.repository_name',
    },
    {
        value: 'pullRequest.number',
        label: 'automation_meta.fields.pull_request.pullRequest_number',
    },
    {
        value: 'pullRequest.title',
        label: 'automation_meta.fields.pull_request.pullRequest_title',
    },
    {
        value: 'pullRequest.url',
        label: 'automation_meta.fields.pull_request.pullRequest_url',
    },
    {
        value: 'pullRequest.sourceBranch',
        label: 'automation_meta.fields.pull_request.pullRequest_sourceBranch',
    },
    {
        value: 'pullRequest.targetBranch',
        label: 'automation_meta.fields.pull_request.pullRequest_targetBranch',
    },
    {
        value: 'pullRequest.state',
        label: 'automation_meta.fields.pull_request.pullRequest_state',
    },
];

/**
 * Every field a condition can actually reference for the given trigger -
 * lets the rule builder offer a dropdown instead of asking someone to guess
 * (and correctly spell) a dotted context path like `pullRequest.title`. Kept
 * here, next to the icon metadata, since both describe the same trigger
 * types and tend to change together when a new trigger is added.
 */
export function conditionFieldsForTrigger(
    triggerType: string,
): ConditionFieldOption[] {
    return triggerType === 'issue.status_changed'
        ? ISSUE_STATUS_CHANGED_FIELDS
        : GITHUB_PULL_REQUEST_FIELDS;
}

/**
 * Name of a trigger/action type. The server sends it in English; the
 * translation (`followup2_automation.<kind>.<type>`) is looked up by the type
 * and the server text stays as the fallback for a type without one.
 */
export function automationTypeLabel(
    t: (key: string) => string,
    kind: 'triggers' | 'actions',
    type: string,
    fallback: string,
): string {
    const key = `followup2_automation.${kind}.${type.replace(/\./g, '_')}`;
    const translated = t(key);

    return translated === key ? fallback : translated;
}
