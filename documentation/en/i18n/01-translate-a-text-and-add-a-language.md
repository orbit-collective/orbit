# Translate a text and add a language

## How it works

- `lang/<locale>/<file>.php` holds the texts (one file per component/page/hook, snake_case: `comment_form.php`, `page_dashboard.php`, `util_time.php`). The key is `<file>.<nested.key>`. `common.php` has the generic words (`common.cancel`, ...).
- The `laravel-react-i18n/vite` plugin (in `vite.config.js` and `.storybook/vite.config.ts`) flattens them into `lang/php_<locale>.json` (git-ignored, regenerated on every Vite/Vitest start).
- `app.tsx` wraps the app in `LaravelReactI18nProvider` (the language chosen in the sidebar user menu is kept in `localStorage` under `locale`, see `utils/locale.ts`); `I18nGate` waits for the language file so raw keys are never painted.
- Vitest mocks the library (`resources/js/tests/setup.ts`) with a synchronous English `t`/`tChoice` fed from `lang/en/*.php` (read in memory by `resources/js/tests/langFiles.ts`; the Vite plugin is disabled under Vitest because it deletes `lang/php_*.json` on exit), so tests keep asserting English text.

## 1. Translate a text

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

- Plain single-quoted/double-quoted string literals only (the plugin's PHP reader cannot evaluate expressions).
- Plurals: `':count issue|:count issues'`; Polish `'{1} :count zgłoszenie|[2,4] :count zgłoszenia|[5,*] :count zgłoszeń'`.
- Never call `t` at module scope: constants store a translation **key** (see `SETTINGS_TABS[].label`) and the component translates it at render.
- Dates/`Intl`: pass `intlLocale(currentLocale())` (`utils/time.ts`).
- `translations.test.ts` fails when `en` and `pl` differ in keys or `:placeholders`, or when a literal `t('...')` key does not exist.

## 2. Add a language

1. Create `lang/<locale>/` with a copy of every file in `lang/en/`, translated.
2. Add the code to `SUPPORTED_LOCALES` and `LOCALE_NAMES` in `resources/js/utils/locale.ts` (and to `intlLocale()` in `utils/time.ts`, and to `SetLocale` in PHP).
3. The sidebar menu lists `SUPPORTED_LOCALES` automatically.
