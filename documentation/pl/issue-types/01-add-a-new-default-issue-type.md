# Dodaj nowy domyślny typ issue

Przećwiczony przykład: dodanie siedemnastego startowego typu,
`Compliance`, do 16, jakie dostaje każdy projekt. To zmienia tylko to,
co dostaje **zupełnie nowy** projekt — istniejący projekt, którego typy
issue zostały już zasiane, zachowuje dokładnie te typy, jakie ma teraz
(zobacz notatkę o architekturze w `README.md`, dlaczego
`ensureSystemIssueTypes()` nigdy nie wskrzesza usuniętego typu).

Jeśli chcesz tylko jednorazowy, **niestandardowy** typ issue dla
jednego projektu, nie dotykaj żadnego kodu — użyj **Ustawienia → Issue
Types** w samej aplikacji. Ten przewodnik dotyczy zmiany tego, co
dostaje domyślnie każdy projekt.

## Krok 1 — Dodaj definicję

Plik: `app/Services/IssueTypeService.php`

```php
private const array SYSTEM_ISSUE_TYPES = [
    ['name' => 'Task', 'icon' => 'SquareCheck', 'color' => '#3b82f6', 'description' => 'A unit of work to be done.'],
    ['name' => 'Feature', 'icon' => 'Sparkles', 'color' => '#6366f1', 'description' => 'A new capability or request.'],
    ['name' => 'Story', 'icon' => 'BookOpen', 'color' => '#22c55e', 'description' => 'A user-facing piece of functionality.'],
    ['name' => 'Bug', 'icon' => 'Bug', 'color' => '#ef4444', 'description' => 'Something isn’t working as expected.'],
    ['name' => 'Epic', 'icon' => 'Zap', 'color' => '#a855f7', 'description' => 'A large body of work that can be broken down into smaller issues.', 'allows_children' => true],
    ['name' => 'Spike', 'icon' => 'Microscope', 'color' => '#06b6d4', 'description' => 'A time-boxed investigation into an unknown.'],
    ['name' => 'Chore', 'icon' => 'Wrench', 'color' => '#78716c', 'description' => 'Maintenance work with no direct user impact.'],
    ['name' => 'Improvement', 'icon' => 'TrendingUp', 'color' => '#14b8a6', 'description' => 'An enhancement to something that already exists.'],
    ['name' => 'Incident', 'icon' => 'Flame', 'color' => '#f97316', 'description' => 'An active production issue requiring attention.'],
    ['name' => 'Security', 'icon' => 'Shield', 'color' => '#b91c1c', 'description' => 'A security concern or vulnerability.'],
    ['name' => 'Infrastructure', 'icon' => 'Server', 'color' => '#64748b', 'description' => 'Work related to infrastructure or tooling.'],
    ['name' => 'Research', 'icon' => 'FlaskConical', 'color' => '#8b5cf6', 'description' => 'Open-ended exploration or analysis.'],
    ['name' => 'Experiment', 'icon' => 'TestTube', 'color' => '#eab308', 'description' => 'A trial to validate a hypothesis.'],
    ['name' => 'Documentation', 'icon' => 'FileText', 'color' => '#0ea5e9', 'description' => 'Writing or updating documentation.'],
    ['name' => 'Design', 'icon' => 'Palette', 'color' => '#ec4899', 'description' => 'Visual, layout, or interaction design work.'],
    ['name' => 'AI Task', 'icon' => 'Bot', 'color' => '#10b981', 'description' => 'A task intended to be carried out by an AI agent.'],
    ['name' => 'Compliance', 'icon' => 'Scale', 'color' => '#0d9488', 'description' => 'Regulatory or policy compliance work.'],
];
```

Dwie rzeczy, które trzeba zrobić dobrze:

- `color` musi być 6-cyfrowym stringiem hex —
  `IssueTypeController@store`/`@update` walidują go
  `regex:/^#[0-9a-fA-F]{6}$/`, a `ensureSystemIssueTypes()` całkowicie
  pomija tę walidację (wstawia te wiersze bezpośrednio przez
  `IssueTypeRepository::firstOrCreateSystemType()`), więc źle
  sformatowany hex tutaj ujawni się dopiero później jako zepsuty
  kolorowy swatch w UI — sprawdź dwa razy, że jest poprawny, zanim
  zacommitujesz.
- `icon` musi być kluczem, który faktycznie istnieje w mapie `icons`
  z lucide-react, a nie tylko nazwanym eksportem z tego pakietu —
  niektóre eksporty to przestarzałe aliasy, których nie ma w tej
  mapie (np. `CheckSquare` nie jest, `SquareCheck` jest, dlatego
  `Task` powyżej używa tego drugiego). Zweryfikuj to jednorazowym
  sprawdzeniem w Node przed wyborem:

  ```bash
  node -e "const { icons } = require('lucide-react'); console.log('Scale' in icons);"
  ```

  Jeśli wypisze `false`, atom `Icon` na frontendzie w czasie
  renderowania spada do ogólnej ikony ostrzegawczej i loguje
  ostrzeżenie w konsoli — to nie zepsuje builda, ale będzie źle
  wyglądać w badge'u.

Tylko `name`, `icon`, `color` i `description` są wymagane w każdym
wpisie; dodaj `'allows_children' => true` tylko dla typu, który ma
zawierać sub-issue, tak jak robi to `Epic`.

To wszystko po stronie backendu — `ensureSystemIssueTypes()` iteruje po
`SYSTEM_ISSUE_TYPES`, wywołuje
`$this->issueTypeRepository->firstOrCreateSystemType($project, $definition)`
dla każdego z nich i nadaje każdemu domyślny trójstanowy workflow przez
prywatną metodę `ensureDefaultWorkflow()` — więc nowy wpis zostanie
automatycznie podchwycony przy najbliższym zasiewaniu typów issue
**nowego** projektu (jego pierwsze utworzenie/edycja issue, albo
pierwsze otwarcie zakładki Ustawienia → Issue Types — zobacz
`IssueTypeController`/`IssueController`, oba wywołują
`ensureSystemIssueTypes()` przed jakąkolwiek operacją na typach issue).

## Krok 2 — Zaktualizuj testy asertujące stałą liczbę/listę

Plik: `tests/Feature/IssueTypeServiceTest.php`

```php
test('it seeds the 16 system issue types for a project on first use', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemIssueTypes($project);

    $this->assertDatabaseCount('issue_types', 16);
    expect($project->issueTypes()->where('is_system', true)->pluck('name')->sort()->values()->all())
        ->toBe([
            'AI Task', 'Bug', 'Chore', 'Design', 'Documentation', 'Epic', 'Experiment',
            'Feature', 'Improvement', 'Incident', 'Infrastructure', 'Research',
            'Security', 'Spike', 'Story', 'Task',
        ]);
});
```

Zwiększ `16` do `17` i dodaj `'Compliance'` do posortowanej listy
(sortuje się alfabetycznie zaraz po `'Chore'` i przed `'Design'`):

```php
test('it seeds the 17 system issue types for a project on first use', function () {
    $project = Project::factory()->create();

    $this->service->ensureSystemIssueTypes($project);

    $this->assertDatabaseCount('issue_types', 17);
    expect($project->issueTypes()->where('is_system', true)->pluck('name')->sort()->values()->all())
        ->toBe([
            'AI Task', 'Bug', 'Chore', 'Compliance', 'Design', 'Documentation', 'Epic', 'Experiment',
            'Feature', 'Improvement', 'Incident', 'Infrastructure', 'Research',
            'Security', 'Spike', 'Story', 'Task',
        ]);
});
```

Test `'getIssueTypes seeds system issue types and returns them for the
project'` w `tests/Feature/IssueTypeServiceTest.php` też asertuje
stałą liczbę (`toHaveCount(16)`) — zwiększ i ten do `17`.

## Krok 3 — Nic więcej nie trzeba zmieniać

`IssueTypeBadge`, katalog Ustawienia → Issue Types, kolumna `type` na
liście issue'ów oraz rozwiązywanie domyślnego typu w przepływie
quick-add (`IssueTypeService::defaultIssueType()`, który zawsze
rozwiązuje się do `Task` niezależnie od tego, ile innych typów
istnieje) — wszystkie czytają bieżącą listę typów z
`IssueTypeService::getIssueTypes()`/propsa `issueTypes`, który buduje
`SettingsController` — nie ma frontendowego typu unii ani zaszytej na
sztywno listy do zaktualizowania, dokładnie tak samo jak przy labelach
(zobacz
[`../labels/01-add-a-new-default-label.md`](../labels/01-add-a-new-default-label.md)).

Uruchom `php artisan test --filter=IssueTypeServiceTest` przed
zacommitowaniem.
