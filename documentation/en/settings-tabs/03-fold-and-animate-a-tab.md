# Fold and animate a settings tab

Every settings tab rises in with the same choreography and its panels fold from
their header, with the choice remembered per browser. `SettingsLayout` provides
all of it; a tab only opts in. Everything below uses the shared motion tokens in
`resources/js/utils/motion.ts` and the focus ring in `resources/js/utils/focusRing.ts`
(see the [Developer Portal guide](../developer-portal/README.md#motion-and-accessibility)).

## What the layout already does

File: `resources/js/Components/Organisms/SettingsLayout/SettingsLayout.tsx`

- Wraps the page in `<MotionConfig reducedMotion="user">`.
- The heading, then the tab's panels, rise in one after another (a
  `staggerParent` with `riseIn` children). A full-bleed tab rises once, as a
  block.
- Provides `SettingsSectionsProvider` (`context/SettingsSectionsContext.tsx`),
  keyed `settings-sections:<tabId>`, which remembers which panels are folded and
  counts the ones that opted in.
- Shows `CollapseAllButton` next to the heading once two or more panels can fold
  (never for a full-bleed tab).

## Step 1 — Give each panel an id

```tsx
<SettingsPanel
    id="taxonomy"
    collapsedSummary={`${labels.length} labels`}
    title="Label taxonomy"
    icon="Tag"
>
    ...
</SettingsPanel>
```

- `id` makes the panel foldable: unique within the tab, stable, used as the
  storage key. Without it the panel stays fixed.
- `collapsedSummary` is shown in the header while the panel is folded, so a
  closed panel still says something (a count, the current choice).
- `defaultCollapsed` sets the first-visit state. Use it sparingly: a danger zone
  or an account deletion panel starts folded (see `DangerZonePanel`, the Security
  tab), most panels start open.
- The body stays mounted while folded (state inside survives) but is
  `visibility: hidden`, out of the TAB order. Panels inside the shared molecules
  (`DangerZonePanel`, `OwnershipPanel`, `InviteByEmailPanel`, `JoinWithCodePanel`,
  `PendingInvitationsPanel`, `ProjectPickerPanel`) already have ids, so every tab
  using them folds them.
- A panel whose parent controls collapsing itself (`collapsed` +
  `onToggleCollapse`, as the Developer Portal does) ignores the id, and a screen
  that animates its own sections turns the panel entrance off with
  `PanelRiseContext`.

## Step 2 — Animate the rows

Rows inside a foldable panel cannot inherit the page's entrance (the panel body
animates open and closed), so they start on their own with `RowReveal`:

```tsx
{labels.map((label, index) => (
    <RowReveal key={label.id} index={index} className="flex items-center gap-3 px-4 py-2.5">
        ...
    </RowReveal>
))}
```

The stagger is capped (ten rows), so a long list does not crawl. Keep stable
keys: a reorder then moves rows without replaying the entrance. Use
`<Reveal key={selectedId}>` when a detail view should rise again as the
selection changes (the role detail, the automation flow), `Collapse` with
`unmountWhenClosed` for something that opens inside a row (the avatar library),
and `AnimatedNumber` for counts in a `StatCard`.

## Step 3 — Tests

- Render the tab inside `inSettingsPage(...)` from `resources/js/tests/settingsPanels.tsx`
  and call `expectPanelsToFold([/Panel title/])`; that helper folds and unfolds
  each named panel and checks `aria-expanded`.
- Animations jump to their end state under test, but state that settles through
  one (a row's visibility, a swapping label, an unmounting body) needs
  `findBy…` or `waitFor`. A story's `play` function that asserts `toBeVisible`
  on an animated row does the same.
- Assert the summary through `screen.getByTestId('collapsed-summary')`.

Not covered: the Export and Documents tabs are disabled placeholders; give their
panels ids when they are enabled.
