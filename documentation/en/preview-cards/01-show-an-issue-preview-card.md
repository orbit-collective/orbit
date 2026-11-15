# Show an issue preview card

`IssuePreviewCard`
(`resources/js/Components/Molecules/IssuePreviewCard/IssuePreviewCard.tsx`)
takes an `Issue` and the rectangle of the element being hovered:

```ts
export interface IssuePreviewCardProps {
    issue: Issue;
    anchorRect: DOMRect;
    /** 'top' always sits above the anchor; 'auto' prefers below when it fits. */
    placement?: 'auto' | 'top';
}
```

It is always rendered into `document.body` with `createPortal`, by the
component that owns the hovered element. There are two situations, and
the difference is only where the `Issue` comes from.

## Case A — you already have the issue

The calendar has every visible issue in its props, so it keeps the hovered
one in state and renders the card from it.

File: `resources/js/Components/Organisms/CalendarView/CalendarView.tsx`

```tsx
const [preview, setPreview] = useState<{
    issue: Issue;
    rect: DOMRect;
} | null>(null);
```

On the hovered element, store the issue together with the element's rect
and clear it on leave:

```tsx
onMouseEnter={(e) =>
    setPreview({
        issue,
        rect: e.currentTarget.getBoundingClientRect(),
    })
}
onMouseLeave={() =>
    setPreview(null)
}
```

Then render the card once, at the end of the component:

```tsx
{preview &&
    createPortal(
        <IssuePreviewCard
            issue={preview.issue}
            anchorRect={preview.rect}
        />,
        document.body,
    )}
```

## Case B — you only have an id

An issue mention in a comment only knows the project and issue ids, so the
data is loaded when the pointer enters. `IssueMentionLink`
(`resources/js/Components/Molecules/IssueMentionLink/IssueMentionLink.tsx`)
is the reference implementation. The endpoint it calls is
`GET /projects/{project}/issues/{issue}/preview`
(`IssueController::preview`, route name `projects.issues.preview`), which
authorizes `view` on the project, 404s for an issue of another project and
returns only the fields the card shows (`previewPayload()`).

The pieces to copy:

1. **A module-level cache with a short life**, so hovering the same
   mention repeatedly does not refetch, but a renamed or reassigned issue
   does not stay stale:

   ```tsx
   const PREVIEW_TTL_MS = 30_000;
   const previewCache = new Map<
       string,
       { data: IssueSuggestion; fetchedAt: number }
   >();
   ```

2. **A ref that records whether the pointer is still there**, because the
   request is asynchronous and the user may have left before it finished:

   ```tsx
   const hoveredRef = useRef(false);
   ```

3. **`toPreviewIssue()`** (`resources/js/utils/mentions.ts`) to turn the
   endpoint's payload into the `Issue` shape the card renders. The payload
   deliberately carries only the displayed fields, so the rest of `Issue`
   stays unset.

4. **`placement="top"`** when the trigger is inline text, so the card never
   covers the line being read:

   ```tsx
   <IssuePreviewCard
       issue={preview.issue}
       anchorRect={preview.rect}
       placement="top"
   />
   ```

## Rules for any trigger

- Pass `e.currentTarget.getBoundingClientRect()` (or `element.getBoundingClientRect()`),
  never the rect of a child, so the card lines up with what the user sees.
- The card is `pointer-events-none`. Do not wrap it in something that
  captures the pointer, or the hover will flicker.
- The card's text comes from `lang/{en,pl}/issue_preview_card.php`
  (`no_status`, `no_priority`, `unassigned`). A new label goes into both
  files.

## Tests

- `resources/js/Components/Molecules/IssuePreviewCard/IssuePreviewCard.test.tsx`
  and `IssuePreviewCard.stories.tsx` for the card itself.
- `resources/js/Components/Molecules/IssueMentionLink/IssueMentionLink.test.tsx`
  for the lazy-loading pattern, including the cache and the pointer
  leaving early.
- `tests/Feature/IssueControllerTest.php` (`issue preview returns the card
  data for an issue in the project`, `issue preview 404s for an issue of
  another project`, `issue preview is forbidden to non-members`) for the
  endpoint.
