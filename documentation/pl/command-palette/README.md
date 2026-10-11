# Paleta komend

`mod+k` (⌘K na macOS, Ctrl+K gdzie indziej) otwiera jeden, obsługiwany z klawiatury punkt wejścia do całej aplikacji: uruchom dowolną komendę, przejdź do issue lub projektu, znajdź issues kolegi z zespołu i działaj na issue, na które patrzysz — bez dotykania myszy. `/` otwiera ją w trybie wyszukiwania, a `?` otwiera zamiast tego referencję skrótów tylko do odczytu.

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Dodaj komendę globalną](./01-add-a-global-command.md)** — komenda, która istnieje na każdej stronie (nawigacja, preferencje, konto), albo taka, którą rejestruje pojedynczy komponent, dopóki jest zamontowany, z opcjonalnym skrótem klawiszowym.
2. **[Dodaj komendę kontekstową z krokami zagnieżdżonymi](./02-add-a-contextual-command-with-nested-steps.md)** — wzorzec stojący za "Change status…", "Labels…" i "Assign to…" na stronie issue: komendy zależne od bieżącej strony, otwierające krok i pojawiające się tylko wtedy, gdy użytkownik może je wykonać.
3. **[Dodaj źródło wyszukiwania](./03-add-a-search-source.md)** — nowy rodzaj wyniku (jak issues, projekty czy osoby) znajdowany przez wewnętrzny endpoint `GET /command-palette/search`.

## Architektura w jednym akapicie

**Komenda** to nie skrót: każda akcja, którą paleta może uruchomić, to `Command` (`resources/js/types/Commands.ts`), a keybinding jest tylko opcjonalnym atrybutem `shortcut` tej komendy. `CommandProvider` (`resources/js/context/CommandContext.tsx`) trzyma rejestr, stan otwarcia i stos zagnieżdżonych *kroków*; komponenty rejestrują komendy na czas zamontowania przez `useCommands()` (ten sam cykl życia co `useShortcuts()`), a te obejmujące całą aplikację żyją w `useGlobalCommands`. Dopóki komenda jest zarejestrowana, jej `shortcut` trafia do silnika skrótów (zobacz [`../shortcuts/`](../shortcuts/README.md)), więc wiersz palety, jego chip ze skrótem i widok pomocy pochodzą z jednej definicji. Organizm `CommandPalette` renderuje rejestr: komendy lokalne są rankowane fuzzy po stronie klienta i pojawiają się natychmiast; **issues**, **projekty** i **osoby** przychodzą z serwera (`usePaletteSearch`, debounce 150ms, nieaktualne odpowiedzi anulowane) i doczytują się pod nimi. Pierwszy znak może zawęzić wyszukiwanie: `>` tylko komendy, `#` tylko issues (`#42` to numer w obrębie projektu, który widzą użytkownicy), `@` tylko osoby.

## Gdzie co leży

| Zagadnienie | Plik |
|---|---|
| `Command`, grupy, typy wyników wyszukiwania | `resources/js/types/Commands.ts` |
| Rejestr, stan otwarcia, stos kroków, most do skrótów | `resources/js/context/CommandContext.tsx` |
| Rejestracja komend z komponentu | `resources/js/hooks/useCommands.ts` |
| Komendy obejmujące całą aplikację | `resources/js/hooks/useGlobalCommands.ts` |
| Kontekstowe komendy issue | `resources/js/utils/issueCommands.ts`, `resources/js/hooks/useIssueCommands.ts` |
| Dopasowanie fuzzy i ranking | `resources/js/utils/fuzzyScore.ts`, `resources/js/utils/commandSearch.ts` |
| Parsowanie prefiksów (`>` `#` `@`) | `resources/js/utils/paletteQuery.ts` |
| Hook wyszukiwania na serwerze, historia, mapowanie wyników | `resources/js/hooks/usePaletteSearch.ts`, `resources/js/utils/commandHistory.ts`, `resources/js/utils/paletteEntities.ts` |
| UI | `resources/js/Components/Organisms/CommandPalette/`, `Molecules/CommandPalette{Input,Group,Item}/` |
| Endpoint wyszukiwania | `app/Http/Controllers/CommandPaletteController.php`, `app/Services/CommandPaletteSearchService.php` |

## Zasady, które utrzymują poprawność

- **Nigdy nie oferuj tego, czego użytkownik nie może zrobić.** Ukryj komendę przez `when()` na tej samej zdolności, którą egzekwuje kontroler; ukryta, nie wyłączona.
- **Mutacje używają istniejących tras** (`router.patch(route('issues.update', id), ...)`), więc walidacja, przejścia workflow, logi aktywności i powiadomienia zostają w jednym miejscu.
- **Wyszukiwanie na serwerze jest ograniczone do członkostw użytkownika w projektach** w samym zapytaniu repozytorium, a każde źródło potrzebuje testu z nie-członkiem.
- **Memoizuj to, co rejestrujesz.** `useCommands(commands)` rejestruje ponownie przy każdej zmianie tożsamości tablicy, co renderuje ponownie jej konsumentów; niestabilna tablica (świeże `[]` jako domyślny prop) wpada w pętlę.
- **Tylko zmienne motywu i kontrast AA.** Używaj `--text-gray-color`, a nie `--text-muted-color`, dla tekstu palety: token muted nie osiąga 4,5:1 w żadnym z motywów. `paletteContrast.test.ts` sprawdza każdą parę używaną przez paletę względem `global.css`.
