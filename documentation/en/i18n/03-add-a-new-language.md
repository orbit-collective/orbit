# Add a new language

Example: German (`de`). The interface, the server's messages, the language pickers and the command palette all pick the new language up from one list.

## 1. The backend files

```bash
php artisan lang:add de      # laravel-lang: auth, pagination, passwords, validation
```

This creates `lang/de/auth.php`, `pagination.php`, `passwords.php` and `validation.php` (the server's own messages). Keep them.

## 2. The interface texts

Copy every file of `lang/en/` that is not a framework file to `lang/de/` (same file names, same keys) and translate the values. The parity test lists what is missing:

```bash
npx vitest run resources/js/tests/translations.test.ts
```

The test compares every folder of `lang/` with `en` (keys, `:placeholders`, empty values), so the new language is checked as soon as the folder exists. Use the vocabulary of the existing translations for consistency (issue, project, label, workspace ...). Plural forms follow the language's rules in the `{1} ...|[2,4] ...|[5,*] ...` syntax.

## 3. Register the language

1. `resources/js/utils/locale.ts`: add `'de'` to `SUPPORTED_LOCALES` and `de: 'Deutsch'` to `LOCALE_NAMES` (the language's own name). The sidebar's "Languages" flyout, Settings > Preferences and the command palette list `SUPPORTED_LOCALES` automatically.
2. `app/Http/Middleware/SetLocale.php`: add `'de'` to `SUPPORTED`. The language cookie (see below) is ignored for any value that is not listed.
3. `resources/js/utils/time.ts`: add `de` to `intlLocale()` (`'de-DE'`) so dates, weekdays and numbers follow it.
4. `resources/js/Components/Atoms/LanguageFlag/LanguageFlag.tsx`: draw the flag for the code (a simple inline SVG; an unknown code shows a grey tile).
5. `config/app.php` / `.env`: only change `APP_LOCALE` if the default language changes (it stays `en`).

The Vite plugin turns `lang/de/*.php` into `lang/php_de.json` on the next `npm run dev` (restart it; the file is git-ignored) and the language is fetched on demand, so it adds nothing to the first load.

## 4. How the chosen language travels

- The browser keeps the choice in `localStorage` (`locale`) and in a plain `locale` cookie (`storeLocale()` writes both; the cookie is excluded from encryption in `bootstrap/app.php`).
- `SetLocale` reads the cookie on every web request (then the session, then `APP_LOCALE`), so validation errors, flash messages and pagination labels come back in the same language, for guests on the login page too.
- Frontend code that reads a server text must not depend on its wording (see guide 02, step 4).

## 5. Check it

```bash
npx tsc --noEmit -p . && npx vitest run
php artisan test --filter=SetLocale
```

Then open the app, switch to the new language in the sidebar menu, in Settings > Preferences and with the command palette (`mod+k` > "Change language…"), and look for English that is left.
