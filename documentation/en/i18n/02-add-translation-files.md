# Add translation files for a new component, page or hook

Every text a user can read lives in a language file, never in the component. This guide is the full checklist for giving a new piece of UI its texts.

## 1. Pick the file name

One file per component, page, hook or util, named in `snake_case` after it, the same in every language folder:

| You build | File |
|---|---|
| `Components/Molecules/CommentForm` | `comment_form.php` |
| `Pages/Settings/Labels.tsx` | `page_labels.php` |
| `hooks/useRolesManagement.ts` | `hook_roles_management.php` |
| `utils/dueDate.ts` | `util_due_date.php` |
| several tiny siblings (`AccountSettings*`) | one shared file with nested sections: `account_settings.php` |

The file name is the first part of every key: `comment_form.placeholder`, `account_settings.profile.title`. `common.php` holds generic words (`common.cancel`, `common.save`, ...); use them when the English text is exactly that word, otherwise keep your own copy in your file - duplicates are fine.

## 2. Create both files

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

`lang/pl/comment_form.php` has the **same keys** in Polish:

```php
return [
    'placeholder' => 'Napisz komentarz…',
    'submit' => 'Skomentuj',
    'hint' => [
        'send' => 'aby wysłać',
    ],
    'count' => '{1} :count komentarz|[2,4] :count komentarze|[5,*] :count komentarzy',
    'edited_by' => 'Edytowane przez :name',
];
```

Rules (the Vite plugin reads the files with a small PHP array parser, not PHP):

- Only string literals and nested arrays. No concatenation, constants, `sprintf`, `__()` or other function calls.
- Escape a `'` inside a single-quoted string as `\'`, or use double quotes (and `\n` for a line break).
- Placeholders are `:name`; the Polish text must use the same ones.
- Plurals are `one|other` in English and `{1} ...|[2,4] ...|[5,*] ...` in Polish; read them with `tChoice(key, count)`.
- Do not edit the framework files (`auth.php`, `pagination.php`, `passwords.php`, `validation.php`) for UI texts - they are the backend's messages.

## 3. Use the keys

```tsx
import { useLaravelReactI18n } from 'laravel-react-i18n';

const { t, tChoice } = useLaravelReactI18n();

<textarea placeholder={t('comment_form.placeholder')} />
<span>{tChoice('comment_form.count', comments.length)}</span>
<span>{t('comment_form.edited_by', { name: user.name })}</span>
```

- Never call `t` at module scope (the language is not known yet). A constant that lists options stores the **key**, and the component translates it at render:

  ```tsx
  const COLUMNS = [{ id: 'title', label: 'issue_table.columns.title' }];
  // ...
  {COLUMNS.map((c) => <th key={c.id}>{t(c.label)}</th>)}
  ```

- A pure helper in `utils/` takes an optional `t` (`(key, replacements?) => string`) and falls back to English without it, or returns a key for the caller to translate.
- A sentence with a link or `<kbd>` inside is split into pieces around the element **per sentence order of the language** - or use one key with a placeholder - so Polish can reorder the words.
- Dates and numbers: `intlLocale(currentLocale())` from `utils/time.ts` gives the tag `Intl` / `toLocale*String` wants.
- Do **not** translate user data (project, issue, label, status, priority and role names), values the server sends as ids or enums, brand names (Orbit, GitHub, Jira) and keyboard key names.

## 4. Text that comes from the server

The server's own texts (validation errors, flash messages, pagination labels) are already in the user's language, see [03 - Add a new language](03-add-a-new-language.md). Never match them by their wording in the frontend (`label.includes('Previous')`): tell them apart by position or id, as `Pagination` does.

A catalog the server sends in English (widget names, trigger labels) is mapped by id to keys with the server text as the fallback - see `utils/dashboardCatalogText.ts` and `automationTypeLabel()` in `utils/automationMeta.ts`. A new catalog entry then works untranslated until you add its keys.

## 5. Check it

```bash
npx vitest run resources/js/tests/translations.test.ts
```

It fails when `en` and `pl` have different keys or `:placeholders`, when a text is empty, or when a literal `t('file.key')` in the source has no key. Dynamic keys (``t(`file.${x}`)``) are not checked - add every value by hand. Tests of your component keep asserting the **English** text: Vitest answers `t()` from `lang/en/*.php`.
