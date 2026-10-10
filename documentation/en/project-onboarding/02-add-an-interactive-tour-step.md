# Add an interactive tour step

Worked example: a tour step that asks the user to fill in a field
themselves. This is how the optional "create your first project"
chapter (`PROJECT_CHAPTER_STEPS` in `resources/js/types/Tour.ts`)
teaches the real "New project" form.

On a normal step the page is blocked and the arrow moves on. On an
**interactive** step the spotlighted element stays usable — the rest
of the page stays blocked — and the popover shows a hint such as
"Type a project name".

## Step 1 — Mark the elements

Wrap each field (label + input) in an element with `data-tour`. For
`input` steps the tour finds the `<input>`/`<textarea>` inside the
wrapper, focuses it and reads its value.

File: `resources/js/Components/Organisms/NewProjectModal/NewProjectModal.tsx`

```tsx
<div data-tour="project-name" className="flex flex-col gap-1.5">
    <label>Project name</label>
    <Input value={data.name} onChange={...} />
</div>
```

## Step 2 — Describe the interaction

File: `resources/js/types/Tour.ts`

```ts
{
    id: 'project-name',
    target: 'project-name',
    placement: 'right',
    backTo: 'project-open',
    when: needsProjectChapter,
    title: 'Name it',
    description: 'Pick something your team will recognise.',
    interaction: {
        type: 'input',
        required: true,
        hint: 'Type a project name',
    },
},
```

`interaction.type` is one of:

- `click` — the user clicks the target; the arrow clicks it for them.
  The tour advances right after the click. Add
  `advance: 'external'` plus `completeWhen` to wait for something
  else instead — the "Create project" step advances only once the
  `hasProjects` shared prop turns `true`, so a validation error
  doesn't skip ahead.
- `input` — typing into the field inside the target. With
  `required: true` the arrow stays disabled until the field has a
  value.
- `free` — the user may poke at the target (e.g. pick a color);
  the arrow simply moves on.

`backTo` names an earlier step to jump back to if the target
disappears mid-step (for example the user closed the modal), so the
tour never strands on a step. Pressing the back arrow from such a
step also closes the modal it lives in.

## Step 3 — Place it in a chapter

Steps in `PROJECT_CHAPTER_STEPS` use `when: needsProjectChapter`, so
they only appear for accounts with no project that haven't been
through the chapter. `TOUR_STEPS` spreads the chapter in before the
final step; `getTourSteps()` serves it on its own to accounts that
already finished the main tour.

Set `sidebar: true` on steps whose target is in the sidebar (opens
the mobile drawer) and leave it off for steps inside a modal.

## Behaviors worth knowing

- Layers sit above `Modal` (`z-[1000]`), at `z-[1100]`/`z-[1101]`.
- Escape is ignored on interactive steps (the modal owns it), and
  ←/→ are ignored while typing so the caret keeps working.
- The popover doesn't steal focus or trap Tab on interactive steps.

## Step 4 — Test it

- `resources/js/Components/Organisms/ProductTour/ProductTour.test.tsx`
  (`interactive steps`) — click, input, `completeWhen`, `backTo`.
- `resources/js/types/Tour.test.ts` — which steps each kind of
  account gets, and that every `backTo` points at an earlier step.
