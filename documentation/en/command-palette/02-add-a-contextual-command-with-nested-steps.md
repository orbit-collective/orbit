# Add a contextual command with nested steps

Worked example: the issue page's **Change status…**. It depends on the
current issue, opens a second list ("a step") of the statuses the
workflow allows, hides itself when the user may not change status, and
applies the choice through the existing `issues.update` route. The same
shape gives **Change priority…**, **Assign to…** and **Labels…**.

## The four ideas

1. **`children()` opens a step.** A command with `children` does not
   `perform`; the palette pushes a page of whatever `children()` returns,
   shows a breadcrumb (`#12 › Change status…`) and goes back on Esc or on
   Backspace in an empty input.
2. **`when()` hides, never disables.** Gate every mutating command on the
   ability the controller enforces. The backend tells the page what the
   user may do; the frontend never guesses.
3. **Rebuild on every render.** The commands are built from the page's
   props, so a step that shows state (the labels checklist) reflects it
   once the page re-renders after the mutation.
4. **`keepOpen` for multi-select.** A command with `keepOpen: true` runs
   without closing the palette, so labels can be toggled one after another.

## Step 1 — Expose what the user may do

File: `app/Http/Controllers/IssueController.php`

```php
'issueAbilities' => $this->issueAbilities($request, $issue),
```

```php
private function issueAbilities(Request $request, Issue $issue): array
{
    $user = $request->user();

    return [
        'update' => $user->can('update', $issue),
        'changeStatus' => $user->can('changeStatus', $issue),
        'assign' => $user->can('assign', $issue),
        'changePriority' => $user->can('changePriority', $issue),
        'changeLabels' => $user->can('changeLabels', $issue),
    ];
}
```

These mirror the gates in `update()`: a change needs `update` **plus**
the ability of the field it touches. File:
`resources/js/types/Issues.ts` has the matching `IssueAbilities` type;
add the field there and to `IssuePageProps` in `types/Components.ts`.
Test it next to `'the issue page exposes what the acting user may change'`
in `tests/Feature/IssueControllerTest.php` with a member and a viewer.

## Step 2 — Build the commands from the page's data

File: `resources/js/utils/issueCommands.ts` (a pure function, so it is
testable without React)

```ts
{
    group: 'suggested',
    scope: 'issue',
    context: '#12',
    id: 'issue.status',
    title: 'Change status…',
    subtitle: issue.workflowStatus?.name,
    icon: 'CircleDot',
    keywords: ['workflow', 'transition', 'state', 'move'],
    when: () =>
        canUpdate && abilities.changeStatus && statusSteps().length > 0,
    children: statusSteps,
},
```

`statusSteps()` returns plain commands whose `perform` calls the page's
update helper:

```ts
const statusSteps = (): Command[] =>
    getReachableStatuses(issue)
        .filter((status) => status.id !== currentStatusId)
        .map((status): Command => ({
            id: `issue.status.${status.id}`,
            title: status.name,
            group: 'suggested',
            icon: 'Circle',
            iconColor: status.color,
            perform: () => ctx.update({ workflow_status_id: status.id }),
        }));
```

- `context` is the first breadcrumb crumb (`#12`).
- `group: 'suggested'` puts the issue's own commands at the top, above
  project and global ones.
- Only offer what the backend would accept: `getReachableStatuses`
  (`utils/workflow.ts`) follows `WorkflowTransition`, the same rule
  `WorkflowService::assertTransitionAllowed` enforces.

For a checklist step, add `keepOpen: true` and show state with the icon
and subtitle:

```ts
{
    id: `issue.labels.${label.id}`,
    title: label.name,
    subtitle: active ? 'Added' : undefined,
    icon: active ? 'SquareCheck' : 'Square',
    iconColor: label.color,
    keepOpen: true,
    perform: () => ctx.update({ labels: nextLabels }),
}
```

## Step 3 — Register them while the page is mounted

File: `resources/js/hooks/useIssueCommands.ts`, called from
`resources/js/Pages/Issues/Show.tsx`

```tsx
useIssueCommands({
    project,
    issue,
    ancestors,
    users,
    labels,
    abilities: issueAbilities,
    update: updateIssue,
});
```

The hook memoizes `buildIssueCommands(...)` and passes it to
`useCommands`. Two things keep it from looping — each re-registration
re-renders the page:

- give omitted props a **module-level** default (`const NO_LABELS: ProjectLabel[] = []`),
  never a fresh `[]` per render;
- read volatile callbacks such as `addAlert` through a ref instead of
  putting them in the dependency list.

An open step re-reads its list from the command that opened it (matched
by `id`), which is why the checklist updates in place.

## Tests

- Builder (`utils/issueCommands.test.ts`): each ability hides exactly its
  command, allowed transitions only, what each step sends through
  `update`, labels add/remove.
- Page (`Pages/Issues/Show.test.tsx`): it registers the commands, hides
  the mutating ones without abilities, and a palette edit calls
  `router.patch('/issues.update/<id>', ...)`.
- Palette (`CommandPalette.test.tsx`): breadcrumb context, `keepOpen`
  stays open and reflects new state.
