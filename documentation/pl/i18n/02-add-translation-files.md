# Dodaj pliki tłumaczeń dla nowego komponentu, strony lub hooka

Każdy tekst, który widzi użytkownik, leży w pliku językowym, nigdy w komponencie. Ten przewodnik to pełna lista kroków, żeby nowy fragment UI dostał swoje teksty.

## 1. Wybierz nazwę pliku

Jeden plik na komponent, stronę, hook lub util, nazwany w `snake_case` po nim, taki sam w każdym folderze językowym:

| Budujesz | Plik |
|---|---|
| `Components/Molecules/CommentForm` | `comment_form.php` |
| `Pages/Settings/Labels.tsx` | `page_labels.php` |
| `hooks/useRolesManagement.ts` | `hook_roles_management.php` |
| `utils/dueDate.ts` | `util_due_date.php` |
| kilka drobnych rodzeństwa (`AccountSettings*`) | jeden wspólny plik z zagnieżdżonymi sekcjami: `account_settings.php` |

Nazwa pliku to pierwsza część każdego klucza: `comment_form.placeholder`, `account_settings.profile.title`. `common.php` zawiera słowa ogólne (`common.cancel`, `common.save`, ...); użyj ich, gdy angielski tekst to dokładnie to słowo, w przeciwnym razie trzymaj własną kopię w swoim pliku - duplikaty są w porządku.

## 2. Utwórz oba pliki

`lang/en/comment_form.php`:

```php
<?php

declare(strict_types=1);

return [
    'placeholder' => 'Write a comment…',
    'submit' => 'Comment',
    'hint' => [
        'send' => 'to send',
    ],
    'count' => ':count comment|:count comments',
    'edited_by' => 'Edited by :name',
];
```

`lang/pl/comment_form.php` ma **te same klucze** po polsku:

```php
return [
    'placeholder' => 'Napisz komentarz…',
    'submit' => 'Skomentuj',
    'hint' => [
        'send' => 'aby wysłać',
    ],
    'count' => ':count komentarz|:count komentarze|:count komentarzy',
    'edited_by' => 'Edytowane przez :name',
];
```

Zasady (wtyczka Vite czyta pliki małym parserem tablic PHP, nie PHP):

- Tylko literały tekstowe i zagnieżdżone tablice. Bez konkatenacji, stałych, `sprintf`, `__()` ani innych wywołań funkcji.
- `'` w tekście w pojedynczych cudzysłowach zapisz jako `\'` albo użyj podwójnych cudzysłowów (i `\n` dla łamania linii).
- Placeholdery to `:name`; polski tekst musi używać tych samych.
- Liczba mnoga to `one|other` po angielsku i `one|few|many` po polsku; czytaj ją przez `tChoice(key, count)`. Nie pisz zakresów (`{1}`, `[2,4]`, `[5,*]`): biblioteka wybiera formę według reguły liczby mnogiej danego języka, a zakres ją nadpisuje (22 nie byłoby „few” po polsku). Sprawdza to `translations.test.ts`.
- Nie edytuj plików frameworka (`auth.php`, `pagination.php`, `passwords.php`, `validation.php`) dla tekstów UI - to komunikaty backendu.

## 3. Użyj kluczy

```tsx
import { useLaravelReactI18n } from 'laravel-react-i18n';

const { t, tChoice } = useLaravelReactI18n();

<textarea placeholder={t('comment_form.placeholder')} />
<span>{tChoice('comment_form.count', comments.length)}</span>
<span>{t('comment_form.edited_by', { name: user.name })}</span>
```

- Nigdy nie wołaj `t` na poziomie modułu (język nie jest jeszcze znany). Stała z listą opcji trzyma **klucz**, a komponent tłumaczy go przy renderze:

  ```tsx
  const COLUMNS = [{ id: 'title', label: 'issue_table.columns.title' }];
  // ...
  {COLUMNS.map((c) => <th key={c.id}>{t(c.label)}</th>)}
  ```

- Czysta funkcja pomocnicza w `utils/` przyjmuje opcjonalne `t` (`(key, replacements?) => string`) i bez niego wraca do angielskiego, albo zwraca klucz do przetłumaczenia przez wołającego.
- Zdanie z linkiem lub `<kbd>` w środku dziel na kawałki wokół elementu **według szyku zdania danego języka** - albo użyj jednego klucza z placeholderem - żeby po polsku dało się zmienić kolejność słów.
- Daty i liczby: `intlLocale(currentLocale())` z `utils/time.ts` daje tag, którego chce `Intl` / `toLocale*String`.
- **Nie** tłumacz danych użytkownika (nazw projektów, zgłoszeń, etykiet, statusów, priorytetów i ról), wartości, które serwer wysyła jako id lub enumy, nazw marek (Orbit, GitHub, Jira) ani nazw klawiszy.

## 4. Tekst z serwera

Własne teksty frameworka po stronie serwera (błędy walidacji, etykiety paginacji) są już w języku użytkownika, patrz [03 - Dodaj nowy język](03-add-a-new-language.md). Nigdy nie dopasowuj ich po brzmieniu we frontendzie (`label.includes('Previous')`): rozróżniaj je po pozycji lub id, tak jak robi to `Pagination`.

Katalog, który serwer wysyła po angielsku (nazwy widżetów, etykiety wyzwalaczy), jest mapowany po id na klucze z tekstem serwera jako rezerwą - patrz `utils/dashboardCatalogText.ts` i `automationTypeLabel()` w `utils/automationMeta.ts`. Nowy wpis katalogu działa wtedy bez tłumaczenia, dopóki nie dodasz jego kluczy.

Komunikaty flash zapisane w kontrolerach (`->with('success', 'Comment added.')`) są angielskimi literałami i **nie** są jeszcze tłumaczone: alert pokazuje je tak, jak przyszły. Aby przetłumaczyć jeden, użyj w kontrolerze `__('flash.comment_added')` z kluczem w `lang/<locale>/`, wtedy serwer rozwiąże go w języku z ciasteczka.

## 5. Sprawdź

```bash
npx vitest run resources/js/tests/translations.test.ts
```

Test oblewa, gdy `en` i `pl` mają różne klucze lub `:placeholdery`, gdy tekst jest pusty albo gdy literalny `t('file.key')` w źródle nie ma klucza. Klucze dynamiczne (``t(`file.${x}`)``) nie są sprawdzane - dodaj każdą wartość ręcznie. Testy Twojego komponentu nadal sprawdzają **angielski** tekst: Vitest odpowiada na `t()` z `lang/en/*.php`.
