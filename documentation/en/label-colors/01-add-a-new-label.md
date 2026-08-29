# Add a new label

Worked example: adding a seventh label, **`security`**. Five
production places need it (plus one test file's own hardcoded list) —
miss one and the new label either can't be assigned at all, renders
with no color, or is invisible in the filter dropdown, depending on
which one.

## Step 1 — Add the backend enum case

File: `app/Enums/IssueLabel.php`

```php
<?php

namespace App\Enums;

enum IssueLabel: string
{
    case BUG = 'bug';
    case FEATURE = 'feature';
    case PERFORMANCE = 'performance';
    case DESIGN = 'design';
    case UX = 'ux';
    case CHORE = 'chore';
    case SECURITY = 'security';
}
```

`Issue::labels` is cast via `AsEnumArrayObject::class.':'.IssueLabel::class`
(see `app/Models/Issue.php`) — this cast validates against the enum's
cases automatically, so no migration or seeder change is needed; the
column is already a plain JSON array of strings, and the new case is
valid the moment it exists.

## Step 2 — Add the frontend type

File: `resources/js/types/Issues.ts`

```ts
export type IssueLabel =
    'bug' | 'feature' | 'performance' | 'design' | 'ux' | 'chore' | 'security';
```

## Step 3 — Give it a color

File: `resources/js/utils/labelColors.ts`

```ts
export const LABEL_COLORS: Record<IssueLabel, string> = {
    bug: '#f44336',
    feature: '#2196f3',
    performance: '#9c27b0',
    design: '#00bcd4',
    ux: '#009688',
    chore: '#e91e63',
    security: '#ff5722',
};
```

Because `LABEL_COLORS` is typed `Record<IssueLabel, string>`,
TypeScript refuses to compile step 2 without this entry too — the one
part of this whole chain with a compiler safety net, the same
`Record<AccentColor, string>` situation
[`../accent-colors/01-add-a-new-accent-color.md`](../accent-colors/01-add-a-new-accent-color.md)
calls out for `accentLabels`. Pick a hex distinct enough from every
existing label's color — nothing enforces this, but
`resources/js/utils/labelColors.test.ts`'s own `'assigns a distinct
color to each label'` test will catch an exact duplicate.

## Step 4 — Make it selectable when editing an issue

File: `resources/js/Components/Molecules/EditableLabelList/EditableLabelList.tsx`

```ts
const AVAILABLE_LABELS: IssueLabel[] = [
    'bug',
    'feature',
    'performance',
    'design',
    'ux',
    'chore',
    'security',
];
```

Without this, `security` is a perfectly valid label an issue could
have (e.g. seeded directly into the database) but the label picker
UI has no way to add it to an issue that doesn't already have it —
this constant, not the `IssueLabel` type, is what the picker actually
renders options from.

## Step 5 — Make it filterable in the issue list

File: `resources/js/Components/Molecules/FilterDropdown/FilterDropdown.tsx`

```ts
labels: {
    paramKey: 'labels',
    label: 'Labels',
    multiSelect: true,
    options: ['bug', 'feature', 'performance', 'design', 'ux', 'chore', 'security'].map(
        (value) => ({
            value,
            render: () => <Badge color={value as any}>{value}</Badge>,
        }),
    ),
},
```

A third, independent hardcoded list — this one drives the label
filter checkboxes in the issue table/board toolbar, unrelated to
`AVAILABLE_LABELS` in step 4 or the `IssueLabel` type itself.

## Tests

- `resources/js/utils/labelColors.test.ts` — both existing tests
  iterate their own hardcoded `labels` array (not derived from
  `LABEL_COLORS`'s keys) — add `'security'` to it, or the new case
  simply won't be checked at all.
- `tests/Feature/Models/IssueTest.php` (or wherever `IssueLabel` cast
  behavior is covered) — if there's a test asserting the full set of
  valid labels, add `security` to its expected list.
- `resources/js/Components/Molecules/EditableLabelList/EditableLabelList.test.tsx` —
  add a case asserting `security` appears as a selectable option.
- `resources/js/Components/Molecules/FilterDropdown/FilterDropdown.test.tsx`
  (if one exists) — add `security` to whatever test enumerates the
  labels filter's options.
