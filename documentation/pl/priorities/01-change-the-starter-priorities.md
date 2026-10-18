# Zmień startowe priorytety

Przećwiczony przykład: dodanie czwartego startowego priorytetu,
`Urgent`, ponad trzema, które dostaje każdy projekt (`High`, `Medium`,
`Low`). Edycja `SYSTEM_PRIORITIES` zmienia tylko to, z czym startuje
**zupełnie nowy** projekt — projekt, którego skala została już zasiana
(ma niepusty `projects.priorities_seeded_at`), zachowuje dokładnie
priorytety, które ma teraz, bo `ensureSystemPriorities()` działa raz na
projekt i niczego nie wskrzesza ani nie uzupełnia (zobacz notkę o
architekturze w `README.md`).

Jeśli chcesz tylko dodatkowy priorytet w **jednym** projekcie, nie
dotykaj żadnego kodu — użyj **Ustawienia → Priorities** w samej
aplikacji. Ten przewodnik jest do zmiany tego, co dostaje każdy nowy
projekt, oraz do dociągnięcia istniejących projektów, gdy naprawdę tego
chcesz.

## Krok 1 — Dodaj definicję

Plik: `app/Services/PriorityService.php`

`Urgent` jest najważniejszym priorytetem, więc dostaje pozycję `0`, a
pozostałe przesuwają się o jedno miejsce w dół. Domyślny pozostaje
`Medium`.

```php
public const array SYSTEM_PRIORITIES = [
    ['name' => 'Urgent', 'color' => '#b71c1c', 'icon' => 'Siren', 'position' => 0, 'is_default' => false],
    ['name' => 'High', 'color' => '#f44336', 'icon' => 'SignalHigh', 'position' => 1, 'is_default' => false],
    ['name' => 'Medium', 'color' => '#ff9800', 'icon' => 'SignalMedium', 'position' => 2, 'is_default' => true],
    ['name' => 'Low', 'color' => '#4caf50', 'icon' => 'SignalLow', 'position' => 3, 'is_default' => false],
];
```

`color` musi być 6-cyfrowym hexem, a `icon` nazwą ikony z lucide-react.
`PriorityController@store`/`@update` walidują kolor przez
`regex:/^#[0-9a-fA-F]{6}$/`, ale `ensureSystemPriorities()` całkowicie
pomija tę walidację (wstawia te wiersze bezpośrednio przez
`PriorityRepository::firstOrCreateSystemPriority()`), więc błędna
wartość wyszłaby dopiero później jako zepsuta próbka koloru w UI.
Wybieraj ikonę z `PRIORITY_ICON_OPTIONS` w
`resources/js/utils/priorityIcons.ts` (`Siren` tam jest):
`resolvePriorityIcon()` robi fallback na `Flag` dla nazwy, której lucide
nie zna, ale ikona spoza listy nie jest oferowana przez wybierak ikon w
zakładce ustawień.

To wszystko dla nowych projektów: `ensureSystemPriorities()` iteruje po
liście i dla każdego wpisu woła `firstOrCreateSystemPriority()`,
dopasowując po `name`, przy następnej potrzebie priorytetów
**niezasianego** projektu (pierwsze utworzenie/aktualizacja issue'a albo
otwarcie jego zakładki Ustawienia → Priorities). Nic innego nie trzyma
własnej kopii listy — `SYSTEM_PRIORITIES` jest też tym, z czego zasiewają
migracje danych legacy — więc nie ma listy na froncie, enuma ani
`<select>` do aktualizacji.

Dwa zachowania, o których warto wiedzieć: pozycja `0` to to, co licznik
`topPriority` na dashboardzie traktuje jako "szczyt skali", więc nowe
projekty liczą tam teraz issue'y `Urgent` zamiast `High`; a domyślny
`Medium` oznacza, że nowe issue'y nadal są tworzone jako `Medium`.

## Krok 2 — Dociągnij istniejące projekty (opcjonalnie)

Pomiń to, a każdy istniejący projekt po prostu zachowa swoje trzy
priorytety, co zwykle jest właściwe: właściciele tych projektów mogli
celowo zmienić nazwę lub usunąć `High`/`Low`. Jeśli jednak chcesz mieć
`Urgent` wszędzie, dostarcz migrację danych — nigdy nie pętl się po
projektach w serwisie ani w requeście. Musi ruszać tylko projekty, które
**zostały zasiane** (niezasiany dostanie `Urgent` z kroku 1, gdy zostanie
zasiany), być idempotentna, zostawiać w spokoju projekty, które mają już
priorytet o tej nazwie, i podbijać cache issue'ów, bo zapisuje przez query
builder (żaden event modelu się nie uruchamia).

Plik: `database/migrations/2026_10_19_100000_add_urgent_priority_to_seeded_projects.php`

```php
<?php

use App\Services\PriorityService;
use App\Support\Cache\CacheVersion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Projects seeded before "Urgent" joined the starter scale get it at the top
 * of their own scale (the others move down one place). A project that
 * already has a priority called "Urgent" in any case is left alone, and an
 * unseeded project is skipped: it receives the new starter scale when it is
 * seeded.
 */
return new class extends Migration
{
    public function up(): void
    {
        $urgent = collect(PriorityService::SYSTEM_PRIORITIES)->firstWhere('name', 'Urgent');

        DB::table('projects')
            ->whereNotNull('priorities_seeded_at')
            ->pluck('id')
            ->each(function (int $projectId) use ($urgent) {
                $exists = DB::table('priorities')
                    ->where('project_id', $projectId)
                    ->whereRaw('lower(name) = ?', [mb_strtolower($urgent['name'])])
                    ->exists();

                if ($exists) {
                    return;
                }

                DB::table('priorities')->where('project_id', $projectId)->increment('position');

                DB::table('priorities')->insert([
                    'project_id' => $projectId,
                    'name' => $urgent['name'],
                    'color' => $urgent['color'],
                    'icon' => $urgent['icon'],
                    'position' => 0,
                    'is_default' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });

        // Written through the query builder, so no model event dropped the
        // cached issue lists (they carry each issue's priority position).
        CacheVersion::bump(CacheVersion::ISSUES);
    }

    public function down(): void
    {
        // Issues may already use the new priority; deleting it would orphan
        // them silently, so rolling back is left to a human.
    }
};
```

Tak jak prawdziwe migracje `2026_10_18_*`, czyta definicję z
`PriorityService::SYSTEM_PRIORITIES` zamiast powtarzać wartości. To wiąże
migrację z *aktualną* wartością stałej, co jest w porządku dla jednorazowej
migracji, uruchamianej raz; jeśli startowa lista zmieni się jeszcze raz,
ta migracja nie powinna po cichu zmienić znaczenia — skopiuj wtedy
literalne wartości, jeśli ma pozostać powtarzalna.

## Krok 3 — Zaktualizuj testy, które asertują startową skalę

Plik: `tests/Feature/PriorityServiceTest.php`

```php
test('a project is seeded with High, Medium and Low in that order, Medium being the default', function () {
    $priorities = $this->service->getPriorities($this->project);

    expect($priorities->pluck('name')->all())->toBe(['High', 'Medium', 'Low'])
        ->and($priorities->pluck('position')->all())->toBe([0, 1, 2])
        ->and($priorities->firstWhere('is_default', true)->name)->toBe('Medium')
        ->and($this->project->fresh()->priorities_seeded_at)->not->toBeNull();
});
```

staje się:

```php
test('a project is seeded with Urgent, High, Medium and Low in that order, Medium being the default', function () {
    $priorities = $this->service->getPriorities($this->project);

    expect($priorities->pluck('name')->all())->toBe(['Urgent', 'High', 'Medium', 'Low'])
        ->and($priorities->pluck('position')->all())->toBe([0, 1, 2, 3])
        ->and($priorities->firstWhere('is_default', true)->name)->toBe('Medium')
        ->and($this->project->fresh()->priorities_seeded_at)->not->toBeNull();
});
```

Potem uruchom cały zestaw testów PHP, a nie tylko ten plik — wiele testów
zakłada dokładną startową skalę. Spodziewaj się poprawek w:

- testach, które **tworzą lub zmieniają nazwę priorytetu na `Urgent`**
  (np. w `PriorityServiceTest`, `PriorityControllerTest`,
  `IssueControllerTest`) — ta nazwa istnieje teraz w zasianym projekcie
  i jest odrzucana jako duplikat, więc daj tym testom inną nazwę
  (`Critical`);
- testach asertujących **liczbę lub pozycję** zasianej skali, np.
  `->position` `3` dla nowo utworzonego priorytetu (teraz `4`) albo
  `priorities()->count()` `4` (teraz `5`);
- testach asertujących statystyki `topPriority`/`priority` na
  dashboardzie, jeśli opierają się na tym, że `High` jest pozycją `0`.

Dodaj jeden test migracji, wzorowany na
`tests/Feature/MoveIssuePriorityTest.php` /
`tests/Feature/MigratePriorityNameReferencesTest.php`: utwórz jeden
projekt z jego trzema starymi priorytetami ręcznie i ustaw
`priorities_seeded_at` (`ensureSystemPriorities()` zasiałoby już
`Urgent`), uruchom migrację i zasertuj, że `Urgent` jest na pozycji `0`,
pozostałe przesunęły się o jeden w dół, domyślny się nie zmienił,
dwukrotne uruchomienie nie dodaje drugiego `Urgent`, a niezasiany projekt
nie dostaje wiersza.

Frontend nie ma kopii startowej skali do zmiany — fixtures Vitest i
Storybooka (`priorities` w `resources/js/stories/fixtures.ts`) to dane
przykładowe, a nie lustro `SYSTEM_PRIORITIES`.

Uruchom `php artisan test --filter=Priority`, a potem `composer test`
przed commitem.
