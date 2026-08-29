# Add a welcome tour slide

Worked example: adding a fourth slide about integrations to the
welcome tour every new account sees once.

## Step 1 — Add the image

New file: `resources/js/assets/onboarding/onboarding_4.png` — same
aspect ratio/style as the existing three
(`onboarding_1.png`/`onboarding_2.png`/`onboarding_3.png`), since
`OnboardingModal` renders it filling a fixed-height panel
(`object-cover`/`object-left`, see the `<img>` in the component) with
no per-slide layout adjustment.

## Step 2 — Add the slide

File: `resources/js/Components/Organisms/OnboardingModal/OnboardingModal.tsx`

```tsx
import onboarding1 from '@/assets/onboarding/onboarding_1.png';
import onboarding2 from '@/assets/onboarding/onboarding_2.png';
import onboarding3 from '@/assets/onboarding/onboarding_3.png';
import onboarding4 from '@/assets/onboarding/onboarding_4.png';

const SLIDES = [
    {
        id: 1,
        title: 'Welcome to Orbit',
        subtitle: 'Your projects. Organized from day one.',
        description:
            'Create workspaces, invite your team, and manage every project from a single, distraction-free platform designed for modern software development.',
        image: onboarding1,
    },
    {
        id: 2,
        title: 'Track Every Issue',
        subtitle: 'Stay focused on what matters.',
        description:
            'Plan sprints, assign issues, monitor progress, and collaborate in real time with a clean interface built for speed and productivity.',
        image: onboarding2,
    },
    {
        id: 3,
        title: 'Build Better Together',
        subtitle: 'Everything connected in one place.',
        description:
            'Keep tasks, documentation, discussions, and project insights synchronized so your entire workflow stays organized from idea to release.',
        image: onboarding3,
    },
    {
        id: 4,
        title: 'Connect Your Tools',
        subtitle: 'Bring your workflow together.',
        description:
            'Connect Discord and other integrations to get project activity delivered exactly where your team already talks.',
        image: onboarding4,
    },
];
```

That's the entire change — `currentSlide`, `isFirstStep`/`isLastStep`,
and `OnboardingModalFooter`'s step indicator/Next-vs-Done button all
derive from `SLIDES.length` and the current index generically; nothing
hardcodes "3 slides" anywhere else in the component. Dismissing the
tour on the new last slide still posts to the same
`onboarding.complete` route unchanged (see the
[README](./README.md)'s architecture section) — adding a slide doesn't
touch the completion flow at all, only how many steps come before it.

## Tests

- `resources/js/Components/Organisms/OnboardingModal/OnboardingModal.test.tsx` —
  if a test asserts the total slide count or steps through
  `handleNext()`/`handlePrev()` a fixed number of times, update it for
  four slides instead of three; add a case asserting the fourth
  slide's title/subtitle renders after clicking "Next" three times.
- No backend test changes — `completeOnboarding()` behavior is
  unrelated to how many slides preceded it.
