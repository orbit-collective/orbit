# Architektura frontendu i atomic design

## Jak URL staje się wyrenderowaną stroną

```
Browser requests /projects/5
        │
        ▼
routes/web.php → ProjectController::show()
  - Inertia::render('Projects/Show', [ ...props ])
        │
        ▼
Inertia (server) serializes props, picks the component name 'Projects/Show'
        │
        ▼ (full page load)                          ▼ (subsequent SPA-style visit)
resources/views/app.blade.php                        Inertia (client) swaps the
  - @inertia directive renders a <div id="app">       page component in place,
    with the initial page data as a data-page attr    no full reload
        │
        ▼
resources/js/app.tsx's createInertiaApp({ resolve })
  - resolve('Projects/Show') → resolvePageComponent(...)
  - dynamically imports resources/js/Pages/Projects/Show.tsx via
    import.meta.glob('./Pages/**/*.tsx') — every .tsx file under Pages/
    is a candidate, matched by its path
        │
        ▼
<Component {...pageProps} /> renders inside the fixed provider stack (see below)
```

Nie ma żadnego klienckiego routera dopasowującego wzorce URL-i do komponentów — **string nazwy strony**, jaki wysyła Laravel (`'Projects/Show'`), to jedyna rzecz, która decyduje o tym, jaki plik się renderuje, i mapuje się bezpośrednio na ścieżkę `resources/js/Pages/Projects/Show.tsx`. Nazwanie nowej strony oznacza stworzenie pliku pod pasującą ścieżką; nic więcej nie musi być rejestrowane.

## Stos providerów, pod którym montuje się każda strona

Plik: `resources/js/app.tsx`

```tsx
<ThemeProvider>
    <AccentProvider>
        <ModalProvider>
            <AlertProvider>
                <ShortcutProvider>
                    <ModalContainer />
                    <Component {...pageProps} key={key} />
                    <OnboardingGate />
                </ShortcutProvider>
            </AlertProvider>
        </ModalProvider>
    </AccentProvider>
</ThemeProvider>
```

Kolejność zagnieżdżenia ma znaczenie, nie jest arbitralna: `AccentProvider` wywołuje `useTheme()` wewnętrznie (jego matematyka nieprzezroczystości różni się per rozstrzygnięty motyw — zobacz [`../accent-colors/README.md`](../accent-colors/README.md)), więc musi siedzieć wewnątrz `ThemeProvider`; każdy inny provider jest niezależny i teoretycznie mógłby zagnieżdżać się w dowolnej kolejności względem siebie. Dodaj nowy przekrojowy context tutaj, na poziomie, jakiego potrzebuje (wewnątrz `ThemeProvider` tylko jeśli też potrzebuje `useTheme()`, w przeciwnym razie gdziekolwiek w stosie) — nie wewnątrz konkretnej Page czy Layoutu, inaczej każda inna strona traci do niego dostęp.

`OnboardingGate` (zdefiniowany inline w `app.tsx`, nie context) odczytuje dwie flagi onboardingu `auth.user` ze współdzielonych propów Inertii (zobacz poniżej) i renderuje blokujący modal nad wszystkim innym, dopóki obie nie są ukończone — zobacz [`../project-onboarding/README.md`](../project-onboarding/README.md).

## Współdzielone propy vs. propy per strona

Plik: `app/Http/Middleware/HandleInertiaRequests.php`

```php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user() ? [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'avatar' => $request->user()->avatar,
                'has_completed_onboarding' => $request->user()->has_completed_onboarding,
                'has_completed_project_onboarding' => $request->user()->has_completed_project_onboarding,
                'session_lifetime' => $request->user()->session_lifetime,
            ] : null,
        ],
        'hasProjects' => fn () => $request->user()
            ? $this->projectService->hasAnyProjectsForUser($request->user()->id)
            : true,
        'emailEnabled' => fn () => $this->mailConfigurationService->isEnabled(),
        'flash' => [
            'success' => fn () => $request->session()->get('success'),
            'error' => fn () => $request->session()->get('error'),
            'warning' => fn () => $request->session()->get('warning'),
            'information' => fn () => $request->session()->get('information'),
            'action_url' => fn () => $request->session()->get('action_url'),
        ],
        'notifications' => fn () => $request->user()
            ? $this->notificationService->getAllForUser($request->user()->id)
            : [],
    ];
}
```

Każdy prop tutaj (`auth`, `hasProjects`, `emailEnabled`, `flash`, `notifications`) dociera do **każdej** strony automatycznie, odczytywany przez `usePage<PageProps>().props` — tak właśnie [alerty](../alerts/README.md) i [popup powiadomień](../notifications/03-frontend-backend-wiring-overview.md) dostają swoje dane, bez powtarzania tego samego propa przez kontroler każdej strony. Forma domknięcia (`fn () => ...`) to wbudowana leniwość Inertii "ewaluuj to tylko, jeśli faktycznie potrzebne" — tanie propy jak `auth` to zwykłe tablice, ale wszystko wymagające zapytania (`hasAnyProjectsForUser`, `getAllForUser`) jest owinięte, żeby nie uruchamiało się przy każdym pojedynczym żądaniu niezależnie od tego, czy strona z tego korzysta. Dodaj tutaj nowy prop tylko wtedy, gdy faktycznie każda strona go potrzebuje — prop specyficzny dla strony należy zamiast tego do wywołania `Inertia::render(...)` we własnej akcji kontrolera tej strony.

## Atomic design: co gdzie należy

- **Atoms** (`Components/Atoms/`) — najmniejsze reużywalne elementy: `Button`, `Badge`, `Input`, `Icon`, `BrandIcon`. Przyjmują prymitywne propy (`string`, `boolean`, klucz wariantu `cva`), nigdy nie importują typu z `resources/js/types/` dla modelu domenowego, nigdy nie wywołują hooka sięgającego poza własne propy (żadnego `useAccent()`, żadnego `router.post(...)`).
- **Molecules** (`Components/Molecules/`) — złożone z Atoms w mały, wciąż dość generyczny element: `Breadcrumb`, `NotificationItem`, `RoleBadge`. Mogą przyjmować prop w kształcie domenowym (`AlertItem`, `WorkspaceRole`), ale wciąż same nie sięgają do globalnego stanu — wszystko przychodzi jako propy od jakiegoś Organisma, który je renderuje.
- **Organisms** (`Components/Organisms/`) — specyficzne dla funkcji, złożone z Molecules, i pierwszy poziom, któremu wolno wywoływać hooki contextu bezpośrednio (`useAlert()`, `useAccent()`) i samodzielnie robić wywołania `router.post(...)` — `IssuePageHeader`, `WorkspaceSettingsContent`, `NotificationsPopup` to wszystko Organisms dokładnie z tego powodu.
- **Pages** (`Pages/`) — jeden na nazwę strony Inertii, otrzymujący propy kontrolera bezpośrednio i składający Organisms (plus okazjonalny Molecule) w faktyczny ekran. Page to jedyny poziom, który powinien destrukturyzować propy strony Inertii jako sygnaturę swojego komponentu.

Sygnał, że "to jest na złym poziomie": jeśli Atom potrzebuje importu typu domenowego albo hooka contextu, to w rzeczywistości jest Molecule albo Organism w przebraniu — przenieś w górę zamiast dodawać import.

## Gdzie żyje reszta

- `context/` — jeden plik na przekrojowy temat (`AlertContext`, `ThemeContext`, `AccentContext`, `ModalContext`, `ShortcutContext`), każdy eksportujący `<X>Provider` i hook `useX()`, który rzuca wyjątek, jeśli wywołany poza swoim providerem (zobacz `useX()` każdego istniejącego contextu po dokładnie ten kształt zabezpieczenia).
- `hooks/` — reużywalna logika ze stanem, która nie jest całym contextem (`useSavedFilters`, hook resize'owalnej kolumny) — granica między "to potrzebuje hooka" a "to potrzebuje contextu" to to, czy więcej niż jedna niepowiązana część drzewa potrzebuje *tego samego* stanu, czy tylko tego samego *kształtu* logiki niezależnie.
- `types/` — jeden plik na model/enum backendu, jaki odzwierciedla (`Issues.ts`, `Projects.ts`, `Roles.ts`, …) — zobacz dowolny przewodnik w `documentation/en/permissions/` albo `notifications/` po ustaloną konwencję ręcznego trzymania kształtu typu frontendu w zgodzie z odpowiednikiem backendu (nie ma codegenu).
- `utils/` — czyste funkcje bez żadnej zależności od React/Inertii (`cn.ts`, `colors.ts`, `time.ts`, `accentColors.ts`) — jeśli "util" potrzebuje `useState` albo contextu, należy zamiast tego do `hooks/`.

## Testy

Ten przewodnik to materiał referencyjny. Po same konwencje testowania (skolokowane `*.test.tsx`, Vitest + Testing Library, jsdom), zobacz top-level [`README.md`](../../../README.md#testing) i `CLAUDE.md`.
