# Presence and edit hints

Presence answers "who else has this open?" and carries small client-to-client
hints ("Ada is editing the description"). It uses a Reverb **presence channel**
and *whispers*: messages that go from one browser to the others and never touch
the server or the database. The worked example adds an avatar stack to a
hypothetical milestone page.

## Step 1 — Authorise the channel

File: `app/Broadcasting/LiveChannels.php`

A presence channel's authorisation returns the card the others will see, or
`false` to refuse:

```php
    /**
     * The member card shown to the others on an issue's presence channel, or
     * false when the user may not see the issue. Same fields every project
     * member can already read in the members list.
     *
     * @return array{id: int, name: string, avatar: string|null}|false
     */
    public static function joinIssue(User $user, int $issueId): array|false
    {
        $issue = Issue::query()->select(['id', 'project_id'])->find($issueId);

        if ($issue === null || ! self::canJoinProject($user, $issue->project_id)) {
            return false;
        }

        return ['id' => $user->id, 'name' => $user->name, 'avatar' => $user->avatar];
    }
```

File: `routes/channels.php`

```php
Broadcast::channel('issue.{issueId}', fn ($user, int $issueId) => LiveChannels::joinIssue($user, $issueId));
```

Only put what every other viewer may already see in the card. Add a
`LiveChannels::milestone(int $id)` name helper and a matching `joinMilestone`
for the new page, plus tests next to `LiveChannelsTest.php` (a member joins, a
stranger is forbidden, a missing record is refused).

## Step 2 — Join it in the page

File: `resources/js/live/usePresence.ts`

`usePresence(channel, currentUserId, onWhisper?)` joins `presence-<channel>`
while the component is mounted and returns the **other** people (never the
current user, however many tabs they have open) and `whisper(event, data)`:

```tsx
const currentUserId = usePage().props.auth.user.id;
const { others: viewers, whisper } = usePresence(
    `milestone.${milestone.id}`,
    currentUserId,
);
```

It does nothing while live updates are off, so the page works without Reverb,
only without the avatars.

## Step 3 — Show the people

File: `resources/js/Components/Molecules/PresenceStack/PresenceStack.tsx`

```tsx
<PresenceStack users={viewers} />
```

Overlapping avatars, "+N" past `max` (default 4), names on hover and for screen
readers, nothing at all when nobody else is here. The issue page puts it in the
header through the `presence` slot of `IssuePageHeader`.

## Step 4 — Warn about concurrent edits

A whisper is how one editor tells the others. The issue page does this for the
description (`resources/js/Pages/Issues/Show.tsx`):

```tsx
const [descriptionEditors, setDescriptionEditors] = useState<Set<number>>(new Set());
const editingDescription = useRef(false);
const { others: viewers, whisper } = usePresence(
    `issue.${issue.id}`,
    currentUserId,
    (event, data) => {
        const userId = Number(data.userId);
        setDescriptionEditors((current) => {
            const next = new Set(current);
            if (event === 'editing') next.add(userId);
            else next.delete(userId);
            return next;
        });
    },
);
const announceEditing = useCallback(
    (editing: boolean) => {
        editingDescription.current = editing;
        whisper(editing ? 'editing' : 'stopped-editing', { userId: currentUserId });
    },
    [whisper, currentUserId],
);
// Someone who joins while this person is editing missed the hint.
useEffect(() => {
    if (editingDescription.current) announceEditing(true);
}, [viewers.length, announceEditing]);
```

- `EditableMarkdown` has an `onEditingChange(editing)` prop that fires when the
  editor opens and closes.
- `ConcurrentEditNotice` shows the warning (`names`, `subject`), and only for
  people who are *still present*: the names are filtered through `viewers`, so
  someone who closed the tab drops out without sending `stopped-editing`.
- Whisper event names are limited to `editing` and `stopped-editing` in
  `usePresence`; add yours to that list.

Reverb accepts client events only from channel members
(`REVERB_APP_ACCEPT_CLIENT_EVENTS_FROM`, default `members`), so a stranger cannot
whisper into the channel. The hint is advisory, not a lock: nothing stops a
second person saving, and the last save wins.

## Step 5 — Tests

`usePresence.test.tsx` mocks `getEcho` and drives `here`, `joining`, `leaving`
and the whispers. For a page, mock `@/live/usePresence` the way
`Pages/Issues/Show.test.tsx` does and call the whisper callback it captured.
`PresenceStack` and `ConcurrentEditNotice` have component tests and stories.
