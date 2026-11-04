type ContainerState =
    | 'running'
    | 'exited'
    | 'restarting'
    | 'paused'
    | 'created'
    | 'dead'
    | string;

export interface PortalContainer {
    id: string;
    service: string;
    name: string;
    image: string;
    state: ContainerState;
    status: string;
    health: 'healthy' | 'unhealthy' | 'starting' | null;
    /** ISO time the container (re)started; null when it is not running. */
    startedAt: string | null;
    /** Uptime at the moment the server answered. */
    uptimeSeconds: number;
    restartCount: number;
}

export interface PortalContainers {
    available: boolean;
    error: string | null;
    containers: PortalContainer[];
}

type ErrorLevel = 'error' | 'critical' | 'alert' | 'emergency';

export interface PortalErrorEntry {
    id: string;
    level: ErrorLevel;
    message: string;
    loggedAt: string;
    trace: string[];
}

interface PortalDailyErrors {
    /** YYYY-MM-DD */
    date: string;
    /** Short weekday, e.g. "Mon". */
    label: string;
    warning: number;
    error: number;
    critical: number;
    total: number;
}

export interface PortalErrorLog {
    entries: Paginated<PortalErrorEntry>;
    daily: PortalDailyErrors[];
}

export interface PortalTotals {
    users: number;
    projects: number;
    issues: number;
    comments: number;
    newIssues: number;
    newUsers: number;
    recentDays: number;
    categories: { todo: number; in_progress: number; done: number };
}

export interface PortalUser {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    projectsCount: number;
    createdAt: string | null;
}

export interface PortalProject {
    id: number;
    name: string;
    slug: string;
    color: string | null;
    membersCount: number;
    issues: { todo: number; in_progress: number; done: number };
    createdAt: string | null;
}

/** Laravel's length-aware paginator as Inertia serialises it. */
export interface Paginated<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    per_page: number;
}

export type PortalChangeKind = 'users' | 'projects' | 'issues' | 'errors';

export interface DeveloperPortalChangedPayload {
    kinds: PortalChangeKind[];
}
