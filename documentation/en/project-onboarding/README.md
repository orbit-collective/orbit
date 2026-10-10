# Project onboarding

Every new account sees a one-time interactive product tour. If they
don't have a project yet, the tour ends with an optional hands-on
chapter that walks them through the real "New project" form — they
click and type in the highlighted fields themselves. Both parts are
tracked server-side as plain boolean columns on `users`, not
`localStorage`, so the tour reappears on a new device rather than
being tied to one browser.

## Guides, in the order you'd actually need them

1. **[Add a tour step](./01-add-a-tour-step.md)**
   — worked example adding a step to `TOUR_STEPS` and marking its
   target element with `data-tour`.
2. **[Add an interactive tour step](./02-add-an-interactive-tour-step.md)**
   — worked example of a step the user performs themselves (click,
   type), like the "create your first project" chapter.

## The architecture in one paragraph

`has_completed_onboarding` and `has_completed_project_onboarding`
(`app/Models/User.php`, both plain booleans) are read off the `auth`
[shared Inertia prop](../architecture/03-frontend-architecture-and-atomic-design.md)
every page already gets, and checked by `OnboardingGate`
(`resources/js/Components/Organisms/OnboardingGate/OnboardingGate.tsx`),
rendered once at the top of the provider stack in `app.tsx`, outside
any specific page. `getTourSteps()` (`resources/js/types/Tour.ts`)
picks the steps the account still needs: the full `TOUR_STEPS` while
`has_completed_onboarding` is `false`, or only
`PROJECT_CHAPTER_STEPS` once the tour was finished but the account
has no project and `has_completed_project_onboarding` is still
`false`. The list is computed once when the tour starts — creating a
project mid-tour flips `hasProjects` and must not reshuffle the steps.
`ProductTour` then walks them: a spotlight plus an anchored popover,
navigating between pages itself. Closing or finishing the tour posts
to `POST /onboarding/complete` and/or
`POST /onboarding/project/complete` (one after the other — a new
Inertia visit cancels the previous one) for whichever flags were
still pending, which simply flips the matching column. There is no
skip-vs-complete distinction tracked, and no per-step progress
persisted.
