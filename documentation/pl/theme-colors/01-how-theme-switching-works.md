# Jak działa przełączanie motywu

Przeczytaj to przed dotknięciem czegokolwiek innego w tej kategorii — pozostałe przewodniki zakładają, że wiesz, jak `theme`, `resolvedTheme` i `data-theme` się ze sobą łączą.

## Trzy wartości `ThemeMode` vs. dwa prawdziwe motywy

Plik: `resources/js/types/Theme.ts`

```ts
export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';
```

`ThemeMode` to to, co wybrał użytkownik (w Ustawieniach konta → Preferencje → Motyw interfejsu, tablica `themeOptions` w `AccountSettingsPreferencesTab.tsx` zasilająca `AccountSettingsThemeCard`). `ResolvedTheme` to to, co faktycznie się stosuje — są tylko dwa prawdziwe motywy; `system` nigdy nie jest stosowany bezpośrednio, zawsze rozstrzyga się do jednego z pozostałych dwóch.

## `ThemeProvider`, krok po kroku

Plik: `resources/js/context/ThemeContext.tsx`

```ts
const resolveTheme = (theme: ThemeMode): ResolvedTheme => {
    if (theme === 'system') {
        return typeof window !== 'undefined' &&
            window.matchMedia(LIGHT_MEDIA_QUERY).matches
            ? 'light'
            : 'dark';
    }

    return theme;
};
```

(`LIGHT_MEDIA_QUERY` to `'(prefers-color-scheme: light)'` — zauważ, że domyślne ustawienie systemowe jest traktowane jako **dark**: jeśli media query nie pasuje — w tym w środowisku testowym/SSR bez `matchMedia` — `system` rozstrzyga się do `'dark'`, nie `'light'`.)

Przy montowaniu, `theme` jest odczytywany z `localStorage` (`THEME_STORAGE_KEY = 'theme'`), domyślnie `'dark'`, jeśli nic nie jest zapisane albo zapisana wartość nie jest poprawnym `ThemeMode` (zabezpiecza to `isThemeMode()`). Trzy efekty wykonują faktyczną pracę:

1. Za każdym razem, gdy zmienia się `theme`, przelicz na nowo `resolvedTheme` przez `resolveTheme(theme)`.
2. Tylko gdy `theme === 'system'`: zasubskrybuj się do eventu `change` media query i rozstrzygaj na żywo — to właśnie sprawia, że przełączenie wyglądu systemu operacyjnego natychmiast aktualizuje Orbit, bez przeładowania, wyłącznie dla użytkowników, którzy wybrali "System sync." Ktoś, kto wybrał jawnie `dark`/`light`, nie jest dotknięty zmianami systemowymi.
3. Za każdym razem, gdy zmienia się `resolvedTheme`:
   `document.documentElement.setAttribute('data-theme', resolvedTheme)`
   — ta pojedyncza linia to cały most między stanem Reacta a CSS w `global.css`. Nic innego w aplikacji nigdy nie ustawia `data-theme`.

`setTheme(next)` aktualizuje stan i odzwierciedla go w `localStorage` w tym samym wywołaniu — nie ma osobnego kroku "zapisz", każdy wybór jest persystowany natychmiast.

## Co faktycznie się zmienia, gdy motyw się przełącza

Tylko atrybut `data-theme` na `<html>`. Kolory każdego komponentu aktualizują się natychmiast i automatycznie, ponieważ odwołują się do zmiennych CSS, nie dlatego, że jakikolwiek komponent renderuje się ponownie z powodu zmiany motywu — konsumentami `ThemeContext` są sam `ThemeProvider` (dla efektu `data-theme`) oraz cokolwiek renderuje UI wyboru motywu (`theme`/`setTheme` z `useTheme()` dla stanu zaznaczenia przycisków radio). Komponent, który używa tylko `var(--text-color)` itp. w swoich klasach Tailwinda, potrzebuje zerowej świadomości motywu — zobacz [przewodnik 3](./03-use-a-theme-color-in-a-component.md).

## Testy

- `resources/js/context/ThemeContext.test.tsx` — już pokrywa rozstrzyganie `system` względem zamockowanego `matchMedia`, rundę zapisu/odczytu `localStorage` oraz efekt atrybutu `data-theme`. Żadne zmiany nie są potrzebne, chyba że dodasz nowy `ThemeMode` (nie pokryty przez żaden przewodnik tutaj, ponieważ dziś nie ma trzeciego prawdziwego motywu — `system` to strategia rozstrzygania, nie paleta).
