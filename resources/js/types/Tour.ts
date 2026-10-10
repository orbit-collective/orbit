import { icons } from 'lucide-react';

export type TourPlacement = 'top' | 'right' | 'bottom' | 'left';

export interface TourContext {
    hasProjects: boolean;
    /** The user already went through (or dismissed) the project chapter. */
    projectOnboardingDone: boolean;
}

/**
 * How the user acts on the spotlighted element. While such a step is active
 * the element stays clickable/typeable (the rest of the page stays blocked).
 *
 * - `click` — the user clicks the target; the arrow does the click for them.
 *   Advances right after the click, unless `advance: 'external'`, in which
 *   case the step waits for `completeWhen` (e.g. the create request landing).
 * - `input` — the user types into the field inside the target. With
 *   `required` the arrow stays disabled until the field has a value.
 * - `free` — the user may poke at the target (e.g. pick a color); the arrow
 *   simply moves on.
 */
export type TourInteraction =
    | { type: 'click'; hint: string; advance?: 'click' | 'external' }
    | { type: 'input'; hint: string; required?: boolean }
    | { type: 'free'; hint: string };

export interface TourRuntime {
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
    icon?: keyof typeof icons;
    /** Makes the target interactive; see `TourInteraction`. */
    interaction?: TourInteraction;
    /** For `external` steps: advance automatically once this turns true. */
    completeWhen?: (runtime: TourRuntime) => boolean;
    /**
     * Step to jump back to if the target disappears (e.g. the user closed
     * the modal the step lives in), so the tour never strands on a step.
     */
    backTo?: string;
    /** Steps returning `false` are dropped from the tour for this user. */
    when?: (context: TourContext) => boolean;
}

const firstProjectUrl = (): string | null =>
    document
        .querySelector('[data-tour="first-project"]')
        ?.getAttribute('href') ?? null;

const hasProjects = ({ hasProjects }: TourContext) => hasProjects;

const needsProjectChapter = ({
    hasProjects,
    projectOnboardingDone,
}: TourContext) => !hasProjects && !projectOnboardingDone;

/**
 * Optional hands-on chapter for accounts with no project yet: walks through
 * the real "New project" form, with the user doing every step themselves.
 * Closing the tour at any point skips whatever is left.
 */
export const PROJECT_CHAPTER_STEPS: TourStep[] = [
    {
        id: 'project-intro',
        visit: '/projects',
        when: needsProjectChapter,
        icon: 'FolderPlus',
        title: 'Create your first project',
        description:
            'Optional, and it takes under a minute. We will point at each field — you do the clicking and typing. Press the arrow to start, or close this to skip.',
    },
    {
        id: 'project-open',
        visit: '/projects',
        sidebar: true,
        target: 'new-project',
        placement: 'right',
        when: needsProjectChapter,
        title: 'Open the new project form',
        description:
            'The + next to PROJECTS opens the form. Everything you set here can be changed later in settings.',
        interaction: {
            type: 'click',
            hint: 'Click the + next to PROJECTS',
        },
    },
    {
        id: 'project-name',
        target: 'project-name',
        placement: 'right',
        backTo: 'project-open',
        when: needsProjectChapter,
        title: 'Name it',
        description:
            'Pick something your team will recognise, like "Mobile App" or "Website redesign".',
        interaction: {
            type: 'input',
            required: true,
            hint: 'Type a project name',
        },
    },
    {
        id: 'project-slug',
        target: 'project-slug',
        placement: 'right',
        backTo: 'project-open',
        when: needsProjectChapter,
        title: 'Give it a short key',
        description:
            'A unique key that identifies the project — usually the first letters of its name, like MOB.',
        interaction: {
            type: 'input',
            required: true,
            hint: 'Type a short key, e.g. MOB',
        },
    },
    {
        id: 'project-description',
        target: 'project-description',
        placement: 'right',
        backTo: 'project-open',
        when: needsProjectChapter,
        title: 'Describe it (optional)',
        description:
            'A sentence about what the project is for helps new teammates get oriented. You can leave it empty.',
        interaction: {
            type: 'input',
            hint: 'Write a short description, or just move on',
        },
    },
    {
        id: 'project-color',
        target: 'project-color',
        placement: 'left',
        backTo: 'project-open',
        when: needsProjectChapter,
        title: 'Pick a color',
        description:
            'The color tags the project across Orbit and shows up in the preview card below.',
        interaction: { type: 'free', hint: 'Click a color you like' },
    },
    {
        id: 'project-submit',
        target: 'project-submit',
        placement: 'top',
        backTo: 'project-open',
        when: needsProjectChapter,
        title: 'Create it',
        description: 'That is everything Orbit needs to set the project up.',
        interaction: {
            type: 'click',
            advance: 'external',
            hint: 'Click "Create project"',
        },
        completeWhen: ({ hasProjects }) => hasProjects,
    },
    {
        id: 'project-created',
        sidebar: true,
        target: 'first-project',
        placement: 'right',
        when: needsProjectChapter,
        icon: 'PartyPopper',
        title: 'Your project is ready',
        description:
            'It now lives in the sidebar. Open it any time to add issues and invite your team.',
    },
];

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
        when: (context) => !needsProjectChapter(context),
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
    ...PROJECT_CHAPTER_STEPS,
    {
        id: 'done',
        visit: '/',
        title: "You're all set",
        icon: 'Rocket',
        description:
            'That is the essentials. Explore at your own pace — and press the shortcut hints you see next to menu items to move even faster.',
    },
];

/**
 * Picks the steps this user still needs, in order. Computed once when the
 * tour starts: creating a project mid-tour flips `hasProjects`, and the
 * list must not change under the user's feet.
 */
export const getTourSteps = (
    context: TourContext,
    onboardingDone: boolean,
): TourStep[] => {
    const source = onboardingDone ? PROJECT_CHAPTER_STEPS : TOUR_STEPS;

    return source.filter((step) => !step.when || step.when(context));
};
