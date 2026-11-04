# Obecność i podpowiedzi o edycji

Obecność odpowiada na pytanie „kto jeszcze to ma otwarte?” i przenosi drobne podpowiedzi między klientami („Ada edytuje opis”). Używa **kanału presence** Reverb oraz *szeptów*: wiadomości, które idą z jednej przeglądarki do pozostałych przez Reverb i nigdy nie trafiają do aplikacji Laravel ani do bazy danych (Reverb je przekazuje, więc nie są ukryte przed serwerem WebSocket). Przerobiony przykład dodaje stos awatarów do hipotetycznej strony kamienia milowego.

## Krok 1 — Autoryzuj kanał

Plik: `app/Broadcasting/LiveChannels.php`

Autoryzacja kanału presence zwraca kartę, którą zobaczą inni, albo `false`, by odmówić:

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

Plik: `routes/channels.php`

```php
Broadcast::channel('issue.{issueId}', fn ($user, int $issueId) => LiveChannels::joinIssue($user, $issueId));
```

Do karty wkładaj tylko to, co każdy inny widz już może zobaczyć. Dla strony kamienia milowego dodaj te same trzy elementy dla `Milestone`: helper nazwy, `joinMilestone` i trasę (istniejące elementy dla `issue` powyżej są wzorem):

Plik: `app/Broadcasting/LiveChannels.php`

```php
    public static function milestone(int $milestoneId): string
    {
        return "milestone.$milestoneId";
    }

    /** @return array{id: int, name: string, avatar: string|null}|false */
    public static function joinMilestone(User $user, int $milestoneId): array|false
    {
        $milestone = Milestone::query()->select(['id', 'project_id'])->find($milestoneId);

        if ($milestone === null || ! self::canJoinProject($user, $milestone->project_id)) {
            return false;
        }

        return ['id' => $user->id, 'name' => $user->name, 'avatar' => $user->avatar];
    }
```

Plik: `routes/channels.php`

```php
Broadcast::channel('milestone.{milestoneId}', fn ($user, int $milestoneId) => LiveChannels::joinMilestone($user, $milestoneId));
```

Dodaj testy obok `LiveChannelsTest.php` (członek dołącza, obcy dostaje 403, brakujący rekord jest odrzucany).

## Krok 2 — Dołącz na stronie

Plik: `resources/js/live/usePresence.ts`

`usePresence(channel, currentUserId, onWhisper?)` dołącza do `presence-<channel>` na czas życia komponentu i zwraca **pozostałe** osoby (nigdy bieżącego użytkownika, ile kart by nie miał otwartych) oraz `whisper(event, data)`:

```tsx
const currentUserId = usePage().props.auth.user.id;
const { others: viewers, whisper } = usePresence(
    `milestone.${milestone.id}`,
    currentUserId,
);
```

Nie robi nic, gdy aktualizacje na żywo są wyłączone, więc strona działa bez Reverb, tylko bez awatarów.

## Krok 3 — Pokaż ludzi

Plik: `resources/js/Components/Molecules/PresenceStack/PresenceStack.tsx`

```tsx
<PresenceStack users={viewers} />
```

Nakładające się awatary, „+N” powyżej `max` (domyślnie 4), imiona po najechaniu i dla czytników ekranu, a gdy nikogo innego nie ma — nic. Strona zgłoszenia umieszcza go w nagłówku przez slot `presence` w `IssuePageHeader`.

## Krok 4 — Ostrzegaj przed równoczesną edycją

Szept to sposób, w jaki jeden edytujący informuje pozostałych. Strona zgłoszenia robi tak dla opisu (`resources/js/Pages/Issues/Show.tsx`):

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

- `EditableMarkdown` ma prop `onEditingChange(editing)`, wywoływany przy otwarciu i zamknięciu edytora.
- `ConcurrentEditNotice` pokazuje ostrzeżenie (`names`, `subject`), i to tylko dla osób, które są *nadal obecne*: imiona są filtrowane przez `viewers`, więc ktoś, kto zamknął kartę, znika bez wysyłania `stopped-editing`.
- Nazwy szeptów są w `usePresence` ograniczone do `editing` i `stopped-editing`; dopisz swoje do tej listy.

Reverb przyjmuje zdarzenia klienta tylko od członków kanału (`REVERB_APP_ACCEPT_CLIENT_EVENTS_FROM`, domyślnie `members`), więc obcy nie może szeptać na kanał. Podpowiedź jest tylko informacją, nie blokadą: nic nie powstrzymuje drugiej osoby przed zapisem, a wygrywa ostatni zapis.

## Krok 5 — Testy

`usePresence.test.tsx` mockuje `getEcho` i steruje `here`, `joining`, `leaving` oraz szeptami. Dla strony zamockuj `@/live/usePresence` tak jak `Pages/Issues/Show.test.tsx` i wywołaj przechwycony callback szeptu. `PresenceStack` i `ConcurrentEditNotice` mają testy komponentów i stories.
