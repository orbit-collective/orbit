# The language switchers

Three places change the language; all of them go through `hooks/useLanguage.ts` (`{ locale, locales, setLanguage }`), so one change shows everywhere at once and is remembered (`storeLocale()`).

| Where | Code |
|---|---|
| Sidebar user menu, "Languages" flyout | `Organisms/Sidebar/Sidebar.tsx` - a `Dropdown` option with `children` (a generic submenu: opens on click, Enter or ArrowRight) |
| Settings > Preferences > Language | `AccountSettingsLanguageCard.tsx` - a button per language with its flag (`Atoms/LanguageFlag`), each a Tab stop, arrow keys move the focus |
| Command palette > "Change language…" | `hooks/useGlobalCommands.ts` - command `language`, whose `children()` lists `language.<code>` commands (same pattern as "Change status…" on an issue) |

A new language shows up in all three with no change besides the list in `utils/locale.ts` (and its flag), see [03](03-add-a-new-language.md).

To add a fourth place, call `useLanguage()` and use `setLanguage(code)`; never call the provider's `setLocale` directly, or the choice is not remembered for the server and the next visit.
