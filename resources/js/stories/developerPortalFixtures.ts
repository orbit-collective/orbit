import {
    Paginated,
    PortalContainers,
    PortalErrorLog,
    PortalProject,
    PortalTotals,
    PortalUser,
} from '@/types/DeveloperPortal';

const hoursAgo = (hours: number) =>
    new Date(Date.now() - hours * 3_600_000).toISOString();

export const portalContainers: PortalContainers = {
    available: true,
    error: null,
    containers: [
        {
            id: 'a1',
            service: 'app',
            name: 'orbit-app-1',
            image: 'orbit-app',
            state: 'running',
            status: 'Up 3 hours',
            health: null,
            startedAt: hoursAgo(3),
            uptimeSeconds: 3 * 3600,
            restartCount: 0,
        },
        {
            id: 'b2',
            service: 'redis',
            name: 'orbit-redis-1',
            image: 'redis:7-alpine',
            state: 'running',
            status: 'Up 2 days (healthy)',
            health: 'healthy',
            startedAt: hoursAgo(50),
            uptimeSeconds: 50 * 3600,
            restartCount: 1,
        },
        {
            id: 'c3',
            service: 'backup',
            name: 'orbit-backup-1',
            image: 'orbit-backup',
            state: 'exited',
            status: 'Exited (1) a minute ago',
            health: null,
            startedAt: null,
            uptimeSeconds: 0,
            restartCount: 0,
        },
    ],
};

const day = (
    offset: number,
    label: string,
    counts: [number, number, number],
) => {
    const date = new Date(Date.now() - offset * 86_400_000);

    return {
        date: date.toISOString().slice(0, 10),
        label,
        warning: counts[0],
        error: counts[1],
        critical: counts[2],
        total: counts[0] + counts[1] + counts[2],
    };
};

export const portalErrorLog: PortalErrorLog = {
    daily: [
        day(2, 'Mon', [1, 2, 0]),
        day(1, 'Tue', [0, 1, 0]),
        day(0, 'Wed', [3, 4, 1]),
    ],
    entries: [
        {
            id: 'e1',
            level: 'critical',
            message: 'SQLSTATE[HY000]: disk I/O error',
            loggedAt: '2026-11-04 10:15:00',
            trace: [
                '#0 /app/vendor/laravel/framework/Connection.php(1): run()',
            ],
        },
        {
            id: 'e2',
            level: 'error',
            message: 'Undefined array key "foo"',
            loggedAt: '2026-11-04 09:00:00',
            trace: [],
        },
    ],
};

export const portalTotals: PortalTotals = {
    users: 12,
    projects: 4,
    issues: 100,
    comments: 37,
    newIssues: 9,
    newUsers: 2,
    recentDays: 7,
    categories: { todo: 40, in_progress: 35, done: 25 },
};

export const paginated = <T>(data: T[], total = data.length): Paginated<T> => ({
    data,
    total,
    from: data.length ? 1 : null,
    to: data.length ? data.length : null,
    current_page: 1,
    per_page: 10,
    links: [
        { url: null, label: '&laquo; Previous', active: false },
        { url: '/settings/dev-portal?users_page=1', label: '1', active: true },
        { url: null, label: 'Next &raquo;', active: false },
    ],
});

export const portalUsers: PortalUser[] = [
    {
        id: 1,
        name: 'Ada Lovelace',
        email: 'ada@example.test',
        avatar: null,
        projectsCount: 2,
        createdAt: '2026-10-01T10:00:00Z',
    },
    {
        id: 2,
        name: 'Grace Hopper',
        email: 'grace@example.test',
        avatar: null,
        projectsCount: 1,
        createdAt: null,
    },
];

export const portalProjects: PortalProject[] = [
    {
        id: 1,
        name: 'Orbit',
        slug: 'orbit',
        color: '#8844da',
        membersCount: 3,
        issues: { todo: 4, in_progress: 2, done: 9 },
        createdAt: '2026-10-01T10:00:00Z',
    },
    {
        id: 2,
        name: 'Website',
        slug: 'website',
        color: null,
        membersCount: 1,
        issues: { todo: 0, in_progress: 0, done: 0 },
        createdAt: null,
    },
];
