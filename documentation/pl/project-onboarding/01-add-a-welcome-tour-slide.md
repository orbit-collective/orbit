# Dodaj slajd powitalnej wycieczki

Przećwiczony przykład: dodanie czwartego slajdu o integracjach do powitalnej wycieczki, jaką każde nowe konto widzi raz.

## Krok 1 — Dodaj obraz

Nowy plik: `resources/js/assets/onboarding/onboarding_4.png` — te same proporcje/styl co istniejące trzy (`onboarding_1.png`/`onboarding_2.png`/`onboarding_3.png`), ponieważ `OnboardingModal` renderuje go wypełniającego panel o stałej wysokości (`object-cover`/`object-left`, zobacz `<img>` w komponencie) bez żadnego dostosowania layoutu per slajd.

## Krok 2 — Dodaj slajd

Plik: `resources/js/Components/Organisms/OnboardingModal/OnboardingModal.tsx`

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

To cała zmiana — `currentSlide`, `isFirstStep`/`isLastStep` oraz wskaźnik kroków/przycisk Next-vs-Done w `OnboardingModalFooter` wszystkie wyprowadzają się generycznie z `SLIDES.length` i aktualnego indeksu; nic nigdzie indziej w komponencie nie koduje na sztywno "3 slajdy". Zamknięcie wycieczki na nowym ostatnim slajdzie wciąż wysyła POST do tej samej, niezmienionej trasy `onboarding.complete` (zobacz sekcję architektury w [README](./README.md)) — dodanie slajdu w ogóle nie dotyka przepływu zakończenia, tylko to, ile kroków go poprzedza.

## Testy

- `resources/js/Components/Organisms/OnboardingModal/OnboardingModal.test.tsx` — jeśli test asercuje całkowitą liczbę slajdów albo przechodzi przez `handleNext()`/`handlePrev()` ustaloną liczbę razy, zaktualizuj go dla czterech slajdów zamiast trzech; dodaj przypadek asercujący, że tytuł/podtytuł czwartego slajdu renderuje się po trzykrotnym kliknięciu "Next".
- Żadne zmiany testów backendu — zachowanie `completeOnboarding()` jest niezwiązane z tym, ile slajdów je poprzedza.
