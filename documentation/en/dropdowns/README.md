# Dropdowns

Every dropdown in Orbit — filters, the issue sidebar's pickers, the
user menu, the column settings, row actions — is one component:
`Dropdown` (`resources/js/Components/Molecules/Dropdown/Dropdown.tsx`).
It owns the look (a soft dark surface with no border), search, "Clear" /
"Select all", keyboard navigation, positioning and focus handling, so
a new dropdown only decides *what it contains*.

## Guides, in the order you'd actually need them

1. **[Add a dropdown](./01-add-a-dropdown.md)** — worked example for
   each variant: `select`, `multiselect`, `menu` and `panel`.

## The architecture in one paragraph

`Dropdown` takes a `variant` and any `trigger` element, renders its
panel into a portal and positions it with `useFloatingDropdown`
(`resources/js/hooks/useFloatingDropdown.ts`), which also closes it on
outside click / Escape and flips it above the trigger when there is no
room below. The panel is made of two atoms — `DropdownPanel` (the
surface) and `DropdownOption` (one row) — which you can also use
directly for floating UI that isn't anchored to a trigger, like the
"@mention" list. Thin, domain-specific wrappers sit on top:
`InlineSelectDropdown`, `EditableSelect`, `EditableLabelList`,
`FilterDropdown`, `SavedFiltersDropdown`, `SelectionDropdown` and
`MemberRoleDropdown`. Their props are the app's concern; the
behavior is `Dropdown`'s. Types live in `resources/js/types/Dropdown.ts`.
