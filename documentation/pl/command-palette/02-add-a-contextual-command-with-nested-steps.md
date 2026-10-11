# Dodaj komendę kontekstową z krokami zagnieżdżonymi

Przećwiczony przykład: **Change status…** ze strony issue. Zależy od bieżącego issue, otwiera drugą listę ("krok") ze statusami dozwolonymi przez workflow, ukrywa się, gdy użytkownik nie może zmieniać statusu, i stosuje wybór przez istniejącą trasę `issues.update`. Ten sam kształt daje **Change priority…**, **Assign to…** i **Labels…**.

## Cztery idee

1. **`children()` otwiera krok.** Komenda z `children` nie wykonuje `perform`; paleta wkłada na stos stronę z tym, co zwróci `children()`, pokazuje breadcrumb (`#12 › Change status…`) i cofa się po Esc albo Backspace w pustym inpucie.
2. **`when()` ukrywa, nigdy nie wyłącza.** Bramkuj każdą komendę zmieniającą dane zdolnością, którą egzekwuje kontroler. Backend mówi stronie, co użytkownik może; frontend nigdy nie zgaduje.
3. **Buduj od nowa przy każdym renderze.** Komendy powstają z propsów strony, więc krok pokazujący stan (lista etykiet) odzwierciedla go, gdy strona renderuje się ponownie po mutacji.
4. **`keepOpen` dla wielokrotnego wyboru.** Komenda z `keepOpen: true` działa bez zamykania palety, więc etykiety można przełączać jedna po drugiej.

## Krok 1 — Wystaw, co użytkownik może zrobić

Plik: `app/Http/Controllers/IssueController.php`

```php
'issueAbilities' => $this->issueAbilities($request, $issue),
```

```php
private function issueAbilities(Request $request, Issue $issue): array
{
    $user = $request->user();

    return [
        'update' => $user->can('update', $issue),
        'changeStatus' => $user->can('changeStatus', $issue),
        'assign' => $user->can('assign', $issue),
        'changePriority' => $user->can('changePriority', $issue),
        'changeLabels' => $user->can('changeLabels', $issue),
    ];
}
```

Odzwierciedlają bramki w `update()`: zmiana wymaga `update` **plus** zdolności pola, którego dotyczy. Plik `resources/js/types/Issues.ts` ma pasujący typ `IssueAbilities`; dodaj pole tam i do `IssuePageProps` w `types/Components.ts`. Przetestuj obok testu `'the issue page exposes what the acting user may change'` w `tests/Feature/IssueControllerTest.php` członkiem i viewerem.

## Krok 2 — Zbuduj komendy z danych strony

Plik: `resources/js/utils/issueCommands.ts` (czysta funkcja, więc testowalna bez Reacta)

```ts
{
    group: 'suggested',
    scope: 'issue',
    context: '#12',
    id: 'issue.status',
    title: 'Change status…',
    subtitle: issue.workflowStatus?.name,
    icon: 'CircleDot',
    keywords: ['workflow', 'transition', 'state', 'move'],
    when: () =>
        canUpdate && abilities.changeStatus && statusSteps().length > 0,
    children: statusSteps,
},
```

`statusSteps()` zwraca zwykłe komendy, których `perform` wywołuje helper aktualizacji strony:

```ts
const statusSteps = (): Command[] =>
    getReachableStatuses(issue)
        .filter((status) => status.id !== currentStatusId)
        .map((status): Command => ({
            id: `issue.status.${status.id}`,
            title: status.name,
            group: 'suggested',
            icon: 'Circle',
            iconColor: status.color,
            perform: () => ctx.update({ workflow_status_id: status.id }),
        }));
```

- `context` to pierwszy okruch breadcrumba (`#12`).
- `group: 'suggested'` stawia własne komendy issue na górze, nad komendami projektu i globalnymi.
- Oferuj tylko to, co backend zaakceptuje: `getReachableStatuses` (`utils/workflow.ts`) idzie za `WorkflowTransition`, tą samą regułą, którą egzekwuje `WorkflowService::assertTransitionAllowed`.

Dla kroku w postaci listy kontrolnej dodaj `keepOpen: true` i pokaż stan ikoną i podtytułem:

```ts
{
    id: `issue.labels.${label.id}`,
    title: label.name,
    subtitle: active ? 'Added' : undefined,
    icon: active ? 'SquareCheck' : 'Square',
    iconColor: label.color,
    keepOpen: true,
    perform: () => ctx.update({ labels: nextLabels }),
}
```

## Krok 3 — Zarejestruj je, dopóki strona jest zamontowana

Plik: `resources/js/hooks/useIssueCommands.ts`, wywoływany z `resources/js/Pages/Issues/Show.tsx`

```tsx
useIssueCommands({
    project,
    issue,
    ancestors,
    users,
    labels,
    abilities: issueAbilities,
    update: updateIssue,
});
```

Hook memoizuje `buildIssueCommands(...)` i przekazuje wynik do `useCommands`. Dwie rzeczy chronią przed pętlą — każda ponowna rejestracja renderuje stronę ponownie:

- nadaj pominiętym propsom **modułowy** default (`const NO_LABELS: ProjectLabel[] = []`), nigdy świeże `[]` przy każdym renderze;
- zmienne callbacki, jak `addAlert`, czytaj przez ref zamiast wkładać je do listy zależności.

Otwarty krok czyta swoją listę ponownie z komendy, która go otworzyła (dopasowanej po `id`), dlatego lista kontrolna aktualizuje się w miejscu.

## Testy

- Builder (`utils/issueCommands.test.ts`): każda zdolność ukrywa dokładnie swoją komendę, tylko dozwolone przejścia, co każdy krok wysyła przez `update`, dodawanie/usuwanie etykiet.
- Strona (`Pages/Issues/Show.test.tsx`): rejestruje komendy, ukrywa te zmieniające dane bez zdolności, a edycja z palety wywołuje `router.patch('/issues.update/<id>', ...)`.
- Paleta (`CommandPalette.test.tsx`): kontekst w breadcrumb, `keepOpen` zostaje otwarte i odzwierciedla nowy stan.
