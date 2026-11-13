import type { icons } from 'lucide-react';

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
    | {
          type: 'click';
          hint: string /* translation key */;
          advance?: 'click' | 'external';
      }
    | { type: 'input'; hint: string /* translation key */; required?: boolean }
    | { type: 'free'; hint: string /* translation key */ };

export interface TourRuntime {
    hasProjects: boolean;
}

export interface TourStep {
    id: string;
    /** Translation key (a text that is not a key is shown as it is). */
    title: string;
    /** Translation key. */
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
    /**
     * Leave the step on its own once this turns true: for `external` steps it
     * is how they finish, and a step that lives in a form can use it to react
     * to the form being submitted early (e.g. by pressing Enter).
     */
    completeWhen?: (runtime: TourRuntime) => boolean;
    /** Where `completeWhen` goes; defaults to the next step. */
    skipTo?: string;
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
        title: 'product_tour.steps.project_intro.title',
        description: 'product_tour.steps.project_intro.description',
    },
    {
        id: 'project-open',
        visit: '/projects',
        sidebar: true,
        target: 'new-project',
        placement: 'right',
        when: needsProjectChapter,
        title: 'product_tour.steps.project_open.title',
        description: 'product_tour.steps.project_open.description',
        interaction: {
            type: 'click',
            hint: 'product_tour.steps.project_open.hint',
        },
    },
    {
        id: 'project-name',
        target: 'project-name',
        placement: 'right',
        backTo: 'project-open',
        completeWhen: ({ hasProjects }) => hasProjects,
        skipTo: 'project-created',
        when: needsProjectChapter,
        title: 'product_tour.steps.project_name.title',
        description: 'product_tour.steps.project_name.description',
        interaction: {
            type: 'input',
            required: true,
            hint: 'product_tour.steps.project_name.hint',
        },
    },
    {
        id: 'project-slug',
        target: 'project-slug',
        placement: 'right',
        backTo: 'project-open',
        completeWhen: ({ hasProjects }) => hasProjects,
        skipTo: 'project-created',
        when: needsProjectChapter,
        title: 'product_tour.steps.project_slug.title',
        description: 'product_tour.steps.project_slug.description',
        interaction: {
            type: 'input',
            required: true,
            hint: 'product_tour.steps.project_slug.hint',
        },
    },
    {
        id: 'project-description',
        target: 'project-description',
        placement: 'right',
        backTo: 'project-open',
        completeWhen: ({ hasProjects }) => hasProjects,
        skipTo: 'project-created',
        when: needsProjectChapter,
        title: 'product_tour.steps.project_description.title',
        description: 'product_tour.steps.project_description.description',
        interaction: {
            type: 'input',
            hint: 'product_tour.steps.project_description.hint',
        },
    },
    {
        id: 'project-color',
        target: 'project-color',
        placement: 'left',
        backTo: 'project-open',
        completeWhen: ({ hasProjects }) => hasProjects,
        skipTo: 'project-created',
        when: needsProjectChapter,
        title: 'product_tour.steps.project_color.title',
        description: 'product_tour.steps.project_color.description',
        interaction: {
            type: 'free',
            hint: 'product_tour.steps.project_color.hint',
        },
    },
    {
        id: 'project-submit',
        target: 'project-submit',
        placement: 'top',
        backTo: 'project-open',
        when: needsProjectChapter,
        title: 'product_tour.steps.project_submit.title',
        description: 'product_tour.steps.project_submit.description',
        interaction: {
            type: 'click',
            advance: 'external',
            hint: 'product_tour.steps.project_submit.hint',
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
        title: 'product_tour.steps.project_created.title',
        description: 'product_tour.steps.project_created.description',
    },
];

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'welcome',
        visit: '/',
        title: 'product_tour.steps.welcome.title',
        icon: 'Hand',
        description: 'product_tour.steps.welcome.description',
    },
    {
        id: 'dashboard',
        sidebar: true,
        visit: '/',
        target: 'nav-dashboard',
        placement: 'right',
        title: 'product_tour.steps.dashboard.title',
        description: 'product_tour.steps.dashboard.description',
    },
    {
        id: 'projects',
        sidebar: true,
        visit: '/projects',
        target: 'nav-projects',
        placement: 'right',
        title: 'product_tour.steps.projects.title',
        description: 'product_tour.steps.projects.description',
    },
    {
        id: 'new-project',
        sidebar: true,
        visit: '/projects',
        target: 'new-project',
        placement: 'right',
        when: (context) => !needsProjectChapter(context),
        title: 'product_tour.steps.new_project.title',
        description: 'product_tour.steps.new_project.description',
    },
    {
        id: 'open-project',
        sidebar: true,
        visit: '/projects',
        target: 'first-project',
        placement: 'right',
        when: hasProjects,
        title: 'product_tour.steps.open_project.title',
        description: 'product_tour.steps.open_project.description',
    },
    {
        id: 'views',
        visit: firstProjectUrl,
        target: 'page-tabs',
        placement: 'bottom',
        when: hasProjects,
        title: 'product_tour.steps.views.title',
        description: 'product_tour.steps.views.description',
    },
    {
        id: 'new-issue',
        visit: firstProjectUrl,
        target: 'primary-action',
        placement: 'bottom',
        when: hasProjects,
        title: 'product_tour.steps.new_issue.title',
        description: 'product_tour.steps.new_issue.description',
    },
    {
        id: 'filters',
        visit: firstProjectUrl,
        target: 'filter-bar',
        placement: 'bottom',
        when: hasProjects,
        title: 'product_tour.steps.filters.title',
        description: 'product_tour.steps.filters.description',
    },
    {
        id: 'notifications',
        visit: '/',
        target: 'notifications',
        placement: 'bottom',
        title: 'product_tour.steps.notifications.title',
        description: 'product_tour.steps.notifications.description',
    },
    {
        id: 'settings',
        sidebar: true,
        visit: '/settings/preferences',
        target: 'settings-nav',
        placement: 'right',
        title: 'product_tour.steps.settings.title',
        description: 'product_tour.steps.settings.description',
    },
    {
        id: 'user-menu',
        sidebar: true,
        visit: '/settings/preferences',
        target: 'user-menu',
        placement: 'top',
        title: 'product_tour.steps.user_menu.title',
        description: 'product_tour.steps.user_menu.description',
    },
    ...PROJECT_CHAPTER_STEPS,
    {
        id: 'done',
        visit: '/',
        title: 'product_tour.steps.done.title',
        icon: 'Rocket',
        description: 'product_tour.steps.done.description',
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
