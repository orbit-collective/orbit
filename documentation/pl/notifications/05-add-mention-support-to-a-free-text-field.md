# Dodaj obsługę @mention do pola tekstowego

Przećwiczony przykład: system `@mention` już zbudowany dla komentarzy do zadań — wpisz `@` w polu komentarza, wybierz członka projektu z pływającej listy podpowiedzi, a otrzyma powiadomienie "You were mentioned" (`NotificationType::IssueMentioned`, poprzez nowy event `IssueMentioned`). Ten przewodnik dokumentuje ten system od początku do końca, zarówno jako "jak to działa", jak i jako szablon do dodania tej samej funkcjonalności do innego pola tekstowego (opisu projektu, tytułu zadania, dowolnego innego pola opartego na zwykłym `<textarea>`).

`NotificationType::IssueMentioned` oraz jego wiersz w ustawieniach konta (tablica `defaultNotificationTypes` w `AccountSettingsNotificationsTab.tsx`) istniały już przed tą funkcjonalnością — ten przewodnik dotyczy podłączenia nowego eventu domenowego do pipeline'u za istniejącym typem powiadomienia, a nie dodania samego typu (zobacz
[`./01-add-a-new-notification-type.md`](./01-add-a-new-notification-type.md)
po to drugie).

## Najważniejsza zasada w tym przewodniku

**Śledź wzmiankę po id użytkownika i dokładnym zakresie znaków — nigdy przez dopasowywanie wpisanego tekstu `@Name` do listy nazw.** Dwóch członków projektu może mieć tę samą nazwę wyświetlaną. Jeśli rozwiązujesz "kto został wspomniany" przez wyszukiwanie w treści komentarza `@Jane Cooper`, nie da się stwierdzić, o którą Jane Cooper chodzi, a klient mógłby — celowo lub nie — powiadomić niewłaściwą osobę. Wszędzie poniżej (wykrywanie, śledzenie przez kolejne edycje, zapis i renderowanie) operuje na id, nie na ciągach znaków z nazwami.

## Jak działa komponowanie wzmianki (frontend)

### Krok 1 — Wykryj wpisywane w trakcie zapytanie `@query`

Plik: `resources/js/utils/mentions.ts`

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

`findActiveMention` patrzy tylko wstecz od kursora — jest wywoływana przy każdym naciśnięciu klawisza, kliknięciu i zmianie zaznaczenia (`syncMentionState` w `CommentForm.tsx`), niczego nie mutuje i zwraca `null` w momencie, gdy kursor wyjdzie poza `@słowo` (np. adres email jak `foo@bar` nigdy tego nie wyzwala, ponieważ `@` nie jest tam poprzedzone białym znakiem ani początkiem tekstu). `filterUsersByMention` jest celowo oparte na nazwie — decyduje wyłącznie, które kandydatury *pokazać*, a osoba, którą użytkownik faktycznie wybierze, jest od tego momentu identyfikowana po id.

### Krok 2 — Pokaż pływające menu podpowiedzi

Plik: `resources/js/Components/Molecules/MentionSuggestions/MentionSuggestions.tsx`

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

`onMouseDown={(e) => e.preventDefault()}` ma znaczenie: bez tego kliknięcie podpowiedzi odebrałoby fokus polu tekstowemu *zanim* zadziała `onClick` tego kliknięcia, tracąc pozycję kursora, której potrzebuje `selectMention` (krok 3). Odznaka `#id` obok zduplikowanej nazwy to jedyna rzecz odróżniająca dwa identycznie wyglądające wiersze — użyj ponownie tego wzorca `nameCounts` przy każdym pickerze listującym encje, które mogą dzielić etykietę.

### Krok 3 — Śledź każdą wstawioną wzmiankę po dokładnym zakresie znaków, nie po nazwie

Plik: `resources/js/utils/mentions.ts`

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

`applyRangeEdit` potrzebuje *dokładnych* granic edycji. `CommentForm.tsx` uzyskuje je, robiąc migawkę zaznaczenia tuż przed tym, jak DOM zastosuje edycję — przy `keydown` (z korektą dla `Backspace`/`Delete`, ponieważ te klawisze rozszerzają zwinięty kursor odpowiednio wstecz/w przód o jeden znak przed usunięciem), oraz przy `paste`/`cut`:

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

`selectMention` (wstawienie wybranej podpowiedzi) już zna dokładnie swoje własne granice edycji — `mention.start` oraz aktualny `selectionStart` pola tekstowego — więc wywołuje `applyRangeEdit` bezpośrednio z tymi wartościami, uzgadniając każdy już śledzony zakres z tym nowym wstawieniem, zanim doda ten świeżo wybrany:

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

Jeśli dodajesz wzmianki do innego pola, cały ten mechanizm śledzenia zakresów (`MentionRange` + `applyRangeEdit` + przechwytywanie `editRangeRef`) jest częścią wielokrotnego użytku — skopiuj go bez zmian; zmienia się tylko otaczające podłączenie pola tekstowego.

### Krok 4 — Przepisz zwykły tekst na jednoznaczny token przed wysłaniem

Plik: `resources/js/utils/mentions.ts`

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

`handleSubmit` w `CommentForm.tsx` wywołuje to tuż przed wysłaniem, więc samo pole tekstowe pokazuje podczas komponowania zawsze czysty tekst `@Full Name` (nigdy surowy token):

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

Zarówno stokenizowane `body`, jak i zwykła tablica `mentionedUserIds` trafiają do backendu — backend na nowo wyprowadza wiarygodną wersję tego drugiego z tego pierwszego (krok 5), nigdy po prostu nie ufa tej tablicy.

### Krok 5 — Wyrenderuj token z powrotem jako chip wzmianki

Plik: `resources/js/utils/mentions.ts`

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

`CommentItem.tsx` używa tego przez prop `renderDisplay` komponentu `EditableText`, żeby wyrenderować każdą wzmiankę jako chip z awatarem i nazwą:

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

Edycja istniejącego komentarza pokazuje surowy token `@[Name](id)` w zwykłym `<textarea>` (nie ma bogatego, ponownego skomponowania już stokenizowanej wzmianki) — to akceptowalne, ponieważ tryb edycji `EditableText` już pokazuje dosłowną zapisaną wartość dla każdego pola, wzmianki włącznie.

## Jak backend rozwiązuje i powiadamia o wzmiankach

### Krok 6 — Zwaliduj i rozwiąż `mentioned_user_ids`

Plik: `app/Http/Controllers/CommentController.php`

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

Walidacja potwierdza tylko, że każde id to *prawdziwy użytkownik* — nic nie mówi o tym, czy ten użytkownik faktycznie należy do tego projektu, ani czy faktycznie jest wymieniony w komentarzu. `CommentService` sam wykonuje obie te kontrole, ponieważ spreparowane żądanie mogłoby w przeciwnym razie sprawić, że niezwiązana osoba zostanie powiadomiona jako "wspomniana", mimo że jej nazwa nigdy nie pojawia się w widocznej treści komentarza:

Plik: `app/Services/CommentService.php`

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

`ProjectRepository::getMemberIds()` to metoda repozytorium stojąca za sprawdzeniem członkostwa — kod zapytań należy tam, nie inline w serwisie:

Plik: `app/Repositories/ProjectRepository.php`

```php
/**
 * @return list<int>
 */
public function getMemberIds(Project $project): array
{
    return $project->users()->pluck('users.id')->all();
}
```

### Krok 7 — Stwórz event i wystrzel go

Plik: `app/Events/IssueMentioned.php`

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

Ta sama konwencja co `CommentAdded`: niesie prawdziwe modele (`Issue`, `Comment`, wspomnianego `User`, opcjonalnego aktora `User`), nie surowe id — zobacz
[`../integrations/03-add-a-new-event-type.md`](../integrations/03-add-a-new-event-type.md)
po pełne uzasadnienie. `CommentService` wystrzeliwuje jeden `IssueMentioned` na każde rozwiązane id, używając `UserRepository::findById()` (nie `User::find()` inline) do wczytania każdego wspomnianego użytkownika:

Plik: `app/Services/CommentService.php`

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

Zarówno `addComment()`, jak i `updateComment()` wywołują `resolveMentionedUserIds()`, a potem `fireMentionEvents()` — edycja komentarza w celu dodania nowej wzmianki powiadamia tę osobę tak samo, jak stworzenie komentarza, który ją wspomina.

### Krok 8 — Zarejestruj go i obsłuż w `SendNotificationListener`

Plik: `app/Providers/AppServiceProvider.php`, `boot()` — zarejestrowany wyłącznie dla `SendNotificationListener`. To osobiste powiadomienie dla jednego odbiorcy, a nie aktywność w całym projekcie, więc nie jest dodawany do listy eventów `NotifyProjectIntegrationsListener`:

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

Plik: `app/Listeners/SendNotificationListener.php`:

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

Zabezpieczenie aktor/wspomniany-użytkownik odzwierciedla wzorzec "nie powiadamiaj kogoś o jego własnym działaniu" z `handleCommentAdded()` — istotne, ponieważ `resolveMentionedUserIds()` już usuwa `auth()->id()` z żądanych id, ale to jest ostatnia linia obrony, gdyby to kiedyś się zmieniło. `NotificationType::IssueMentioned` oraz jego wiersz w ustawieniach konta istniały już przed tą funkcjonalnością (zobacz
[`./01-add-a-new-notification-type.md`](./01-add-a-new-notification-type.md)
krok 5, jeśli dodajesz *nowy* typ zamiast używać istniejącego).

## Krok 9 — Testy

- `resources/js/utils/mentions.test.ts` — pokrywa `findActiveMention`, `filterUsersByMention`, `applyRangeEdit` (włącznie z przypadkiem regresyjnym wstawienia jednej wzmianki bezpośrednio przed inną, obie zaczynające się od `@`), `tokenizeMentionRanges` oraz `splitMentionText` (włącznie z odróżnieniem dwóch użytkowników o tej samej nazwie po id w tokenie).
- `resources/js/Components/Molecules/CommentForm/CommentForm.test.tsx` — pokrywa wpisanie `@` pokazujące podpowiedzi, wybranie jednej myszką i klawiaturą, wysłanie stokenizowanej treści, usunięcie wybranej wzmianki (usuwa ją z wysłanych id) oraz wstawienie wzmianki przed już wybraną (obie przetrwają z poprawnymi offsetami):
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
- `resources/js/Components/Molecules/CommentItem/CommentItem.test.tsx` — pokrywa podświetlenie tokena wzmianki oraz odróżnienie dwóch użytkowników o tej samej nazwie po id w tokenie.
- `resources/js/Components/Molecules/MentionSuggestions/MentionSuggestions.test.tsx`
  — pokrywa renderowanie, wybieranie i najechanie na podpowiedź.
- `tests/Feature/CommentServiceTest.php` — `'addComment fires IssueMentioned for each mentioned project member'`, `'addComment ignores a mentioned id with no matching mention token in the body'` (przypadek istotny pod kątem bezpieczeństwa — treść, która nigdy faktycznie nie wymienia tej osoby), `'addComment ignores mentioned ids that are not project members'`, `'addComment does not fire IssueMentioned for mentioning yourself'` oraz odpowiednik dla `updateComment`:
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
- `tests/Feature/CommentControllerTest.php` — `'commenting with mentioned_user_ids fires IssueMentioned for that member'` oraz `'commenting ignores a mentioned_user_ids entry with no matching mention token in the body'`, plus istniejący `'commenting rejects a mentioned_user_ids entry that is not a real user'` dla samej reguły walidacji.
- `tests/Feature/SendNotificationListenerTest.php` — `'IssueMentioned notifies the mentioned user about the actor\'s comment'` oraz `'IssueMentioned does not notify when the actor mentions themself'`, odzwierciedlające kształt testów `ProjectInvited`.
- `tests/Feature/ProjectRepositoryTest.php` — `'it can get the member ids of a project'`, pokrywający `getMemberIds()` bezpośrednio.
