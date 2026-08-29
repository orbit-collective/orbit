# Użyj koloru motywu w komponencie

Konwencja, jakiej trzyma się każdy komponent w tym repozytorium, oraz błędy, które ujawniają się tylko w jednym z dwóch motywów.

## Konwencja

Odwołaj się do zmiennej CSS jako **arbitralnej wartości** Tailwinda, nigdy jako zakodowanego na sztywno hex albo gołego koloru z palety Tailwinda dla czegokolwiek, co powinno dostosowywać się do motywu:

```tsx
<div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-color)] p-4">
    <p className="text-[var(--text-color)]">Title</p>
    <p className="text-[var(--text-gray-color)]">Secondary text</p>
</div>
```

Działa to, ponieważ składnia arbitralnej wartości Tailwinda (`bg-[var(--x)]`) emituje dosłownie `background-color: var(--x)` — przeglądarka rozstrzyga `--x` w momencie renderowania na podstawie tego, który blok `[data-theme]` jest aktywny (zobacz [przewodnik 1](./01-how-theme-switching-works.md)), więc sam komponent potrzebuje zerowej świadomości motywu: żadnego wywołania `useTheme()`, żadnej warunkowej klasy, żadnego ponownego renderowania przy zmianie motywu.

## Słownictwo tokenów (po co sięgać)

Każdy token w `global.css` i do czego służy — sięgnij po istniejący, który pasuje do Twojego przypadku, zamiast wymyślać nowy (zobacz [przewodnik 2](./02-add-a-new-theme-color-token.md) po to, kiedy nowy token jest faktycznie uzasadniony):

| Token | Do czego |
|---|---|
| `--bg-color` | Tło strony/aplikacji |
| `--bg-color-hover` | Powierzchnia hover na poziomie tła strony |
| `--bg-dark-color` | Zagłębiona powierzchnia (sidebar, tło popupu) |
| `--bg-light-color` / `--bg-light-color-hover` | Wyniesiona powierzchnia wiersza/karty i jej stan hover |
| `--text-color` | Główny tekst |
| `--text-gray-color` | Tekst drugorzędny |
| `--text-muted-color` | Tekst trzeciorzędny/placeholder |
| `--border-color` / `--border-color-strong` | Domyślne i podkreślone obramowania |
| `--surface-color` | Tło karty/panelu, subtelniejsze niż `--bg-light-color` |
| `--overlay-color` | Przyciemnienie tła modala/dropdownu |
| `--success-color` / `--error-color` / `--warning-color` / `--info-color` / `--pending-color` | Kolory statusu/semantyczne (to też to, na co [alerty](../alerts/README.md) mapują swoje cztery typy) |
| `--accent-color` / `--accent-light-color` / `--accent-color-opacity` | Wybrany przez użytkownika akcent marki — zobacz [kolory akcentu](../accent-colors/README.md), osobny system od reszty tej tabeli |

## Błędy, które psują tylko jeden motyw

- **Zakodowany na sztywno hex skopiowany z makiety projektowej.** `bg-[#101113]` dokładnie pasuje do `--bg-color-hover` w trybie dark i jest po cichu błędny (prawie czarny box na jasnej stronie) w momencie, gdy ktoś przełączy na light. Jeśli kusi Cię, żeby zakodować na sztywno wartość podejrzaną z motywu dark, prawie zawsze istnieje już token dla niej — najpierw sprawdź tabelę powyżej.
- **Goła klasa palety Tailwinda dla czegoś, co ma się dostosowywać**, np. `text-gray-400` zamiast `text-[var(--text-gray-color)]` — renderuje ten sam szary w obu motywach zamiast wartości dostrojonej do motywu, zwykle kończąc się zbyt jasnym, żeby przeczytać na jasnym tle, albo zbyt ciemnym na ciemnym. Klasy palety Tailwinda są nadal poprawne dla czegoś, co *ma* zostać tym samym kolorem niezależnie od motywu — stałe odcienie w `resources/js/utils/colors.ts` (kolory projektów/etykiet, np. czerwona odznaka projektu jest tą samą czerwienią w obu motywach) są dokładnie takim przypadkiem; własny wybrany kolor projektu jest częścią jego tożsamości, nie częścią chromu interfejsu, który mają kontrolować tokeny motywu.
- **Media queries `prefers-color-scheme` w CSS komponentu.** To mechanizm, [jakiego używają maile](./04-theme-colors-in-emails.md), które nie mają żadnego JavaScriptu i nie mogą ustawić `data-theme` — sama aplikacja nigdy nie powinna rozgałęziać się na tej media query bezpośrednio, tylko na `resolvedTheme` (a nawet to powinno być rzadkie; prawie wszystko powinno być po prostu odwołaniem do zmiennej CSS).

## Podgląd obu motywów bez dotykania ustawienia systemu operacyjnego

Wybierz jawnie `dark`/`light` w Ustawieniach konta → Preferencje — to dokładnie omija zachowanie `system` podążające za systemem operacyjnym (zobacz `resolveTheme()` z [przewodnika 1](./01-how-theme-switching-works.md)) i pozwala zobaczyć każdy motyw niezależnie od faktycznego ustawienia wyglądu Twojego systemu operacyjnego.

## Testy

Nie istnieje ani nie jest oczekiwany dedykowany test "używa właściwego tokenu" per komponent — test komponentu weryfikujący, że jego wyrenderowany `className` zawiera oczekiwane odwołanie `var(--...)` (tak jak `'renders an icon styled for the %s intent'` w `resources/js/Components/Molecules/Alert/Alert.test.tsx`, asercując `toHaveClass('text-[var(--success-color)]')` itd.) to właściwy poziom pokrycia; nie ma dziś żadnej szerszej reguły lintera łapiącej zakodowany na sztywno hex.
