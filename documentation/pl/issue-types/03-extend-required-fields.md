# Rozszerz wymagane pola

`required_fields` typu issue to sztywny zbiór kluczy, z których każdy
jest zmapowany na faktyczne pole żądania tworzenia/edycji `Issue`, na
którego niepustość wymusza. Przećwiczony przykład: dodanie opcji
`parent`, żeby projekt mógł oznaczyć typ (powiedzmy, niestandardowy typ
w kształcie `Sub-task`) jako "musi być zawsze tworzony jako sub-issue
czegoś."

## Krok 1 — Dodaj mapowanie

Plik: `app/Services/IssueTypeService.php`

```php
/**
 * The fixed set of issue fields that an issue type can mark as required,
 * mapped to the request/data key each one corresponds to on Issue
 * create/update.
 */
public const array REQUIRED_FIELD_TO_DATA_KEY = [
    'description' => 'description',
    'assignee' => 'assignee_id',
    'labels' => 'labels',
    'start_date' => 'start_date',
    'end_date' => 'end_date',
    'priority' => 'priority',
    'parent' => 'parent_id',
];
```

`assertRequiredFieldsSatisfied()` (ten sam plik) już wykonuje faktyczne
egzekwowanie generycznie na podstawie tej mapy — nic więcej w tej
metodzie nie musi się zmienić:

```php
public function assertRequiredFieldsSatisfied(IssueType $issueType, array $data, bool $isCreate): void
{
    $missingDataKeys = [];

    foreach ($issueType->required_fields ?? [] as $field) {
        $dataKey = self::REQUIRED_FIELD_TO_DATA_KEY[$field] ?? null;

        if (! $dataKey) {
            continue;
        }

        if ($isCreate) {
            if ($this->isEmptyValue($data[$dataKey] ?? null)) {
                $missingDataKeys[$dataKey] = true;
            }
        } elseif (array_key_exists($dataKey, $data) && $this->isEmptyValue($data[$dataKey])) {
            $missingDataKeys[$dataKey] = true;
        }
    }

    if ($missingDataKeys) {
        throw ValidationException::withMessages(array_fill_keys(
            array_keys($missingDataKeys),
            'This field is required for the selected issue type.',
        ));
    }
}
```

`IssueController::store`/`update` już wywołują tę metodę (po
rozwiązaniu typu issue i scaleniu zmian `parent_id`/`issue_type_id`) i
jest już podpięta do cyklu życia żądania — zobacz metodę `store()` w
`app/Http/Controllers/IssueController.php`, która wywołuje
`$this->issueTypeService->assertRequiredFieldsSatisfied($issueType, $data, isCreate: true);`
tuż przed `$this->issueService->createIssue($data)`. Ponieważ
`parent_id` jest już prawdziwym polem żądania tworzenia/edycji (zobacz
[`../architecture/02-backend-layered-architecture.md`](../architecture/02-backend-layered-architecture.md)
po ogólny kształt walidacji żądań), tutaj nie jest potrzebna żadna
zmiana kontrolera — wystarczy nowy wpis w mapie.

## Krok 2 — Przepuść to przez walidację ustawień

Plik: `app/Http/Controllers/IssueTypeController.php`

Zarówno `store()`, jak i `update()` walidują `required_fields.*`
względem `Rule::in(array_keys(IssueTypeService::REQUIRED_FIELD_TO_DATA_KEY))`
— ponieważ to czyta klucze mapy bezpośrednio, dodanie `'parent'` do
mapy w Kroku 1 wystarcza, żeby endpointy ustawień też to
zaakceptowały. Żadna zmiana tutaj nie jest potrzebna, ale warto
wiedzieć, dlaczego sam Krok 1 wystarcza:

```php
$validated = $request->validate([
    'name' => ['required', 'string', 'max:50'],
    'icon' => ['required', 'string', 'max:50'],
    'color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
    'description' => ['nullable', 'string', 'max:255'],
    'allows_children' => ['sometimes', 'boolean'],
    'required_fields' => ['sometimes', 'array'],
    'required_fields.*' => ['string', Rule::in(array_keys(IssueTypeService::REQUIRED_FIELD_TO_DATA_KEY))],
    'restricted_role_types' => ['sometimes', 'array'],
    'restricted_role_types.*' => ['string', Rule::in(array_map(fn (RoleType $role) => $role->value, [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER, RoleType::VIEWER]))],
]);
```

## Krok 3 — Dodaj checkbox po stronie frontendu

Plik: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIssueTypeInlineEditor.tsx`

```tsx
const REQUIRED_FIELD_OPTIONS: { value: string; label: string }[] = [
    { value: 'description', label: 'Description' },
    { value: 'assignee', label: 'Assignee' },
    { value: 'labels', label: 'Labels' },
    { value: 'start_date', label: 'Start date' },
    { value: 'end_date', label: 'End date' },
    { value: 'priority', label: 'Priority' },
    { value: 'parent', label: 'Parent issue' },
];
```

Ta tablica napędza siatkę checkboxów pod "Required fields" w edytorze
inline bezpośrednio — nic więcej w tym komponencie nie czyta sztywnej
listy nazw pól, więc to jedyna potrzebna zmiana frontendowa.

## Krok 4 — Testy

Plik: `tests/Feature/IssueTypeWorkflowIntegrationTest.php`

Powiel istniejący test `'creating an issue of a type with required
fields rejects a request missing one'`:

```php
test('creating an issue of a type requiring a parent rejects a request without one', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $this->actingAs($member)->post('/issues', ['title' => 'seed', 'project_id' => $project->id, 'priority' => 'low', 'status' => 'open']);
    $subtaskType = $project->issueTypes()->create(['name' => 'Sub-task', 'icon' => 'Bug', 'color' => '#000000', 'required_fields' => ['parent']]);

    $response = $this->actingAs($member)->post('/issues', [
        'title' => 'Orphaned sub-task',
        'project_id' => $project->id,
        'priority' => 'low',
        'status' => 'open',
        'issue_type_id' => $subtaskType->id,
    ]);

    $response->assertSessionHasErrors('parent_id');
});
```

Plik: `tests/Feature/IssueTypeControllerTest.php`

Dodaj `'parent'` do tablicy asertowanej w istniejącym teście `'an
admin can set required fields and restricted role types on an issue
type'`, żeby pokryć też ten round-trip endpointu ustawień.

Uruchom `php artisan test --filter=IssueTypeWorkflowIntegrationTest` i
`php artisan test --filter=IssueTypeControllerTest`, a także
`npx vitest run resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIssueTypeInlineEditor.test.tsx`,
przed zacommitowaniem.
