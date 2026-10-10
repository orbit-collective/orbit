# Onboarding projektu

Każde nowe konto widzi jednorazową, interaktywną wycieczkę po produkcie. Jeśli nie ma jeszcze projektu, wycieczka kończy się opcjonalnym, praktycznym rozdziałem, który prowadzi przez prawdziwy formularz "New project" — użytkownik sam klika i wpisuje w podświetlone pola. Obie części są śledzone po stronie serwera jako zwykłe kolumny boolean na `users`, nie `localStorage`, więc wycieczka pojawia się ponownie na nowym urządzeniu zamiast być przywiązana do jednej przeglądarki.

## Przewodniki, w kolejności, w jakiej faktycznie będziesz ich potrzebować

1. **[Dodaj krok wycieczki](./01-add-a-tour-step.md)** — przećwiczony przykład dodania kroku do `TOUR_STEPS` i oznaczenia jego elementu docelowego przez `data-tour`.
2. **[Dodaj interaktywny krok wycieczki](./02-add-an-interactive-tour-step.md)** — przećwiczony przykład kroku, który użytkownik wykonuje sam (klik, wpisywanie), jak rozdział "utwórz swój pierwszy projekt".

## Architektura w jednym akapicie

`has_completed_onboarding` i `has_completed_project_onboarding` (`app/Models/User.php`, oba zwykłe boolean) są odczytywane ze współdzielonego propa Inertii `auth` (zobacz [architekturę frontendu](../architecture/03-frontend-architecture-and-atomic-design.md)), jaki dostaje już każda strona, i sprawdzane przez `OnboardingGate` (`resources/js/Components/Organisms/OnboardingGate/OnboardingGate.tsx`), renderowany raz na szczycie stosu providerów w `app.tsx`, poza jakąkolwiek konkretną stroną. `getTourSteps()` (`resources/js/types/Tour.ts`) wybiera kroki, których konto jeszcze potrzebuje: pełne `TOUR_STEPS`, dopóki `has_completed_onboarding` to `false`, albo tylko `PROJECT_CHAPTER_STEPS`, gdy wycieczka została skończona, ale konto nie ma projektu, a `has_completed_project_onboarding` wciąż jest `false`. Lista jest liczona raz, przy starcie wycieczki — utworzenie projektu w jej trakcie zmienia `hasProjects` i nie może przetasować kroków. `ProductTour` przechodzi potem przez nie: podświetlenie plus przypięty popup, który sam nawiguje między stronami. Zamknięcie lub ukończenie wycieczki wysyła POST do `POST /onboarding/complete` i/lub `POST /onboarding/project/complete` (jeden po drugim — nowa wizyta Inertii anuluje poprzednią) dla tych flag, które wciąż czekały, co po prostu przełącza pasującą kolumnę. Nie jest śledzone żadne rozróżnienie skip-vs-complete, ani żaden postęp per-krok.
