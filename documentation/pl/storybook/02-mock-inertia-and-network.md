# Mockowanie Inertia, tras i sieci

Stories działają bez backendu. `@inertiajs/react` i `axios` są podmienione na `.storybook/mocks/inertia.tsx` i `.storybook/mocks/axios.ts` (alias Vite w Storybooku, `vi.mock` w Vitest), `route()` to globalny mock (`.storybook/mocks/route.ts`), a `fetch` jest spatchowany (`.storybook/mocks/network.ts`).

## Propsy strony i błędy formularza

`usePage()` i `useForm()` czytają `parameters.inertia` story:

```tsx
export const WithNotifications: Story = {
    parameters: {
        inertia: {
            url: '/projects/1',
            props: { notifications },
            formErrors: { name: 'The name field is required.' },
        },
    },
};
```

`url` ustawia bieżący URL, `props` jest scalane z domyślnymi propsami strony (zalogowany użytkownik, lista projektów, …), `formErrors` wstępnie wypełnia błędy `useForm`, a `component` ustawia nazwę komponentu strony.

## Żądania HTTP

`axios` i `fetch` przechodzą przez handlery z `parameters.network`. Handler dopasowuje się po `url` (string pasuje jako prefiks albo `RegExp`) i opcjonalnym `method`, a odpowiada `response` (wartość lub funkcja żądania), opcjonalnym `status` (>= 400 odrzuca jak nieudane żądanie) i opcjonalnym `delay` w milisekundach do pokazania stanów ładowania:

```tsx
parameters: {
    network: [
        {
            url: '/command-palette/search',
            method: 'GET',
            response: { issues: [], projects: [], people: [] },
        },
    ],
},
```

Żądanie bez pasującego handlera dostaje `404`, jak niedostępne API. Wizyty Inertia (`router.post`, `useForm().post`, …) to nie HTTP: mock kończy je po `inertiaMockConfig.delay` (600 ms w Storybooku, 0 w Vitest) i zgłasza `formErrors`, jeśli są ustawione.

## Zasady kciuka

- Nigdy nie edytuj komponentu, żeby dało się go "zastory'ować" — popraw konfigurację tutaj.
- 404 z brakującego handlera pokazuje, czego komponent potrzebuje od serwera; dodaj handler zamiast łapać błąd.
