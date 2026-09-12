# Dodaj kategorię statusu workflow

`category` statusu workflow nie jest dowolnym tekstem — to sztywny,
trójwartościowy enum (`todo`/`in_progress`/`done`) współdzielony przez
workflow każdego typu issue, używany do grupowania kolorystycznego
statusów i mapowania starej wartości `issues.status` na status, który
najlepiej pasuje. Przećwiczony przykład: dodanie czwartego koszyka,
`blocked`, dla statusu w rodzaju "Blocked" albo "On Hold", który nie
jest tak naprawdę "w trakcie", ale też nie jest porzucony.

Jeśli chcesz tylko dodać kolejny **status** do workflow jednego typu
issue — z użyciem trzech istniejących kategorii — nie dotykaj żadnego
kodu, użyj **Ustawienia → Issue Types → Manage workflow** w samej
aplikacji. Ten przewodnik dotyczy dodania samej nowej wartości
kategorii.

## Krok 1 — Rozszerz enum backendowy

Plik: `app/Enums/WorkflowStatusCategory.php`

```php
<?php

namespace App\Enums;

enum WorkflowStatusCategory: string
{
    case TODO = 'todo';
    case IN_PROGRESS = 'in_progress';
    case DONE = 'done';
    case BLOCKED = 'blocked';
}
```

To jedyna zmiana na poziomie typów po stronie backendu:
`App\Models\WorkflowStatus` już rzutuje kolumnę `category` na ten enum
(`protected $casts = ['category' => WorkflowStatusCategory::class]` w
`app/Models/WorkflowStatus.php`), a `App\Http\Controllers\WorkflowController`
waliduje przychodzącą `category` przez
`Rule::enum(WorkflowStatusCategory::class)` (zarówno `storeStatus()`,
jak i `updateStatus()`) — nowy case jest akceptowany przez tę regułę
automatycznie, bez zmiany kontrolera.

## Krok 2 — Zdecyduj, co robi z nią mapowanie starego statusu

Plik: `app/Services/IssueTypeService.php`

`resolveWorkflowStatusForLegacyValue()` mapuje stary enum
`issues.status` (`open`/`in_progress`/`closed`) na kategorię:

```php
public function resolveWorkflowStatusForLegacyValue(IssueType $issueType, ?string $legacyStatus): ?WorkflowStatus
{
    $category = match ($legacyStatus) {
        'open' => WorkflowStatusCategory::TODO,
        'in_progress' => WorkflowStatusCategory::IN_PROGRESS,
        'closed' => WorkflowStatusCategory::DONE,
        default => null,
    };

    $status = $category
        ? $issueType->statuses()->where('category', $category->value)->orderBy('sort_order')->first()
        : null;

    return $status
        ?? $issueType->statuses()->where('is_initial', true)->first()
        ?? $issueType->statuses()->orderBy('sort_order')->first();
}
```

Nie ma czwartej starej wartości `IssueStatus` do zmapowania na
`blocked` — `open`/`in_progress`/`closed` to zamknięty, niepowiązany
enum (`app/Enums/IssueStatus.php`), który istniał przed typami issue i
jest utrzymywany w synchronizacji tylko dla wstecznej kompatybilności.
Zostaw tę metodę bez zmian: status `blocked` to coś, co użytkownik
ustawia jawnie przez `workflow_status_id` (przez prawdziwe UI
workflow w Ustawieniach, albo widok szczegółów issue, gdy zostanie
podpięty do selektora statusu), a nie coś, na co stary string `status`
mógłby się kiedykolwiek rozwiązać. Tak ma być, to nie luka — nie dodawaj
tu ramienia `'blocked' => ...`, nie ma starej wartości, która by to
znaczyła.

## Krok 3 — Dodaj ją do listy opcji na frontendzie

Plik: `resources/js/types/Workflow.ts`

```ts
export type WorkflowStatusCategory = 'todo' | 'in_progress' | 'done' | 'blocked';
```

Plik: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsWorkflowModal.tsx`

```tsx
const CATEGORY_OPTIONS: { value: WorkflowStatusCategory; label: string }[] = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'blocked', label: 'Blocked' },
];
```

To wszystkie odwołania po stronie frontendu — `CATEGORY_OPTIONS`
napędza zarówno `<select>` kategorii formularza "add status", jak i
etykietę pokazywaną obok każdego istniejącego statusu w modalu.
`WorkflowStatusBadge` oraz sprawdzenie `isClosed` w `IssueElement`
(`issue.workflowStatus.category === 'done'`) porównują tylko
konkretnie z `'done'`, więc nowa kategoria nie wymaga tam żadnej
zmiany.

## Krok 4 — Testy

Plik: `tests/Feature/Models/WorkflowStatusTest.php`

Dodaj przypadek asertujący, że nowa wartość enuma przechodzi przez
rzutowanie w obie strony, powielając istniejące asercje kategorii w
tym pliku:

```php
test('a workflow status can be created with the blocked category', function () {
    $status = WorkflowStatus::factory()->create(['category' => WorkflowStatusCategory::BLOCKED]);

    expect($status->category)->toBe(WorkflowStatusCategory::BLOCKED);
});
```

Plik: `tests/Feature/WorkflowControllerTest.php`

Dodaj przypadek potwierdzający, że kontroler akceptuje ją od początku
do końca, powielając `'an admin can add a status to an issue type
workflow'`:

```php
test('an admin can add a status with the blocked category', function () {
    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $issueType = $project->issueTypes()->create(['name' => 'Bug', 'icon' => 'Bug', 'color' => '#f44336']);

    $response = $this->actingAs($admin)->post("/projects/$project->id/issue-types/$issueType->id/statuses", [
        'name' => 'Blocked',
        'color' => '#ef4444',
        'category' => 'blocked',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('workflow_statuses', ['issue_type_id' => $issueType->id, 'name' => 'Blocked', 'category' => 'blocked']);
});
```

Uruchom `php artisan test --filter=WorkflowStatusTest` i
`php artisan test --filter=WorkflowControllerTest`, a także
`npx vitest run resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsWorkflowModal.test.tsx`,
przed zacommitowaniem.
