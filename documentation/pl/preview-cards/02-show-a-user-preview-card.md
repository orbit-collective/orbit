# Pokaż kartę podglądu użytkownika

`UserPreviewCard` (`resources/js/Components/Molecules/UserPreviewCard/UserPreviewCard.tsx`) pokazuje awatar osoby, jej nazwę, email i do trzech ostatnio zmienionych zadań. Prawie nigdy nie renderujesz jej samodzielnie: nadajesz awatarowi `userId`, a resztę robi `UserAvatar`.

## Krok 1 — Użyj `UserAvatar` zamiast `Avatar`

File: `resources/js/Components/Molecules/UserAvatar/UserAvatar.tsx`

`UserAvatar` przyjmuje wszystkie propsy `Avatar` oraz opcjonalne `userId`:

```ts
export interface UserAvatarProps extends AvatarProps {
    /** When set, hovering the avatar shows that user's preview card. */
    userId?: number;
}
```

Bez `userId` renderuje zwykły `Avatar`, więc można go bezpiecznie używać tam, gdzie id bywa nieznane. Prawdziwe użycie z `resources/js/Components/Molecules/TeamAvatarStack/TeamAvatarStack.tsx`:

```tsx
<UserAvatar
    userId={member.id}
    src={member.avatar ?? undefined}
    initials={member.name.charAt(0)}
    size="lg"
/>
```

Tam, gdzie komponent już renderuje `UserBadge`, przekaż `userId` do badge'a; on przekaże je dalej:

```tsx
<UserBadge
    userId={issue.assignee?.id}
    avatarSrc={issue.assignee?.avatar}
    name={issue.assignee?.name ?? t('list_row.unassigned')}
    size="sm"
/>
```

**Nie** nadawaj `userId` awatarom na liście opcji dropdownu, własnemu użytkownikowi w pasku bocznym ani ekranom wymieniającym osoby, które mogą nie dzielić z oglądającym żadnego projektu (panel użytkowników w portalu deweloperskim): karta byłaby szumem na liście opcji, a dla obcych endpoint odpowiada 404, więc nic by się nie otworzyło.

## Krok 2 — Wiedz, co robi awatar

- **Najechanie** otwiera kartę; opuszczenie ją zamyka.
- **Klawiatura**: awatar nie dodaje własnego przystanku Tab (zwykle znajduje się wewnątrz przycisku lub linku, a zagnieżdżanie elementu fokusowalnego w innym jest niepoprawne). Zamiast tego otwiera się, gdy fokus ma najbliższa otaczająca kontrolka `a[href]`, `button` lub `[tabindex]`, a zamyka przy utracie fokusu. Escape zamyka kartę. Awatar spoza jakiejkolwiek fokusowalnej kontrolki otwiera się tylko po najechaniu.
- **Dane** pochodzą z `GET /users/{user}/preview` (nazwa trasy `users.preview`) i są cache'owane w przeglądarce przez 30 sekund.
- **Nieaktualne odpowiedzi są odrzucane.** Każde pokazanie lub ukrycie zwiększa licznik, a zmiana `userId` czyści kartę, więc wolna odpowiedź dla osoby A nigdy nie pojawi się przy awatarze osoby B.
- **Jedna instancja na kontrolkę.** `Badge` powtarza swoje dzieci w ukrytym dymku, więc `UserBadge` renderuje tam zwykły `Avatar`. Jeśli budujesz coś podobnego, nigdy nie montuj dwóch `UserAvatar` pod tą samą fokusowalną kontrolką, bo sfokusowanie jej otworzy dwie karty.

## Krok 3 — Zrozum, kogo można zobaczyć

File: `app/Http/Controllers/UserController.php` (`preview`), z regułami w `app/Services/UserService.php` (`previewFor`):

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

Kontroler zamienia `null` na 404. Dwie reguły sprawiają, że nic nie wycieka:

- Osoba jest widoczna tylko wtedy, gdy dzieli z oglądającym co najmniej jeden projekt (`UserRepository::sharesProject`) albo jest oglądającym.
- Jej zadania są ograniczone do projektów, do których należy **oglądający** (`IssueRepository::recentlyEditedForUser`). "Ostatnio edytowane" oznacza zadania, które osoba utworzyła lub ma przypisane, od najnowszego `updated_at`, ponieważ zadanie nie zapisuje, kto edytował je ostatni.

## Krok 4 — Dodaj pole do karty

Przećwiczony przykład: pokaż datę dołączenia osoby jako `created_at`.

1. **Odpowiedź** — dodaj `'created_at' => $user->created_at?->toIso8601String(),` do tablicy zwracanej przez `UserService::previewFor`.
2. **Typ** — dodaj `created_at: string | null;` do `UserPreview` w `resources/js/types/Users.ts`.
3. **Karta** — wyrenderuj je w `UserPreviewCard.tsx`, z etykietą w `lang/en/user_preview_card.php` i `lang/pl/user_preview_card.php` (w obu plikach, test spójności tego pilnuje).
4. **Testy** — sprawdź nowy klucz w `tests/Feature/UserPreviewControllerTest.php` oraz wyrenderowany tekst w `UserPreviewCard.test.tsx`.

Nigdy nie dodawaj niczego, co powinno pozostać prywatne (cokolwiek, czego oglądający nie mógłby już zobaczyć w profilu osoby we wspólnym projekcie): odpowiedź jest dostępna dla każdego współpracownika.

## Testy

- `tests/Feature/UserPreviewControllerTest.php` — endpoint: współpracownik, kolejność zadań, zadania z projektów, w których oglądającego nie ma, obca osoba (404), on sam.
- `resources/js/Components/Molecules/UserAvatar/UserAvatar.test.tsx` — najechanie, spóźnione odpowiedzi, zmiana `userId`, fokus, Escape.
- `resources/js/Components/Molecules/UserBadge/UserBadge.test.tsx` — jeden podgląd, a nie jeden na kopię w dymku.
- `resources/js/Components/Molecules/UserPreviewCard/UserPreviewCard.test.tsx` oraz `UserPreviewCard.stories.tsx` — karta.
