# Command palette

`mod+k` (⌘K on macOS, Ctrl+K elsewhere) opens one keyboard-first entry
point for the whole app: run any command, jump to an issue or project,
find a teammate's issues, and act on the issue you are looking at —
without touching the mouse. `/` opens it in search mode, `?` opens the
read-only shortcut reference instead.

## Guides, in the order you'd actually need them

1. **[Add a global command](./01-add-a-global-command.md)** — a command
   that exists on every page (navigation, preferences, account), or one a
   single component registers while it is mounted, with an optional
   keyboard shortcut.
2. **[Add a contextual command with nested steps](./02-add-a-contextual-command-with-nested-steps.md)**
   — the pattern behind the issue page's "Change status…", "Labels…" and
   "Assign to…": commands that depend on the current page, open a step,
   and only appear when the user may perform them.
3. **[Add a search source](./03-add-a-search-source.md)** — a new kind of
   result (like issues, projects or people) found through the internal
   `GET /command-palette/search` endpoint.

## The architecture in one paragraph

A **command** is not a shortcut: every action the palette can run is a
`Command` (`resources/js/types/Commands.ts`) and a keybinding is just an
optional `shortcut` attribute of it. `CommandProvider`
(`resources/js/context/CommandContext.tsx`) holds the registry, the open
state and a stack of nested *steps*; components register commands for as
long as they are mounted with `useCommands()` (same lifecycle as
`useShortcuts()`), and the app-wide ones live in `useGlobalCommands`.
While a command is registered, its `shortcut` is handed to the shortcut
engine (see [`../shortcuts/`](../shortcuts/README.md)), so the palette
row, its shortcut chip and the help view all come from one definition.
The `CommandPalette` organism renders the registry: local commands are
fuzzy-ranked on the client and appear instantly; **issues**, **projects**
and **people** come from the server (`usePaletteSearch`, debounced
150ms, stale responses cancelled) and stream in below them. The first
character can scope the search: `>` commands only, `#` issues only
(`#42` is the project-scoped number users see), `@` people only.

## Where things live

| Concern | File |
|---|---|
| `Command`, groups, search result types | `resources/js/types/Commands.ts` |
| Registry, open state, step stack, shortcut bridge | `resources/js/context/CommandContext.tsx` |
| Register commands from a component | `resources/js/hooks/useCommands.ts` |
| App-wide commands | `resources/js/hooks/useGlobalCommands.ts` |
| Contextual issue commands | `resources/js/utils/issueCommands.ts`, `resources/js/hooks/useIssueCommands.ts` |
| Fuzzy match and ranking | `resources/js/utils/fuzzyScore.ts`, `resources/js/utils/commandSearch.ts` |
| Prefix parsing (`>` `#` `@`) | `resources/js/utils/paletteQuery.ts` |
| Server search hook, history, result mapping | `resources/js/hooks/usePaletteSearch.ts`, `resources/js/utils/commandHistory.ts`, `resources/js/utils/paletteEntities.ts` |
| UI | `resources/js/Components/Organisms/CommandPalette/`, `Molecules/CommandPalette{Input,Group,Item}/` |
| Search endpoint | `app/Http/Controllers/CommandPaletteController.php`, `app/Services/CommandPaletteSearchService.php` |

## Rules that keep it correct

- **Never offer what the user cannot do.** Hide a command with `when()`
  on the same ability the controller enforces; hidden, not disabled.
- **Mutations reuse the existing routes** (`router.patch(route('issues.update', id), ...)`),
  so validation, workflow transitions, activity logs and notifications
  stay in one place.
- **Server search is scoped to the user's project memberships** in the
  repository query itself, and every source needs a test with a
  non-member.
- **Memoize what you register.** `useCommands(commands)` re-registers
  whenever the array identity changes, which re-renders its consumers; an
  unstable array (a fresh `[]` default prop) loops.
- **Theme variables only, and AA contrast.** Use `--text-gray-color`, not
  `--text-muted-color`, for palette text: the muted token fails 4.5:1 on
  both themes. `paletteContrast.test.ts` checks every pair the palette
  uses against `global.css`.
