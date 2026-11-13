# Przetłumacz tekst i dodaj język

## Jak to działa

- `lang/<locale>/<plik>.php` zawiera teksty (jeden plik na komponent/stronę/hook, snake_case: `comment_form.php`, `page_dashboard.php`, `util_time.php`). Klucz to `<plik>.<zagnieżdżony.klucz>`. `common.php` ma słowa ogólne (`common.cancel`, ...).
- Wtyczka Vite `laravel-react-i18n/vite` (w `vite.config.js` i `.storybook/vite.config.ts`) spłaszcza je do `lang/php_<locale>.json` (ignorowane przez git, generowane przy każdym starcie Vite/Vitest).
- `app.tsx` owija aplikację w `LaravelReactI18nProvider` (język wybrany w menu użytkownika w pasku bocznym jest w `localStorage` pod kluczem `locale`, patrz `utils/locale.ts`); `I18nGate` czeka na plik języka, żeby nie pokazać surowych kluczy.
- Vitest mockuje bibliotekę (`resources/js/tests/setup.ts`) synchronicznym angielskim `t`/`tChoice` zasilanym z `lang/en/*.php` (czytanym w pamięci przez `resources/js/tests/langFiles.ts`; wtyczka Vite jest wyłączona pod Vitestem, bo usuwa `lang/php_*.json` przy wyjściu), więc testy nadal sprawdzają angielskie teksty.

## 1. Przetłumacz tekst

```tsx
const { t, tChoice } = useLaravelReactI18n();

t('comment_form.placeholder');
t('greeting_card.hello', { name });
tChoice('issue_table.count', count);
```

```php
// lang/en/comment_form.php            // lang/pl/comment_form.php
return [                               return [
    'placeholder' => 'Write a comment…',   'placeholder' => 'Napisz komentarz…',
];                                     ];
```

- Tylko literały tekstowe (czytnik PHP wtyczki nie wykonuje wyrażeń).
- Liczba mnoga: `':count issue|:count issues'`; po polsku `':count zgłoszenie|:count zgłoszenia|:count zgłoszeń'`.
- Nie wołaj `t` na poziomie modułu: stałe trzymają **klucz** tłumaczenia (patrz `SETTINGS_TABS[].label`), a komponent tłumaczy go przy renderze.
- Daty/`Intl`: przekaż `intlLocale(currentLocale())` (`utils/time.ts`).
- `translations.test.ts` oblewa, gdy `en` i `pl` różnią się kluczami lub `:placeholderami`, albo gdy literalny klucz `t('...')` nie istnieje.

## 2. Dalej

- [02 - Dodaj pliki tłumaczeń](02-add-translation-files.md): nazewnictwo, zasady kluczy, stałe, katalogi z serwera.
- [03 - Dodaj nowy język](03-add-a-new-language.md): pełna lista kroków (`lang/<code>/`, `utils/locale.ts`, `SetLocale`, flaga, `intlLocale`).
- [04 - Przełączniki języka](04-language-switchers.md): menu w pasku bocznym, Preferencje, paleta poleceń.
