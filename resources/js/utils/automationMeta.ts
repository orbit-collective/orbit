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
