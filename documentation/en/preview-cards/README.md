# Preview cards

A preview card is the small floating card that appears when you hover
something that stands for a bigger object, so you can see what it is
without leaving the page. Orbit has two:

- **`IssuePreviewCard`** — title, status, priority, labels, assignee and
  dates of an issue. Shown on a calendar chip and on a `#2` issue mention
  inside a comment.
- **`UserPreviewCard`** — avatar, name, email and the issues a person
  changed most recently. Shown when you hover (or keyboard-focus the
  control around) a user's avatar.

## Guides, in the order you'd actually need them

1. **[Show an issue preview card](./01-show-an-issue-preview-card.md)** —
   the two ways to feed `IssuePreviewCard`: data you already have (the
   calendar) and data fetched on hover (issue mentions).
2. **[Show a user preview card](./02-show-a-user-preview-card.md)** — use
   `UserAvatar` and `UserBadge`, how the endpoint decides who may be seen,
   and how to add a field to the card.

## The architecture in one paragraph

A preview card is a presentational molecule that only receives data and an
`anchorRect` (the `DOMRect` of whatever was hovered). It draws itself with
`position: fixed` next to that rect, below it when there is room and above
it otherwise, measures its own height with `useLayoutEffect` so the
placement is exact, and is `pointer-events-none` so it never steals the
hover. Whoever owns the trigger renders the card through
`createPortal(..., document.body)`, so no `overflow: hidden` ancestor can
clip it. Cards that need data the page does not already have load it
lazily from a small JSON endpoint on hover, cache it for 30 seconds in a
module-level `Map`, and drop a response that arrives after the pointer
left. Only the user card has its own wrapper component, `UserAvatar`
(`resources/js/Components/Molecules/UserAvatar/UserAvatar.tsx`), because
avatars appear in dozens of places; the plain `Avatar` atom knows nothing
about previews, which keeps atoms below molecules.
