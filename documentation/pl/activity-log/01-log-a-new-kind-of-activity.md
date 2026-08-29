# Zaloguj nowy rodzaj aktywności

Nie ma żadnego enuma, żadnego kroku rejestracji, żadnej mapy na froncie do zaktualizowania — zalogowanie nowego rodzaju aktywności to pojedyncze wywołanie metody, gdziekolwiek akcja już się dzieje w Service.

## Wzorzec

Każde istniejące miejsce wywołania trzyma się tego samego kształtu — napisz to w Service, zaraz po (albo jako część) faktycznej zmiany, ze zdaniem czytelnym dla człowieka opisującym, co się właśnie wydarzyło:

```php
// app/Services/ProjectMemberService.php
public function updateRole(Project $project, User $member, RoleType $newRole): void
{
    $this->assertIsMember($project, $member);
    $this->assertNotOwner($project, $member, 'role', "The project owner's role cannot be changed.");

    $this->projectMemberRepository->updateRole($project, $member->id, $newRole);
    $this->roleService->syncSystemRoleForMember($project, $member->id, $newRole);
    $this->activityLogService->log($project->id, "Changed $member->name's role to $newRole->value");
}
```

Przećwiczony przykład: `SavedFilterController::store()` to jedyna ścieżka zapisu w aplikacji, która niczego nie loguje — to też jedyny Controller, który całkowicie omija warstwę Service (zobacz [`../architecture/02-backend-layered-architecture.md`](../architecture/02-backend-layered-architecture.md)), tworząc model `SavedFilter` bezpośrednio. Dodanie tu linii logu oznacza najpierw wprowadzenie brakującego Service, a potem zalogowanie wewnątrz niego — te dwie rzeczy są naturalnie tą samą zmianą:

```php
// app/Http/Controllers/SavedFilterController.php
public function store(Request $request, SavedFilterService $savedFilterService): RedirectResponse
{
    $validated = $request->validate([
        'project_id' => 'required|exists:projects,id',
        'name' => 'required|string|max:20',
        'context' => 'required|string',
        'query_params' => 'required|array',
    ]);

    $project = Project::findOrFail($validated['project_id']);
    $this->authorize('view', $project);

    $savedFilterService->create($project, $validated);

    return redirect()->back()->with('success', 'Saved filters has been created successfully.');
}
```

```php
// app/Services/SavedFilterService.php (new file)
namespace App\Services;

use App\Models\Project;
use App\Models\SavedFilter;

class SavedFilterService
{
    public function __construct(
        protected ActivityLogService $activityLogService
    ) {}

    public function create(Project $project, array $data): SavedFilter
    {
        $filter = SavedFilter::create($data);

        $this->activityLogService->log($project->id, "Saved a new filter: \"{$filter->name}\"");

        return $filter;
    }
}
```

Zobacz [`../saved-filters/README.md`](../saved-filters/README.md) po resztę tego, co pełna ekstrakcja Service dla tego Controllera pokrywałaby poza samą linią logu.

## Konwencje do przestrzegania

- **Wstrzyknij `ActivityLogService`** do konstruktora Service (już tam jest w prawie każdym Service — `RoleService`, `ProjectMemberService`, `IssueService`, `ProjectInvitationService`, `NotificationSettingService` i więcej, wszystkie go przyjmują).
- **Napisz kompletne zdanie w czasie przeszłym** nazywające konkretną rzecz, która się zmieniła, z prawdziwą nazwą/wartością tam, gdzie ma to znaczenie — "Changed Jane's role to admin," nie "Role updated." Treść (`body`) to cały rekord; nie ma żadnych ustrukturyzowanych danych obok, z których można by później zrekonstruować kontekst.
- **`$projectId` to `null` dla aktywności na poziomie konta** (niezwiązanej z żadnym projektem) — zobacz kształt `$this->activityLogService->log(null, 'Updated notification settings', $userId);` w `NotificationSettingService::updateSettings()`.
- **Przekaż `$userId` jawnie tylko wtedy, gdy aktorem nie jest zalogowany użytkownik** — np. `ProjectInvitationService::revoke()` loguje względem `auth()->id()` niejawnie, podczas gdy akcja wywołana przez system w imieniu kogoś innego musiałaby przekazać jego id jawnie. Każde istniejące miejsce wywołania pomija go, chyba że jest konkretny powód, żeby nie polegać na domyślnej wartości.

## Testy

Jakikolwiek test już pokrywający metodę Service, do której dodałeś linię logu — dodaj (albo rozszerz) asercję taką jak:

```php
$this->assertDatabaseHas('activity_logs', [
    'project_id' => $project->id,
    'body' => 'Saved a new filter: "My filter"',
]);
```

na wzór dokładnego wzorca, jakiego już używa test `'it can transfer ownership to another member and demotes the previous owner to admin'` w `tests/Feature/ProjectMemberServiceTest.php`. Nie dodawaj nowego, dedykowanego przypadku `ActivityLogServiceTest` dla tego — linia logu to jedna asercja wewnątrz testu faktycznej funkcji, nie funkcja sama w sobie. Dla konkretnie powyższego przykładu `SavedFilterService`, ta asercja należy do nowego `tests/Feature/SavedFilterServiceTest.php` — `tests/Feature/SavedFilterControllerTest.php` już istnieje i pokrywa warstwę HTTP, ale nie ma jeszcze dedykowanego testu na poziomie Service, ponieważ nie ma jeszcze też Service (zobacz [`../saved-filters/README.md`](../saved-filters/README.md)).
