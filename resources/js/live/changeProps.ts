import { IssuePageLooks } from '@/types/Issues';
import { ProjectChange } from '@/types/Live';
import { LiveReload } from './reloadQueue';

/** Change types that alter what an issue list or card shows. */
const ISSUE_LIKE = new Set(['issue', 'comment']);

/** Project settings an issue shows: labels, priorities and issue types. */
const SETTINGS_PROPS: Record<string, string> = {
    labels: 'labels',
    priorities: 'priorities',
    'issue-types': 'issueTypes',
};

/** Someone's access changed: every ability on the page may differ. */
const ACCESS_TYPES = new Set(['members', 'roles']);

const hasType = (changes: ProjectChange[], types: Set<string>) =>
    changes.some((change) => types.has(change.type));

const unique = (props: string[]) => [...new Set(props)];

/** Which props of the project page a batch of changes makes stale. */
export function projectPageReloads(
    changes: ProjectChange[],
    view: IssuePageLooks,
    calendarRange: [string, string] | null,
): LiveReload[] {
    if (hasType(changes, ACCESS_TYPES)) return [{}];

    if (view === 'Activity') return [{ only: ['activityLogs'] }];

    const settings = changes
        .map((change) => SETTINGS_PROPS[change.type])
        .filter(Boolean);
    const projectChanged = changes.some((change) => change.type === 'project');
    const issuesChanged =
        hasType(changes, ISSUE_LIKE) || settings.length > 0 || projectChanged;

    const only = unique([
        ...settings,
        ...(projectChanged ? ['project', 'projects'] : []),
    ]);
    const reloads: LiveReload[] = [];

    if (view === 'Calendar') {
        if (issuesChanged && calendarRange) {
            reloads.push({
                only: ['calendarIssues', 'upcomingDeadlines'],
                data: {
                    calendar_from: calendarRange[0],
                    calendar_to: calendarRange[1],
                },
            });
        }
        if (only.length > 0) reloads.push({ only });

        return reloads;
    }

    if (issuesChanged) only.push('issues');

    return only.length > 0 ? [{ only: unique(only) }] : [];
}

/**
 * Which props of an issue page a batch of changes makes stale.
 * `related` are the ids that matter besides the issue itself (its parent
 * chain and children, shown on the page).
 */
export function issuePageReloads(
    changes: ProjectChange[],
    issueId: number,
    related: number[],
    activityVisible: boolean,
): LiveReload[] {
    if (hasType(changes, ACCESS_TYPES)) return [{}];

    const ids = new Set([issueId, ...related]);
    const concerns = (change: ProjectChange) =>
        change.id === null || ids.has(change.id);

    const only: string[] = [];

    for (const change of changes) {
        if (ISSUE_LIKE.has(change.type) && concerns(change)) {
            only.push('issue', 'ancestors', 'linkedPullRequests');
            if (activityVisible) only.push('activityLogs', 'queryParams');
        } else if (SETTINGS_PROPS[change.type]) {
            only.push('issue', SETTINGS_PROPS[change.type]);
        } else if (change.type === 'project') {
            only.push('project', 'issue');
        }
    }

    return only.length > 0 ? [{ only: unique(only) }] : [];
}

/**
 * Keep only the props the dashboard has loaded: a widget that is hidden never
 * asked for its data, so a refresh must not fetch it either.
 */
function onlyLoaded(props: string[], loaded?: string[]): string[] {
    return loaded ? props.filter((prop) => loaded.includes(prop)) : props;
}

/** The dashboard counters and feed depend on any issue or project change. */
export function dashboardReloads(
    changes: ProjectChange[],
    loaded?: string[],
): LiveReload[] {
    const relevant = changes.some(
        (change) =>
            ISSUE_LIKE.has(change.type) ||
            change.type === 'project' ||
            change.type in SETTINGS_PROPS ||
            ACCESS_TYPES.has(change.type),
    );

    const only = onlyLoaded(
        [
            'issueStats',
            'productivity_trend',
            'projects',
            'activityLogs',
            // The feed draws type icons and status colours from it.
            'issueTypes',
            'myIssues',
            'deadlines',
        ],
        loaded,
    );

    return relevant && only.length > 0 ? [{ only }] : [];
}

/** Was the issue itself deleted by this batch? */
export function deletesIssue(
    changes: ProjectChange[],
    issueId: number,
): boolean {
    return changes.some(
        (change) =>
            change.type === 'issue' &&
            change.action === 'deleted' &&
            change.id === issueId,
    );
}

/**
 * Props that can change under an open page without anyone telling it (no
 * socket): the project's settings, the people and what the user may do.
 */
const SETTINGS_AND_ACCESS = [
    'labels',
    'priorities',
    'issueTypes',
    'users',
    'issueAbilities',
    'projectRole',
];

/** What a project page re-reads on a timer: its view's data and every prop other people can change. */
export function projectPageFallbackReloads(
    view: IssuePageLooks,
    calendarRange: [string, string] | null,
): LiveReload[] {
    if (view === 'Activity') {
        return [{ only: ['activityLogs', ...SETTINGS_AND_ACCESS] }];
    }

    const reloads: LiveReload[] = [
        { only: ['project', 'projects', ...SETTINGS_AND_ACCESS, 'roles'] },
    ];

    if (view === 'Calendar') {
        if (calendarRange) {
            reloads.push({
                only: ['calendarIssues', 'upcomingDeadlines'],
                data: {
                    calendar_from: calendarRange[0],
                    calendar_to: calendarRange[1],
                },
            });
        }
    } else {
        reloads.push({ only: ['issues'] });
    }

    return reloads;
}

/** What an issue page re-reads on a timer. */
export function issuePageFallbackReloads(
    activityVisible: boolean,
): LiveReload[] {
    return [
        {
            only: [
                'issue',
                'ancestors',
                'linkedPullRequests',
                'project',
                ...SETTINGS_AND_ACCESS,
                ...(activityVisible ? ['activityLogs', 'queryParams'] : []),
            ],
        },
    ];
}

/** What the dashboard re-reads on a timer. */
export function dashboardFallbackReloads(loaded?: string[]): LiveReload[] {
    const only = onlyLoaded(
        [
            'issueStats',
            'productivity_trend',
            'projects',
            'activityLogs',
            'users',
            'issueTypes',
            'myIssues',
            'deadlines',
        ],
        loaded,
    );

    return only.length > 0 ? [{ only }] : [];
}
