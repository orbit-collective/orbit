# Project onboarding

Every new account sees a one-time, multi-slide welcome tour, then —
if they still aren't a member of any project by the time they
dismiss it — a dedicated "create your first project" prompt. Both are
tracked server-side as plain boolean columns on `users`, not
`localStorage`, so the tour reappears on a new device rather than
being tied to one browser.

## Guides, in the order you'd actually need them

1. **[Add a welcome tour slide](./01-add-a-welcome-tour-slide.md)**
   — worked example adding a fourth slide to `OnboardingModal`'s
   `SLIDES` array.

## The architecture in one paragraph

`has_completed_onboarding` and `has_completed_project_onboarding`
(`app/Models/User.php`, both plain booleans) are read off the `auth`
[shared Inertia prop](../architecture/03-frontend-architecture-and-atomic-design.md)
every page already gets, and checked by `OnboardingGate` — a small
component defined directly inside `resources/js/app.tsx`, rendered
once at the top of the provider stack, outside any specific page.
It shows `OnboardingModal` (the multi-slide welcome tour) if
`has_completed_onboarding` is `false`; once that's true, it shows
`ProjectOnboardingModal` (a single "create your first project"
step, not multi-slide) only if `has_completed_project_onboarding` is
`false` **and** the `hasProjects` shared prop says the account still
isn't in any project — joining or creating one elsewhere in the app
satisfies this second condition without needing
`completeProjectOnboarding()` to ever be called explicitly.
Dismissing either modal posts to
`POST /onboarding/complete`/`POST /onboarding/project/complete`
(`UserController::completeOnboarding()`/`completeProjectOnboarding()`),
which simply flips the matching column — there's no skip-vs-complete
distinction tracked, and no per-slide progress persisted, only
"has this whole tour been dismissed at least once."
