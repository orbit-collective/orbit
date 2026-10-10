import { icons } from 'lucide-react';

export type TourPlacement = 'top' | 'right' | 'bottom' | 'left';

export interface TourContext {
    hasProjects: boolean;
}

export interface TourStep {
    id: string;
    title: string;
    description: string;
    /** `data-tour` value of the element to spotlight; omit for a centered card. */
    target?: string;
    /** Preferred side of the target for the popover; flips if it doesn't fit. */
    placement?: TourPlacement;
    /**
     * Page the step lives on. A string is a fixed URL; a function can read the
     * DOM (e.g. the first project's link) and return `null` if unavailable.
     * The tour navigates there when the current page differs.
     */
    visit?: string | (() => string | null);
    /** Target lives in the sidebar, so open the mobile drawer for this step. */
    sidebar?: boolean;
    /** Steps returning `false` are dropped from the tour for this user. */
    icon?: keyof typeof icons;
    when?: (context: TourContext) => boolean;
}

const firstProjectUrl = (): string | null =>
    document
        .querySelector('[data-tour="first-project"]')
        ?.getAttribute('href') ?? null;

const hasProjects = ({ hasProjects }: TourContext) => hasProjects;

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'welcome',
        visit: '/',
        title: 'Welcome to Orbit',
        icon: 'Hand',
        description:
            'Take a 1-minute tour of the places you will use the most. We will jump between pages for you — use the arrows to move around, or close this at any time.',
    },
    {
        id: 'dashboard',
        sidebar: true,
        visit: '/',
        target: 'nav-dashboard',
        placement: 'right',
        title: 'Your dashboard',
        description:
            'Your home base: assigned issues, upcoming deadlines and recent activity across every project, at a glance.',
    },
    {
        id: 'projects',
        sidebar: true,
        visit: '/projects',
        target: 'nav-projects',
        placement: 'right',
        title: 'All your projects',
        description:
            'Every project you belong to lives here. Pick one to see its issues, or browse and search the full list.',
    },
    {
        id: 'new-project',
        sidebar: true,
        visit: '/projects',
        target: 'new-project',
        placement: 'right',
        title: 'Start a new project',
        description:
            'Use the + next to PROJECTS to spin up a workspace for a team, product or sprint in seconds.',
    },
    {
        id: 'open-project',
        sidebar: true,
        visit: '/projects',
        target: 'first-project',
        placement: 'right',
        when: hasProjects,
        title: 'Jump into a project',
        description:
            'Your projects are pinned in the sidebar for quick access. Next we will open the first one.',
    },
    {
        id: 'views',
        visit: firstProjectUrl,
        target: 'page-tabs',
        placement: 'bottom',
        when: hasProjects,
        title: 'Four ways to see your work',
        description:
            'Switch between List, Board, Calendar and Activity. Your choice is remembered, so Orbit always opens the way you like it.',
    },
    {
        id: 'new-issue',
        visit: firstProjectUrl,
        target: 'primary-action',
        placement: 'bottom',
        when: hasProjects,
        title: 'Create an issue',
        description:
            'Capture bugs, tasks and ideas here. Pick a type, set a status, assign someone and add labels.',
    },
    {
        id: 'filters',
        visit: firstProjectUrl,
        target: 'filter-bar',
        placement: 'bottom',
        when: hasProjects,
        title: 'Find anything fast',
        description:
            'Search and filter by status, assignee, label or type, then save the combos you use often as reusable filters.',
    },
    {
        id: 'notifications',
        visit: '/',
        target: 'notifications',
        placement: 'bottom',
        title: 'Stay in the loop',
        description:
            'Mentions, assignments and status changes show up here, so nothing slips past you.',
    },
    {
        id: 'settings',
        sidebar: true,
        visit: '/settings/preferences',
        target: 'settings-nav',
        placement: 'right',
        title: 'Make Orbit yours',
        description:
            'Tune your profile, notifications and theme, then manage labels, issue types, members, roles, integrations and automation for your workspace.',
    },
    {
        id: 'user-menu',
        sidebar: true,
        visit: '/settings/preferences',
        target: 'user-menu',
        placement: 'top',
        title: 'Help is always close',
        description:
            'Open your menu for the docs, the Learn hub, settings and sign out.',
    },
    {
        id: 'done',
        visit: '/',
        title: "You're all set",
        icon: 'Rocket',
        description:
            'That is the essentials. Explore at your own pace — and press the shortcut hints you see next to menu items to move even faster.',
    },
];
