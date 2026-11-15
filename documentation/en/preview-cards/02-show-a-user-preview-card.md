# Show a user preview card

`UserPreviewCard`
(`resources/js/Components/Molecules/UserPreviewCard/UserPreviewCard.tsx`)
shows a person's avatar, name, email and up to three recently changed
issues. You almost never render it yourself: you give an avatar a
`userId` and `UserAvatar` does the rest.

## Step 1 — Use `UserAvatar` instead of `Avatar`

File: `resources/js/Components/Molecules/UserAvatar/UserAvatar.tsx`

`UserAvatar` takes every prop of `Avatar` plus an optional `userId`:

```ts
export interface UserAvatarProps extends AvatarProps {
    /** When set, hovering the avatar shows that user's preview card. */
    userId?: number;
}
```

Without a `userId` it renders the plain `Avatar`, so it is safe to use
where the id is sometimes missing. Real usage, from
`resources/js/Components/Molecules/TeamAvatarStack/TeamAvatarStack.tsx`:

```tsx
<UserAvatar
    userId={member.id}
    src={member.avatar ?? undefined}
    initials={member.name.charAt(0)}
    size="lg"
/>
```

Where a component already renders a `UserBadge`, pass `userId` to the badge
instead; it forwards it:

```tsx
<UserBadge
    userId={issue.assignee?.id}
    avatarSrc={issue.assignee?.avatar}
    name={issue.assignee?.name ?? t('list_row.unassigned')}
    size="sm"
/>
```

Do **not** give `userId` to the avatars inside a dropdown's option list,
the sidebar's own user, or screens that list people who may not share a
project with the viewer (the developer portal's users panel): the card is
noise in a list of options, and for strangers the endpoint answers 404, so
nothing would open.

## Step 2 — Know what the avatar does

- **Hover** opens the card; leaving closes it.
- **Keyboard**: the avatar adds no tab stop of its own (it usually sits
  inside a button or link, and nesting a focusable element in another is
  invalid). Instead it opens while the closest surrounding `a[href]`,
  `button` or `[tabindex]` control has focus, and closes on blur. Escape
  closes it. An avatar that is not inside any focusable control opens on
  hover only.
- **Data** comes from `GET /users/{user}/preview` (route name
  `users.preview`) and is cached in the browser for 30 seconds.
- **Stale answers are dropped.** Each show or hide bumps a counter and a
  change of `userId` clears the card, so a slow response for person A can
  never appear beside person B's avatar.
- **One instance per control.** `Badge` repeats its children in a hidden
  tooltip, so `UserBadge` renders the plain `Avatar` there. If you build
  something similar, never mount two `UserAvatar`s under the same
  focusable control, or focusing it opens two cards.

## Step 3 — Understand who may be seen

File: `app/Http/Controllers/UserController.php` (`preview`), with the rules
in `app/Services/UserService.php` (`previewFor`):

```php
public function previewFor(int $viewerId, User $user): ?array
{
    if (! $this->userRepository->sharesProject($viewerId, $user->id)) {
        return null;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'avatar' => $user->avatar,
        'recentIssues' => $this->issueRepository
            ->recentlyEditedForUser($viewerId, $user->id)
            ->map(fn (Issue $issue) => [
                'id' => $issue->id,
                'number' => $issue->number,
                'title' => $issue->title,
                'project_id' => $issue->project_id,
                'workflowStatus' => $issue->workflowStatus?->toArray(),
                'updated_at' => $issue->updated_at?->toIso8601String(),
            ])
            ->values()
            ->all(),
    ];
}
```

The controller turns `null` into a 404. Two rules keep this from leaking
anything:

- A person is visible only if they share at least one project with the
  viewer (`UserRepository::sharesProject`), or are the viewer.
- Their issues are limited to projects the **viewer** belongs to
  (`IssueRepository::recentlyEditedForUser`). "Recently edited" means the
  issues the person created or is assigned to, newest `updated_at` first,
  because an issue does not record who last edited it.

## Step 4 — Add a field to the card

Worked example: show the date the person joined, as `created_at`.

1. **Payload** — add `'created_at' => $user->created_at?->toIso8601String(),`
   to the array returned by `UserService::previewFor`.
2. **Type** — add `created_at: string | null;` to `UserPreview` in
   `resources/js/types/Users.ts`.
3. **Card** — render it in `UserPreviewCard.tsx`, with its label in
   `lang/en/user_preview_card.php` and `lang/pl/user_preview_card.php`
   (both files, the parity test checks it).
4. **Tests** — assert the new key in
   `tests/Feature/UserPreviewControllerTest.php` and the rendered text in
   `UserPreviewCard.test.tsx`.

Never add something that should stay private (anything the viewer could not
already see on the person's profile in a shared project): the payload is
available to every teammate.

## Tests

- `tests/Feature/UserPreviewControllerTest.php` — the endpoint: teammate,
  issue ordering, issues of projects the viewer is not in, a stranger
  (404), self.
- `resources/js/Components/Molecules/UserAvatar/UserAvatar.test.tsx` —
  hover, late responses, changed `userId`, focus, Escape.
- `resources/js/Components/Molecules/UserBadge/UserBadge.test.tsx` — one
  preview, not one per tooltip copy.
- `resources/js/Components/Molecules/UserPreviewCard/UserPreviewCard.test.tsx`
  and `UserPreviewCard.stories.tsx` — the card.
