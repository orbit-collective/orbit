# Dodaj nowy język

Przykład: niemiecki (`de`). Interfejs, komunikaty serwera, przełączniki języka i paleta poleceń biorą nowy język z jednej listy.

## 1. Pliki backendu

```bash
php artisan lang:add de      # laravel-lang: auth, pagination, passwords, validation
```

To tworzy `lang/de/auth.php`, `pagination.php`, `passwords.php` i `validation.php` (własne komunikaty serwera). Zostaw je.

## 2. Teksty interfejsu

Skopiuj każdy plik z `lang/en/`, który nie jest plikiem frameworka, do `lang/de/` (te same nazwy plików, te same klucze) i przetłumacz wartości. Test parytetu pokaże, czego brakuje:

```bash
npx vitest run resources/js/tests/translations.test.ts
```

Test porównuje każdy folder z `lang/` z `en` (klucze, `:placeholdery`, puste wartości), więc nowy język jest sprawdzany, gdy tylko folder istnieje. Trzymaj się słownictwa istniejących tłumaczeń dla spójności (zgłoszenie, projekt, etykieta, przestrzeń robocza ...). Formy liczby mnogiej idą według reguł języka w składni `{1} ...|[2,4] ...|[5,*] ...`.

## 3. Zarejestruj język

1. `resources/js/utils/locale.ts`: dodaj `'de'` do `SUPPORTED_LOCALES` i `de: 'Deutsch'` do `LOCALE_NAMES` (własna nazwa języka). Podmenu „Języki" w pasku bocznym, Ustawienia > Preferencje i paleta poleceń wylistują `SUPPORTED_LOCALES` automatycznie.
2. `app/Http/Middleware/SetLocale.php`: dodaj `'de'` do `SUPPORTED`. Ciasteczko z językiem (patrz niżej) jest ignorowane dla każdej wartości spoza listy.
3. `resources/js/utils/time.ts`: dodaj `de` do `intlLocale()` (`'de-DE'`), żeby daty, dni tygodnia i liczby szły za nim.
4. `resources/js/Components/Atoms/LanguageFlag/LanguageFlag.tsx`: narysuj flagę dla kodu (prosty SVG; nieznany kod pokazuje szary kafelek).
5. `config/app.php` / `.env`: `APP_LOCALE` zmieniaj tylko, gdy zmienia się język domyślny (zostaje `en`).

Wtyczka Vite zamienia `lang/de/*.php` na `lang/php_de.json` przy następnym `npm run dev` (zrestartuj go; plik jest ignorowany przez git), a język jest pobierany na żądanie, więc nic nie dodaje do pierwszego ładowania.

## 4. Jak wybrany język podróżuje

- Przeglądarka trzyma wybór w `localStorage` (`locale`) oraz w zwykłym ciasteczku `locale` (`storeLocale()` zapisuje oba; ciasteczko jest wyłączone z szyfrowania w `bootstrap/app.php`).
- `SetLocale` czyta ciasteczko przy każdym żądaniu web (potem sesję, potem `APP_LOCALE`), więc błędy walidacji, komunikaty flash i etykiety paginacji wracają w tym samym języku, także dla gości na stronie logowania.
- Kod frontendu czytający tekst z serwera nie może zależeć od jego brzmienia (patrz przewodnik 02, krok 4).

## 5. Sprawdź

```bash
npx tsc --noEmit -p . && npx vitest run
php artisan test --filter=SetLocale
```

Potem otwórz aplikację, przełącz na nowy język w menu paska bocznego, w Ustawienia > Preferencje i przez paletę poleceń (`mod+k` > „Zmień język…") i poszukaj angielskiego, który został.
