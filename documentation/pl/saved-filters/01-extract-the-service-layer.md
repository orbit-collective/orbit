# Wyodrębnij warstwę Service

`SavedFilterController` to jedyny Controller w aplikacji, który tworzy i usuwa model Eloquent bezpośrednio, omijając konwencję [Controller → Service → Repository](../architecture/02-backend-layered-architecture.md), jakiej trzyma się każda inna funkcja. Ten przewodnik doprowadza go do zgodności — ta sama zmiana, jaką [`../activity-log/01-log-a-new-kind-of-activity.md`](../activity-log/01-log-a-new-kind-of-activity.md) wprowadza jako własny przećwiczony przykład, pokazana tutaj w pełni z obiema metodami.

## Przed

Plik: `app/Http/Controllers/SavedFilterController.php`

```php
class SavedFilterController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'name' => 'required|string|max:20',
            'context' => 'required|string',
            'query_params' => 'required|array',
        ]);

        $this->authorize('view', Project::findOrFail($validated['project_id']));

        SavedFilter::create($validated);
        return redirect()->back()->with('success', 'Saved filters has been created successfully.');
    }

    public function destroy(SavedFilter $savedFilter): RedirectResponse
    {
        $this->authorize('view', $savedFilter->project);

        $savedFilter->delete();
        return redirect()->back()->with('success', 'Saved filters has been deleted successfully.');
    }
}
```

## Krok 1 — Dodaj Repository

Nowy plik: `app/Repositories/SavedFilterRepository.php`

```php
<?php

namespace App\Repositories;

use App\Models\SavedFilter;

class SavedFilterRepository
{
    public function create(array $data): SavedFilter
    {
        return SavedFilter::create($data);
    }

    public function delete(SavedFilter $savedFilter): void
    {
        $savedFilter->delete();
    }
}
```

## Krok 2 — Dodaj Service

Nowy plik: `app/Services/SavedFilterService.php`

```php
<?php

namespace App\Services;

use App\Models\Project;
use App\Models\SavedFilter;
use App\Repositories\SavedFilterRepository;

class SavedFilterService
{
    public function __construct(
        protected SavedFilterRepository $savedFilterRepository,
        protected ActivityLogService $activityLogService
    ) {}

    public function create(Project $project, array $data): SavedFilter
    {
        $filter = $this->savedFilterRepository->create($data);

        $this->activityLogService->log($project->id, "Saved a new filter: \"{$filter->name}\"");

        return $filter;
    }

    public function delete(SavedFilter $savedFilter): void
    {
        $projectId = $savedFilter->project_id;
        $name = $savedFilter->name;

        $this->savedFilterRepository->delete($savedFilter);

        $this->activityLogService->log($projectId, "Deleted the \"$name\" saved filter");
    }
}
```

Przechwyć `project_id`/`name` do zmiennych lokalnych **przed** wywołaniem `delete()` — po usunięciu modelu, atrybuty `$savedFilter` są wciąż odczytywalne w PHP (Eloquent ich nie zeruje), ale odczytywanie z dopiero co usuniętej instancji modelu to dokładnie ten rodzaj rzeczy wart unikania z zasady; każda inna metoda `delete*()` w tym kodzie, która też loguje (zobacz `RoleService::deleteRole()`) loguje **przed** wywołaniem delete repozytorium z tego samego powodu — ta metoda robi to po, czysto żeby zademonstrować alternatywę z lokalnym przechwyceniem, ale dopasowanie ustalonej kolejności "loguj-potem-usuń" jest preferowane, chyba że masz konkretny powód, żeby tego nie robić.

## Krok 3 — Zaktualizuj Controller

Plik: `app/Http/Controllers/SavedFilterController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\SavedFilter;
use App\Services\SavedFilterService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SavedFilterController extends Controller
{
    public function __construct(
        protected SavedFilterService $savedFilterService
    ) {}

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'name' => 'required|string|max:20',
            'context' => 'required|string',
            'query_params' => 'required|array',
        ]);

        $project = Project::findOrFail($validated['project_id']);
        $this->authorize('view', $project);

        $this->savedFilterService->create($project, $validated);

        return redirect()->back()->with('success', 'Saved filters has been created successfully.');
    }

    public function destroy(SavedFilter $savedFilter): RedirectResponse
    {
        $this->authorize('view', $savedFilter->project);

        $this->savedFilterService->delete($savedFilter);

        return redirect()->back()->with('success', 'Saved filters has been deleted successfully.');
    }
}
```

Walidacja, autoryzacja i odpowiedzi przekierowania/flash są całkowicie niezmienione — tylko faktyczna praca tworzenia/usuwania przenosi się poza Controller. Żadna zmiana trasy ani frontendu nie jest w ogóle potrzebna; ten refaktor jest całkowicie niewidoczny dla `useSavedFilters()`.

## Testy

- `tests/Feature/SavedFilterControllerTest.php` — każdy istniejący test wciąż przechodzi bez zmian; ćwiczy warstwę HTTP, która ma identyczne zachowanie przed i po.
- Nowy plik `tests/Feature/SavedFilterServiceTest.php` — dodaj `'it can create a saved filter and logs the change'` oraz `'it can delete a saved filter and logs the change'`, asercując zarówno stan bazy danych, jak i wiersz `activity_logs`, na wzór kształtu testów `'it can create a role and logs the change'`/`'it can delete a custom role and logs the change'` w `tests/Feature/RoleServiceTest.php`.
- Nowy plik `tests/Feature/SavedFilterRepositoryTest.php` — cienkie asercje create/delete, na wzór najmniejszego istniejącego pliku testu repozytorium (np. `tests/Feature/CommentRepositoryTest.php`) po oczekiwany poziom pokrycia.
