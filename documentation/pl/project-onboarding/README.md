# Onboarding projektu

Każde nowe konto widzi jednorazową, wieloslajdową powitalną wycieczkę, a potem — jeśli wciąż nie jest członkiem żadnego projektu w momencie jej zamknięcia — dedykowany prompt "utwórz swój pierwszy projekt". Oba są śledzone po stronie serwera jako zwykłe kolumny boolean na `users`, nie `localStorage`, więc wycieczka pojawia się ponownie na nowym urządzeniu zamiast być przywiązana do jednej przeglądarki.

## Przewodniki, w kolejności, w jakiej faktycznie będziesz ich potrzebować

1. **[Dodaj slajd powitalnej wycieczki](./01-add-a-welcome-tour-slide.md)** — przećwiczony przykład dodania czwartego slajdu do tablicy `SLIDES` w `OnboardingModal`.

## Architektura w jednym akapicie

`has_completed_onboarding` i `has_completed_project_onboarding` (`app/Models/User.php`, oba zwykłe boolean) są odczytywane ze współdzielonego propa Inertii `auth` (zobacz [architekturę frontendu](../architecture/03-frontend-architecture-and-atomic-design.md)), jaki dostaje już każda strona, i sprawdzane przez `OnboardingGate` — mały komponent zdefiniowany bezpośrednio wewnątrz `resources/js/app.tsx`, renderowany raz na szczycie stosu providerów, poza jakąkolwiek konkretną stroną. Pokazuje `OnboardingModal` (wieloslajdową powitalną wycieczkę), jeśli `has_completed_onboarding` to `false`; gdy to prawda, pokazuje `ProjectOnboardingModal` (pojedynczy krok "utwórz swój pierwszy projekt", nie wieloslajdowy) tylko wtedy, gdy `has_completed_project_onboarding` to `false` **i** współdzielony prop `hasProjects` mówi, że konto wciąż nie jest w żadnym projekcie — dołączenie albo utworzenie jednego gdziekolwiek indziej w aplikacji spełnia ten drugi warunek bez potrzeby jawnego wywołania `completeProjectOnboarding()`. Zamknięcie któregokolwiek z modali wysyła POST do `POST /onboarding/complete`/`POST /onboarding/project/complete` (`UserController::completeOnboarding()`/`completeProjectOnboarding()`), co po prostu przełącza pasującą kolumnę — nie jest śledzone żadne rozróżnienie skip-vs-complete, ani żaden postęp per-slajd, tylko "czy cała ta wycieczka została zamknięta przynajmniej raz."
