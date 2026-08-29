# Testowanie komponentów, które używają alertów

W tym repozytorium istnieją już dwa różne kształty testów, w zależności od tego, czy testujesz sam `AlertContext`, czy komponent, który jedynie go *konsumuje*. Użyj właściwego — rozwiązują różne problemy.

## Testowanie `AlertContext`/`useAlert()` bezpośrednio

Plik: `resources/js/context/AlertContext.test.tsx`

Używa `renderHook` (z `@testing-library/react`) bezpośrednio na `useAlert()`, z całkowicie zamockowanym `@inertiajs/react` (zarówno `usePage`, jak i `router.on`, ten drugi zapisujący zarejestrowane handlery, żeby test mógł wywołać fałszywą wizytę "success") oraz zamockowanym `AlertContainer` do no-op — ten plik testowy dotyczy *maszyny stanu*, nie wyrenderowanego DOM:

```ts
const pageState = vi.hoisted(() => ({
    flash: {} as Record<string, string | undefined>,
    successHandlers: [] as Array<(event: unknown) => void>,
}));

const fireRouterSuccess = (flash: Record<string, string | undefined>) => {
    pageState.successHandlers.forEach((handler) =>
        handler({ detail: { page: { props: { flash } } } }),
    );
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { flash: pageState.flash } }),
    router: {
        on: (event: string, handler: (e: unknown) => void) => {
            if (event === 'success') {
                pageState.successHandlers.push(handler);
            }
            return () => {
                pageState.successHandlers = pageState.successHandlers.filter(
                    (h) => h !== handler,
                );
            };
        },
    },
}));

vi.mock('@/Components/Organisms/AlertContainer/AlertContainer', () => ({
    AlertContainer: () => null,
}));

import { AlertProvider, useAlert } from './AlertContext';

const wrapper = ({ children }: { children: ReactNode }) => (
    <AlertProvider>{children}</AlertProvider>
);

beforeEach(() => {
    pageState.flash = {};
    pageState.successHandlers = [];
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});
```

`vi.useFakeTimers()` w każdym teście tutaj jest wymagane, nie przypadkowe — auto-usuwanie w `addAlert` to prawdziwy `setTimeout`; bez fake timers, test asercujący "auto-usuwa po 4000ms" musiałby faktycznie czekać 4 sekundy (albo gorzej, migotać pod obciążeniem). Użyj `vi.advanceTimersByTime(ms)`, żeby przewinąć do przodu, dokładnie tak, jak robi to własny test [`04-customize-alert-behavior.md`](./04-customize-alert-behavior.md).

Rozszerzaj ten plik tylko dla faktycznie nowego **zachowania** `AlertContext` (nowy klucz flash, nowa reguła stakowania) — nie dla testowania komponentu, który akurat wywołuje `addAlert()`.

## Testowanie komponentu, który wywołuje `useAlert()`

Plik: dowolny test komponentu obok komponentu używającego `useAlert()` — np. `resources/js/Components/Organisms/IssuePageHeader/IssuePageHeader.test.tsx` (zobacz [`02-trigger-an-alert-from-the-frontend.md`](./02-trigger-an-alert-from-the-frontend.md)) albo `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsNotificationsTab.test.tsx`.

Nie mockuj tu `@/context/AlertContext` — owiń komponent w **prawdziwy** `AlertProvider` i asercuj na faktycznym pojawieniu się alertu w DOM:

```tsx
import { AlertProvider } from '@/context/AlertContext';

render(
    <AlertProvider>
        <YourComponent />
    </AlertProvider>,
);

// ...trigger the action...

expect(await screen.findByText('Your expected message')).toBeInTheDocument();
```

Użyj `findByText` (asynchroniczne, ponawia próby), nie `getByText` — `addAlert` wywołuje aktualizację stanu, która potrzebuje ticka, żeby się przepłukać, a nie ma tu już dostarczonego opakowania `act()` w sposób, w jaki jest wewnątrz `renderHook`. Zamockowanie `useAlert()` do `vi.fn()` jest kuszące, ale słabsze — dowodzi tylko, że Twój komponent *wywołał* `addAlert` z jakimiś argumentami, nie że prawdziwy użytkownik faktycznie zobaczyłby wynikowy toast — preferuj podejście z prawdziwym providerem, chyba że testowany komponent nie ma nic wspólnego z tym, co mówi alert (np. test, który dotyczy czysto innej sprawy i przypadkiem tylko incydentalnie go wywołuje).

Nie ma dziś współdzielonego wrappera `render()` z narzędzi testowych, który już zawierałby `AlertProvider` (`resources/js/tests/setup.ts` konfiguruje tylko środowisko jsdom/globalne) — każdy test komponentu, który tego potrzebuje, owija ręcznie, tak jak pokazano powyżej.

## Testy

Ten przewodnik sam w sobie dotyczy testów — nie ma nic więcej do dodania.
