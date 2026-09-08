# Add @mention support to a free-text field

Worked example: the `@mention` system already built for issue comments —
type `@` in the comment box, pick a project member from a floating
suggestion list, and they get a "You were mentioned" notification
(`NotificationType::IssueMentioned`, via a new `IssueMentioned` event). This
guide documents that system end to end, both as "how it works" and as a
template for adding the same capability to a different free-text field
(a project description, an issue title, anything else backed by a plain
`<textarea>`).

`NotificationType::IssueMentioned` and its Account-settings row
(`AccountSettingsNotificationsTab.tsx`'s `defaultNotificationTypes` array)
already existed before this feature — this guide is about wiring a new
domain event into the pipeline behind an existing notification type, not
about adding the type itself (see
[`./01-add-a-new-notification-type.md`](./01-add-a-new-notification-type.md)
for that).

## The one rule that matters most here

**Track a mention by the user's id and an exact character range — never by
matching the typed `@Name` text against a list of names.** Two project
members can share a display name. If you resolve "who got mentioned" by
searching the comment body for `@Jane Cooper`, you can't tell which Jane
Cooper it means, and a client could — deliberately or not — end up
notifying the wrong one. Everywhere below (detection, tracking through
further edits, storage, and rendering) works with ids, not name strings.

## How composing a mention works (frontend)

### Step 1 — Detect an in-progress `@query` while typing

File: `resources/js/utils/mentions.ts`

```ts
export interface ActiveMention {
    query: string;
    start: number;
}

/**
 * Looks backward from the cursor for an in-progress "@mention": an "@"
 * preceded by start-of-text or whitespace, followed by up to two
 * space-separated words (enough to filter by first or first+last name) with
 * no line break in between. Returns the partial name typed so far and the
 * index of the "@" itself, or null if the cursor isn't inside a mention.
 */
export function findActiveMention(
    text: string,
    cursor: number,
): ActiveMention | null {
    const upToCursor = text.slice(0, cursor);
    const match = upToCursor.match(/(?:^|\s)@([^\s@\n]*(?:\s[^\s@\n]+)?)$/);

    if (!match) return null;

    const query = match[1];

    return { query, start: cursor - query.length - 1 };
}

/**
 * Ranks project members by how well their name matches the in-progress
 * mention query, limited to a handful of results so the floating menu stays
 * short. Matching is by name only (it's just filtering candidates to show),
 * identity of whichever one gets picked is always tracked by id afterwards.
 */
export function filterUsersByMention(
    users: AssignableUser[],
    query: string,
): AssignableUser[] {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return users.slice(0, 5);

    return users
        .filter((user) => user.name.toLowerCase().includes(normalized))
        .slice(0, 5);
}
```

`findActiveMention` only looks backward from the cursor — it's called on
every keystroke, click, and selection change (`CommentForm.tsx`'s
`syncMentionState`), never mutates anything, and returns `null` the moment
the cursor moves outside an `@word` (e.g. an email address like
`foo@bar` never triggers it, since the `@` there isn't preceded by
whitespace or start-of-text). `filterUsersByMention` is deliberately
name-based — it only decides which candidates to *show*, and whichever one
the user actually picks is identified by id from that point on.

### Step 2 — Show the floating suggestion menu

File: `resources/js/Components/Molecules/MentionSuggestions/MentionSuggestions.tsx`

```tsx
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import DropdownItem from '@/Components/Atoms/DropdownItem/DropdownItem';
import DropdownMenu from '@/Components/Atoms/DropdownMenu/DropdownMenu';
import { MentionSuggestionsProps } from '@/types/Components';
import { createPortal } from 'react-dom';

/**
 * Floating "@mention" suggestion list, positioned at an arbitrary viewport
 * coordinate (the typed "@" inside a textarea) rather than anchored to a
 * trigger element, so it's rendered through a portal with its own fixed
 * position instead of reusing useFloatingDropdown (which tracks a trigger
 * element's bounding box).
 */
export default function MentionSuggestions({
    users,
    activeIndex,
    position,
    onSelect,
    onHover,
}: MentionSuggestionsProps) {
    if (users.length === 0) return null;

    // Two project members can share a display name - without this, the list
    // would show two identical-looking rows with no way to tell which is
    // which before picking one.
    const nameCounts = new Map<string, number>();
    users.forEach((user) => {
        nameCounts.set(user.name, (nameCounts.get(user.name) ?? 0) + 1);
    });

    return createPortal(
        <DropdownMenu
            position="floating"
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                minWidth: 200,
                zIndex: 9999,
            }}
        >
            {users.map((user, index) => (
                <DropdownItem
                    key={user.id}
                    appearance="flat"
                    isActive={index === activeIndex}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => onHover(index)}
                    onClick={() => onSelect(user)}
                    label={
                        <>
                            <Avatar
                                src={user.avatar ?? undefined}
                                initials={user.name.charAt(0)}
                                size="sm"
                            />
                            <span className="truncate">{user.name}</span>
                            {(nameCounts.get(user.name) ?? 0) > 1 && (
                                <span className="shrink-0 text-xs text-[var(--text-muted-color)]">
                                    #{user.id}
                                </span>
                            )}
                        </>
                    }
                />
            ))}
        </DropdownMenu>,
        document.body,
    );
}
```

`onMouseDown={(e) => e.preventDefault()}` matters: without it, clicking a
suggestion would blur the textarea *before* the click's `onClick` fires,
losing the cursor position `selectMention` (step 3) needs. The `#id` badge
next to a duplicate name is the only thing distinguishing two otherwise
identical rows — reuse this `nameCounts` pattern any time a picker lists
entities that can share a label.

### Step 3 — Track each inserted mention by exact character range, not by name

File: `resources/js/utils/mentions.ts`

```ts
/**
 * A mention inserted into a comment being composed, tracked by its exact
 * character range in the textarea's plain-text value rather than by name —
 * this is what lets the compose box show clean "@Full Name" text while still
 * being able to tell apart two project members who happen to share a name.
 */
export interface MentionRange {
    start: number;
    length: number;
    userId: number;
    name: string;
}

/**
 * Re-anchors tracked mention ranges against a known, exact edit: the region
 * `[editStart, editEnd)` of the text was replaced by `insertedLength`
 * characters. A range entirely before that region is kept as-is, one
 * entirely after it is shifted by the resulting length delta, and one that
 * overlaps it is dropped — its "@Name" text is no longer guaranteed intact,
 * so it can no longer be trusted to mean that user.
 *
 * The edit's boundaries must be known exactly (from the selection right
 * before the edit was applied — see CommentForm's editRangeRef), not
 * inferred by diffing the before/after text: a naive common-prefix/suffix
 * walk can misjudge the boundary whenever the text right at the edit point
 * happens to coincide with the inserted text, which for mentions is
 * common — every mention starts with "@", so inserting one right before
 * another is exactly this case.
 */
export function applyRangeEdit(
    ranges: MentionRange[],
    editStart: number,
    editEnd: number,
    insertedLength: number,
): MentionRange[] {
    if (ranges.length === 0) return ranges;

    const delta = insertedLength - (editEnd - editStart);
    const survivors: MentionRange[] = [];

    for (const range of ranges) {
        const end = range.start + range.length;

        if (end <= editStart) {
            survivors.push(range);
        } else if (range.start >= editEnd) {
            survivors.push({ ...range, start: range.start + delta });
        }
        // else: the edit overlaps this range - drop it.
    }

    return survivors;
}
```

`applyRangeEdit` needs the edit's *exact* boundaries. `CommentForm.tsx`
gets them by snapshotting the selection right before the DOM applies an
edit — on `keydown` (with a `Backspace`/`Delete` adjustment, since those
extend a collapsed caret backward/forward by one character before
deleting), and on `paste`/`cut`:

```tsx
const editRangeRef = useRef<{ start: number; end: number }>({
    start: 0,
    end: 0,
});

const captureEditRange = (
    el: HTMLTextAreaElement,
    deleteDirection?: 'backward' | 'forward',
) => {
    let { selectionStart: start, selectionEnd: end } = el;

    if (start === end) {
        if (deleteDirection === 'backward' && start > 0) start -= 1;
        else if (deleteDirection === 'forward') end += 1;
    }

    editRangeRef.current = { start, end };
};

const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBody = e.target.value;
    const { start, end } = editRangeRef.current;
    const insertedLength = newBody.length - body.length + (end - start);

    setMentionRanges((prev) =>
        applyRangeEdit(prev, start, end, insertedLength),
    );
    setBody(newBody);
    syncMentionState(e.target);
};

const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ... mention-menu navigation (ArrowUp/Down/Enter/Tab/Escape) goes
    // here first and `return`s before reaching this - see the full file.

    if (e.key === 'Backspace') {
        captureEditRange(e.currentTarget, 'backward');
    } else if (e.key === 'Delete') {
        captureEditRange(e.currentTarget, 'forward');
    } else {
        captureEditRange(e.currentTarget);
    }
};

const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    captureEditRange(e.currentTarget);
};

const handleCut = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    captureEditRange(e.currentTarget);
};
```

`selectMention` (inserting a picked suggestion) already knows its own edit
boundaries precisely — `mention.start` and the textarea's current
`selectionStart` — so it calls `applyRangeEdit` directly with those,
reconciling every already-tracked range against this new insertion before
appending the freshly-selected one:

```tsx
const selectMention = (user: AssignableUser) => {
    if (!mention || !textareaRef.current) return;

    const cursor = textareaRef.current.selectionStart;
    const mentionText = `@${user.name}`;
    const newBody =
        body.slice(0, mention.start) +
        mentionText +
        ' ' +
        body.slice(cursor);

    setBody(newBody);
    setMentionRanges((prev) => [
        // Reconciles existing ranges against this exact, known edit -
        // inserting text at `mention.start` shifts any mention that
        // comes after it.
        ...applyRangeEdit(
            prev,
            mention.start,
            cursor,
            mentionText.length + 1,
        ),
        {
            start: mention.start,
            length: mentionText.length,
            userId: user.id,
            name: user.name,
        },
    ]);
    setMention(null);
    setPendingCaret(mention.start + mentionText.length + 1);
};
```

If you're adding mentions to a different field, this whole range-tracking
mechanism (`MentionRange` + `applyRangeEdit` + the `editRangeRef` capture)
is the reusable part — copy it as-is; only the surrounding textarea wiring
changes.

### Step 4 — Rewrite plain text into an unambiguous token before submit

File: `resources/js/utils/mentions.ts`

```ts
/**
 * Rewrites a comment's plain-text body into the persisted form, replacing
 * each tracked mention's plain "@Name" with an "@[Name](id)" token so it can
 * be resolved back to the exact user unambiguously later, regardless of any
 * other project member sharing that same display name. Applied right-to-left
 * so earlier ranges' offsets stay valid while later ones are rewritten.
 */
export function tokenizeMentionRanges(
    body: string,
    ranges: MentionRange[],
): string {
    const sorted = [...ranges].sort((a, b) => b.start - a.start);

    return sorted.reduce((text, range) => {
        const token = `@[${range.name}](${range.userId})`;

        return (
            text.slice(0, range.start) +
            token +
            text.slice(range.start + range.length)
        );
    }, body);
}
```

`CommentForm.tsx`'s `handleSubmit` calls this right before posting, so the
textarea itself only ever shows the clean `@Full Name` text (never the raw
token) while composing:

```tsx
const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    const finalBody = tokenizeMentionRanges(body, mentionRanges);
    const mentionedUserIds = [
        ...new Set(mentionRanges.map((range) => range.userId)),
    ];

    onSubmit(finalBody, mentionedUserIds);
    setBody('');
    setMentionRanges([]);
    setMention(null);
};
```

Both the tokenized `body` and the plain `mentionedUserIds` array go to the
backend — the backend re-derives the trustworthy version of the latter
from the former (step 5), it never just trusts the array.

### Step 5 — Render a token back into a mention chip

File: `resources/js/utils/mentions.ts`

```ts
const MENTION_TOKEN_PATTERN = /@\[([^\]]+)\]\((\d+)\)/g;

export type MentionSegment =
    | { type: 'text'; value: string }
    | {
          type: 'mention';
          value: string;
          userId: number;
          name: string;
          avatar?: string | null;
      };

/**
 * Splits a persisted comment body into plain-text and mention segments,
 * parsing the "@[Name](id)" token format so each mention resolves back to an
 * exact user id — never ambiguous even when two project members share a
 * display name. The rendered name/avatar are looked up live by id (falling
 * back to the name captured in the token if that member is no longer in the
 * project), so a later rename still shows correctly.
 */
export function splitMentionText(
    body: string,
    users: AssignableUser[] = [],
): MentionSegment[] {
    if (!body) return [{ type: 'text', value: body }];

    const usersById = new Map(users.map((user) => [user.id, user]));
    const segments: MentionSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    MENTION_TOKEN_PATTERN.lastIndex = 0;
    while ((match = MENTION_TOKEN_PATTERN.exec(body)) !== null) {
        const [full, tokenName, tokenId] = match;
        const userId = Number(tokenId);
        const user = usersById.get(userId);

        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                value: body.slice(lastIndex, match.index),
            });
        }

        segments.push({
            type: 'mention',
            value: `@${user?.name ?? tokenName}`,
            userId,
            name: user?.name ?? tokenName,
            avatar: user?.avatar,
        });

        lastIndex = match.index + full.length;
    }

    if (lastIndex < body.length) {
        segments.push({ type: 'text', value: body.slice(lastIndex) });
    }

    if (segments.length === 0) {
        segments.push({ type: 'text', value: body });
    }

    return segments;
}
```

`CommentItem.tsx` uses this via `EditableText`'s `renderDisplay` prop to
render each mention as an avatar + name chip:

```tsx
const renderBody = (value: string) =>
    splitMentionText(value, users).map((segment, index) =>
        segment.type === 'mention' ? (
            <span
                key={index}
                className="bg-[var(--accent-color)]/10 mx-0.5 inline-flex items-center gap-1 rounded px-1 align-middle font-medium text-[var(--accent-color)]"
            >
                <Avatar
                    src={segment.avatar ?? undefined}
                    initials={segment.name.charAt(0)}
                    size="sm"
                />
                {segment.value}
            </span>
        ) : (
            <React.Fragment key={index}>{segment.value}</React.Fragment>
        ),
    );
```

Editing an existing comment shows the raw `@[Name](id)` token in the plain
`<textarea>` (there's no rich re-composition of an already-tokenized
mention) — acceptable, since `EditableText`'s edit mode already shows the
literal stored value for every field, mentions included.

## How the backend resolves and notifies mentions

### Step 6 — Validate and resolve `mentioned_user_ids`

File: `app/Http/Controllers/CommentController.php`

```php
public function store(Request $request, Issue $issue): RedirectResponse
{
    $this->authorize('create', [Comment::class, $issue]);

    $data = $request->validate([
        'body' => 'required|string',
        'mentioned_user_ids' => 'sometimes|array',
        'mentioned_user_ids.*' => 'integer|exists:users,id',
    ]);

    $this->commentService->addComment($issue, $data);

    return redirect()->back()
        ->with('success', 'Comment added.')
        ->with('action_url', route('issues.show', [$issue->project_id, $issue->id]));
}
```

Validation only confirms every id is a *real user* — it says nothing about
whether that user is actually part of this project, or actually named in
the comment. `CommentService` does both of those checks itself, since a
crafted request could otherwise get an uninvolved user "mentioned"-notified
without their name ever appearing in the visible comment:

File: `app/Services/CommentService.php`

```php
/**
 * Keeps only the mentioned user ids that are (a) actually members of the
 * issue's project, and (b) actually referenced by an "@[Name](id)"
 * mention token in the comment body — a client can't claim
 * mentioned_user_ids for someone the visible comment text never
 * actually mentions.
 *
 * @return list<int>
 */
private function resolveMentionedUserIds(Issue $issue, array $data): array
{
    $requestedIds = array_unique($data['mentioned_user_ids'] ?? []);
    $requestedIds = array_filter($requestedIds, fn ($id) => $id !== auth()->id());

    if (empty($requestedIds)) {
        return [];
    }

    $tokenIds = $this->extractMentionTokenIds($data['body'] ?? '');
    $requestedIds = array_intersect($requestedIds, $tokenIds);

    if (empty($requestedIds)) {
        return [];
    }

    $memberIds = $this->projectRepository->getMemberIds($issue->project);

    return array_values(array_intersect($requestedIds, $memberIds));
}

/**
 * @return list<int>
 */
private function extractMentionTokenIds(string $body): array
{
    preg_match_all('/@\[[^\]]+\]\((\d+)\)/', $body, $matches);

    return array_map('intval', $matches[1] ?? []);
}
```

`ProjectRepository::getMemberIds()` is the repository method backing the
membership check — query code belongs there, not inline in the service:

File: `app/Repositories/ProjectRepository.php`

```php
/**
 * @return list<int>
 */
public function getMemberIds(Project $project): array
{
    return $project->users()->pluck('users.id')->all();
}
```

### Step 7 — Create the event and fire it

File: `app/Events/IssueMentioned.php`

```php
<?php

namespace App\Events;

use App\Models\Comment;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

final class IssueMentioned
{
    use Dispatchable;

    public function __construct(
        public readonly Issue $issue,
        public readonly Comment $comment,
        public readonly User $mentionedUser,
        public readonly ?User $actor,
    ) {}
}
```

Same convention as `CommentAdded`: carries the real models (`Issue`,
`Comment`, the mentioned `User`, the nullable actor `User`), not raw ids —
see
[`../integrations/03-add-a-new-event-type.md`](../integrations/03-add-a-new-event-type.md)
for the full rationale. `CommentService` fires one `IssueMentioned` per
resolved id, using `UserRepository::findById()` (not `User::find()`
inline) to load each mentioned user:

File: `app/Services/CommentService.php`

```php
/**
 * @param  list<int>  $mentionedUserIds
 */
private function fireMentionEvents(Issue $issue, Comment $comment, array $mentionedUserIds): void
{
    foreach ($mentionedUserIds as $userId) {
        $mentionedUser = $this->userRepository->findById($userId);

        if (! $mentionedUser) {
            continue;
        }

        event(new IssueMentioned($issue, $comment, $mentionedUser, auth()->user()));
    }
}
```

Both `addComment()` and `updateComment()` call `resolveMentionedUserIds()`
then `fireMentionEvents()` — editing a comment to add a new mention
notifies that person too, exactly like creating one that mentions them.

### Step 8 — Register it and handle it in `SendNotificationListener`

File: `app/Providers/AppServiceProvider.php`, `boot()` — registered for
`SendNotificationListener` only. It's a personal, one-recipient
notification, not project-wide activity, so it isn't added to
`NotifyProjectIntegrationsListener`'s event list:

```php
Event::listen([
    IssueAssigned::class,
    IssueUnassigned::class,
    IssueUpdated::class,
    CommentAdded::class,
    IssueMentioned::class,
    ProjectInvited::class,
    IssuesImported::class,
], SendNotificationListener::class);
```

File: `app/Listeners/SendNotificationListener.php`:

```php
public function handle(object $event): void
{
    match (true) {
        $event instanceof IssueAssigned => $this->handleIssueAssigned($event),
        $event instanceof IssueUnassigned => $this->handleIssueUnassigned($event),
        $event instanceof IssueUpdated => $this->handleIssueUpdated($event),
        $event instanceof CommentAdded => $this->handleCommentAdded($event),
        $event instanceof IssueMentioned => $this->handleIssueMentioned($event),
        $event instanceof ProjectInvited => $this->handleProjectInvited($event),
        $event instanceof IssuesImported => $this->handleIssuesImported($event),
        default => null,
    };
}

private function handleIssueMentioned(IssueMentioned $event): void
{
    if ($event->actor && $event->actor->id === $event->mentionedUser->id) {
        return;
    }

    $issue = $event->issue;
    $actorName = $event->actor?->name ?? 'Someone';

    $this->notificationService->notify(
        $event->mentionedUser->id,
        NotificationType::IssueMentioned,
        'info',
        'You were mentioned',
        "$actorName mentioned you in a comment on \"$issue->title\" (#$issue->id).",
        route('issues.show', [$issue->project_id, $issue->id])
    );
}
```

The actor/mentioned-user guard mirrors `handleCommentAdded()`'s "don't
notify someone about their own action" pattern — relevant because
`resolveMentionedUserIds()` already strips `auth()->id()` from the
requested ids, but this is the last line of defense if that ever changes.
`NotificationType::IssueMentioned` and its Account-settings row already
existed before this feature (see
[`./01-add-a-new-notification-type.md`](./01-add-a-new-notification-type.md)
step 5 if you're adding a *new* type instead of reusing an existing one).

## Step 9 — Tests

- `resources/js/utils/mentions.test.ts` — covers `findActiveMention`,
  `filterUsersByMention`, `applyRangeEdit` (including the regression case
  of inserting one mention immediately before another, both starting with
  `@`), `tokenizeMentionRanges`, and `splitMentionText` (including
  disambiguating two same-named users by the id in the token).
- `resources/js/Components/Molecules/CommentForm/CommentForm.test.tsx` —
  covers typing `@` to show suggestions, selecting one by mouse and by
  keyboard, submitting the tokenized body, deleting a selected mention
  (drops it from the submitted ids), and inserting a mention before an
  already-selected one (both survive with correct offsets):
  ```tsx
  test('inserting a mention before an already-selected one keeps both intact', async () => {
      const handleSubmit = vi.fn();
      render(<CommentForm onSubmit={handleSubmit} users={users} />);

      const textarea = screen.getByPlaceholderText(
          'Leave a comment...',
      ) as HTMLTextAreaElement;

      await userEvent.type(textarea, '@b');
      await userEvent.click(screen.getByText('Bob Smith'));
      expect(textarea).toHaveValue('@Bob Smith ');

      textarea.focus();
      textarea.setSelectionRange(0, 0);
      await userEvent.keyboard('@jane');
      await userEvent.click(screen.getByText('Jane Cooper'));
      expect(textarea).toHaveValue('@Jane Cooper @Bob Smith ');

      await userEvent.click(
          screen.getByRole('button', { name: 'Post comment' }),
      );

      expect(handleSubmit).toHaveBeenCalledWith(
          '@[Jane Cooper](1) @[Bob Smith](2) ',
          expect.arrayContaining([1, 2]),
      );
  });
  ```
- `resources/js/Components/Molecules/CommentItem/CommentItem.test.tsx` —
  covers highlighting a mention token and disambiguating two same-named
  users by the id in the token.
- `resources/js/Components/Molecules/MentionSuggestions/MentionSuggestions.test.tsx`
  — covers rendering, selecting, and hovering a suggestion.
- `tests/Feature/CommentServiceTest.php` — `'addComment fires IssueMentioned
  for each mentioned project member'`, `'addComment ignores a mentioned id
  with no matching mention token in the body'` (the security-relevant
  case — a body that never actually names the person), `'addComment ignores
  mentioned ids that are not project members'`, `'addComment does not fire
  IssueMentioned for mentioning yourself'`, and the `updateComment`
  equivalent:
  ```php
  test('addComment ignores a mentioned id with no matching mention token in the body', function () {
      // A client can't get someone notified as "mentioned" just by listing
      // their id - the visible comment text has to actually name them.
      $author = User::factory()->create();
      $project = Project::factory()->create();
      $mentioned = User::factory()->create();
      $project->users()->attach([$author->id => ['role' => 'member'], $mentioned->id => ['role' => 'member']]);
      $issue = Issue::factory()->create(['project_id' => $project->id, 'assignee_id' => null]);
      $comment = Comment::factory()->make(['issue_id' => $issue->id, 'user_id' => $author->id]);

      $this->actingAs($author);

      $this->commentRepository->shouldReceive('store')->once()->andReturn($comment);
      $this->activityLogService->shouldReceive('log')->once();

      $this->service->addComment($issue, [
          'body' => 'Hi there, nothing mentioned here',
          'mentioned_user_ids' => [$mentioned->id],
      ]);

      Event::assertNotDispatched(IssueMentioned::class);
  });
  ```
- `tests/Feature/CommentControllerTest.php` — `'commenting with
  mentioned_user_ids fires IssueMentioned for that member'` and
  `'commenting ignores a mentioned_user_ids entry with no matching mention
  token in the body'`, plus the existing `'commenting rejects a
  mentioned_user_ids entry that is not a real user'` for the validation
  rule itself.
- `tests/Feature/SendNotificationListenerTest.php` — `'IssueMentioned
  notifies the mentioned user about the actor\'s comment'` and
  `'IssueMentioned does not notify when the actor mentions themself'`,
  mirroring the `ProjectInvited` tests' shape.
- `tests/Feature/ProjectRepositoryTest.php` — `'it can get the member ids
  of a project'`, covering `getMemberIds()` directly.
