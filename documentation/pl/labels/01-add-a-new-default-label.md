# Dodaj nowy domyślny label

Przećwiczony przykład: dodanie siódmego startowego labela, `security`,
do sześciu, jakimi zasiewany jest każdy projekt (`bug`, `feature`,
`performance`, `design`, `ux`, `chore`). Zmienia to tylko to, co
dostaje **zupełnie nowy** projekt — istniejący projekt, który miał już
zasiane swoje labele, zachowuje dokładnie te labele, jakie ma teraz
(zobacz notatkę o architekturze w `README.md`, dlaczego
`ensureSystemLabels()` nigdy nie wskrzesza usuniętego labela).

Jeśli chcesz po prostu dodać jednorazowy label **niestandardowy** do
jednego projektu, nie ruszaj żadnego kodu — użyj **Ustawienia → Labele**
w samej aplikacji. Ten przewodnik dotyczy zmiany tego, co dostaje
każdy projekt domyślnie.

## Krok 1 — Dodaj definicję

Plik: `app/Services/LabelService.php`

```php
private const array SYSTEM_LABELS = [
    ['name' => 'bug', 'color' => '#f44336', 'description' => 'Something isn’t working as expected.'],
    ['name' => 'feature', 'color' => '#2196f3', 'description' => 'A new capability or request.'],
    ['name' => 'performance', 'color' => '#9c27b0', 'description' => 'Related to speed, load, or resource usage.'],
    ['name' => 'design', 'color' => '#00bcd4', 'description' => 'Visual, layout, or interaction design work.'],
    ['name' => 'ux', 'color' => '#009688', 'description' => 'Usability and user-experience concerns.'],
    ['name' => 'chore', 'color' => '#e91e63', 'description' => 'Maintenance work with no direct user impact.'],
    ['name' => 'security', 'color' => '#ff5722', 'description' => 'A vulnerability or security-relevant change.'],
];
```

`color` musi być 6-cyfrowym stringiem hex — `LabelController@store`/`@update`
walidują go przez `regex:/^#[0-9a-fA-F]{6}$/`, a `ensureSystemLabels()`
całkowicie pomija tę walidację (wstawia te wiersze bezpośrednio przez
`LabelRepository::firstOrCreateSystemLabel()`), więc niepoprawny hex tutaj
ujawniłby się dopiero później jako zepsuta próbka koloru w UI —
sprawdź dwa razy, czy jest poprawny, zanim to zacommitujesz.

To wszystko po stronie backendu — `ensureSystemLabels()` iteruje po
`SYSTEM_LABELS` i wywołuje
`$this->labelRepository->firstOrCreateSystemLabel($project, $definition)`
dla każdego z nich, więc nowy wpis zostanie automatycznie podchwycony
przy następnym zasiewaniu labeli dla **nowego** projektu (przy jego
pierwszym tworzeniu/edycji issue'a, albo gdy ktoś pierwszy raz otworzy
jego zakładkę Ustawienia → Labele — zobacz `LabelController`/
`IssueController`, oba wywołują `ensureSystemLabels()` zanim zrobią
cokolwiek związanego z labelami).

## Krok 2 — Zaktualizuj testy, które sprawdzają sztywną liczbę/listę

Plik: `tests/Feature/LabelServiceTest.php`

```php
test('it seeds the 6 system labels for a project on first use', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemLabels($project);

    $this->assertDatabaseCount('labels', 6);
    expect($project->labels()->where('is_system', true)->pluck('name')->sort()->values()->all())
        ->toBe(['bug', 'chore', 'design', 'feature', 'performance', 'ux']);
});
```

Zamień `6` na `7` i dodaj `'security'` do posortowanej listy (sortuje
się alfabetycznie po `'performance'` i przed `'ux'`):

```php
test('it seeds the 7 system labels for a project on first use', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemLabels($project);

    $this->assertDatabaseCount('labels', 7);
    expect($project->labels()->where('is_system', true)->pluck('name')->sort()->values()->all())
        ->toBe(['bug', 'chore', 'design', 'feature', 'performance', 'security', 'ux']);
});
```

Test `'getLabels seeds system labels and returns them for the project'`
w `tests/Feature/LabelServiceTest.php` też sprawdza sztywną liczbę
(`toHaveCount(6)`) — zmień ją również na `7`.

## Krok 3 — Nic więcej nie trzeba zmieniać

W przeciwieństwie do starego, sztywnego `App\Enums\IssueLabel`, który
to zastąpiło, nie ma żadnego frontendowego typu unii ani zaszytej na
sztywno listy do zaktualizowania: `LabelBadge`, `EditableLabelList`,
`FilterDropdown` typu `labels` i `WorkspaceSettingsLabelsTab` czytają
aktualną listę labeli z `useProjectLabels()`/propsu `labels`, który
kontroler buduje z `LabelService::getLabels()` — zobacz
[`../architecture/03-frontend-architecture-and-atomic-design.md`](../architecture/03-frontend-architecture-and-atomic-design.md)
po ogólne wyjaśnienie, dlaczego tak jest, a
[`02-expose-project-labels-to-a-new-page.md`](./02-expose-project-labels-to-a-new-page.md)
po to, jak strona w ogóle dostaje dostęp do tych danych.

Przed zacommitowaniem uruchom `php artisan test --filter=LabelServiceTest`.
