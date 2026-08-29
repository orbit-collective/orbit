# Label colors

Issue labels (`bug`, `feature`, `performance`, `design`, `ux`,
`chore`) each have a fixed color dot rendered next to them
(`LabelBadge`) — a **third** color system in this codebase, entirely
separate from [theme colors](../theme-colors/README.md) and
[accent colors](../accent-colors/README.md): a label's color is part
of its identity, the same reasoning
[`../accent-colors/02-use-the-accent-color-in-a-component.md`](../accent-colors/02-use-the-accent-color-in-a-component.md)
gives for why a project's badge color doesn't use a theme token
either. Unlike the other two color systems, there's no context/
provider here at all — just a static map and a closed set of six
enum cases, currently duplicated across five places.

## Guides, in the order you'd actually need them

1. **[Add a new label](./01-add-a-new-label.md)** — worked example
   adding a seventh label, `security`, across every one of the five
   places that need it.

## The architecture in one paragraph

`App\Enums\IssueLabel` (backend) and `IssueLabel` (frontend,
`resources/js/types/Issues.ts`) are two independently-maintained
closed unions of the same six string values — no codegen keeps them in
sync, the same convention every other backend-enum/frontend-type pair
in this codebase follows (see
[`../architecture/03-frontend-architecture-and-atomic-design.md`](../architecture/03-frontend-architecture-and-atomic-design.md)).
`resources/js/utils/labelColors.ts`'s `LABEL_COLORS` maps each label
to a single hex value, read directly as an inline `style=` by
`LabelBadge` — no theme variants, since a label's color is meant to
look identical in dark and light mode, exactly like a project's own
badge color. Two more places hold their own hardcoded copy of the
same six-value list: `EditableLabelList`'s private `AVAILABLE_LABELS`
constant (the label picker shown when editing an issue) and
`FilterDropdown`'s `FILTER_CONFIG.labels.options` (the label filter in
the issue list toolbar) — neither imports from the other or from a
shared constant, so a new label needs its own line in both.
