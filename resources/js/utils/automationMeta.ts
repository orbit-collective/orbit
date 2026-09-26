import { icons } from 'lucide-react';

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
    label: string;
}

/**
 * The context Issue.status_changed itself builds (see
 * IssueService::updateIssue()'s dispatch() call) - only the fields it
 * actually passes, nothing else.
 */
const ISSUE_STATUS_CHANGED_FIELDS: ConditionFieldOption[] = [
    { value: 'issue.id', label: 'Issue ID' },
    { value: 'issue.status', label: 'Issue status (new)' },
    { value: 'issue.previousStatus', label: 'Issue status (previous)' },
];

/**
 * The context every github.pull_request.* trigger shares - built once by
 * GithubAutomationContextBuilder::build() and reused by every GitHub call
 * site, so this single list covers all five GitHub trigger types.
 */
const GITHUB_PULL_REQUEST_FIELDS: ConditionFieldOption[] = [
    { value: 'issue.id', label: 'Issue ID' },
    { value: 'issue.title', label: 'Issue title' },
    { value: 'issue.status', label: 'Issue status' },
    { value: 'project.id', label: 'Project ID' },
    { value: 'project.name', label: 'Project name' },
    { value: 'repository.owner', label: 'Repository owner' },
    { value: 'repository.name', label: 'Repository name' },
    { value: 'pullRequest.number', label: 'Pull request number' },
    { value: 'pullRequest.title', label: 'Pull request title' },
    { value: 'pullRequest.url', label: 'Pull request URL' },
    { value: 'pullRequest.sourceBranch', label: 'Pull request source branch' },
    { value: 'pullRequest.targetBranch', label: 'Pull request target branch' },
    { value: 'pullRequest.state', label: 'Pull request state' },
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
