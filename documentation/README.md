# Orbit developer documentation

Step-by-step, copy-pasteable guides for extending subsystems in this
codebase, available in two languages:

- **[English →](./en/README.md)**
- **[Polski →](./pl/README.md)**

Both folders mirror the same structure and file names, one subfolder
per subsystem/feature area (see `en/README.md`/`pl/README.md` for the
full layout).

## Keeping both languages in sync

Every guide must exist in both `en/` and `pl/`, at the same relative
path. When adding or updating a guide:

1. Write/update the English version in `en/`.
2. Translate the **prose** into Polish for the matching file in `pl/`.
3. Leave every code block **verbatim** — file paths, PHP/TypeScript
   code, JSON, shell commands, and inline code comments stay in
   English exactly as written, since they must match (or be directly
   copy-pasteable into) real files in this repo. Only translate the
   surrounding explanatory text, headings, and prose.

This is also the rule to follow for `CLAUDE.md`'s "add a guide for
anything genuinely new" instruction — a new guide isn't done until
both language versions exist.
