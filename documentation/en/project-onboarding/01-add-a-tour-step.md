# Add a tour step

Worked example: adding a step about the "Refresh" button to the
interactive product tour every new account sees once.

The tour is a spotlight + anchored popover (back / next / close) that
navigates between pages on its own. Steps are plain data in
`resources/js/types/Tour.ts`; the elements they point at are marked
with a `data-tour` attribute.

## Step 1 — Mark the element

Add `data-tour="<id>"` to the element to spotlight. For a sidebar
`NavItem` pass the `tourId` prop instead, which renders the attribute.

File: `resources/js/Components/Organisms/PageHeader/PageHeader.tsx`

```tsx
<button
    onClick={handleRefresh}
    title="Refresh"
    data-tour="refresh"
    className="..."
>
```

## Step 2 — Add the step

File: `resources/js/types/Tour.ts`

```ts
{
    id: 'refresh',
    visit: '/',
    target: 'refresh',
    placement: 'bottom',
    title: 'Always up to date',
    description:
        'Pull in the latest changes from your team without reloading the page.',
},
```

Add it to `TOUR_STEPS` where it should appear in the flow. Fields:

- `target` — the `data-tour` value. Omit it for a centered card
  (welcome / finish steps).
- `placement` — preferred side of the target; the popover flips and is
  clamped to the viewport automatically.
- `visit` — the page the step lives on. A string is a fixed URL; a
  function can read the DOM and return a URL or `null` (see
  `firstProjectUrl`). The tour calls `router.visit` when the current
  path differs, and **skips** the step if the function returns `null`.
- `when` — return `false` to drop the step for this user (for
  example `hasProjects` hides the project-page steps for accounts
  without projects).

## Step 3 — Know the fallbacks

`useTourTarget` looks for the element for 2.5 s (pages render after
navigation). If it never appears, or it is hidden or off-screen (e.g.
the sidebar on mobile), the step is shown as a centered card — it
never blocks the tour.

## Step 4 — Test it

- `resources/js/Components/Organisms/ProductTour/ProductTour.test.tsx`
  — covers navigation, skipping and the centered fallback; add a case
  if your step uses a new `visit`/`when` pattern.
- `resources/js/utils/tour.test.ts` — only needed if you change the
  positioning logic.
