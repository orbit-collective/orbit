# Dodaj autoryzację własne-vs-cudze do nowego zasobu

Przećwiczony przykład: nadanie `SavedFilter` tego samego kształtu "zawsze możesz zarządzać własnymi, ale potrzebujesz szerszego uprawnienia, żeby zarządzać cudzymi", jaki już ma `Comment` — domykając lukę, którą flaguje [`../saved-filters/README.md`](../saved-filters/README.md) (dziś każdy członek projektu może usunąć *dowolny* zapisany filtr, bez żadnego rozróżnienia własności).

## Wzorzec, tak jak już ustala go `CommentPolicy`

Plik: `app/Policies/CommentPolicy.php`

```php
private const array OWN_TIERS = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER];

private const array ANY_TIERS = [RoleType::OWNER, RoleType::ADMIN];

public function update(User $user, Comment $comment): bool
{
    $project = $comment->issue->project;

    if ($comment->user_id === $user->id) {
        return $project->hasPermissionOrTier($user, Permission::COMMENTS_UPDATE_OWN, self::OWN_TIERS);
    }

    return $project->hasPermissionOrTier($user, Permission::COMMENTS_UPDATE_ANY, self::ANY_TIERS);
}
```

Kształt jest zawsze ten sam: sprawdź najpierw, kto jest właścicielem zasobu, a potem rozgałęź się do jednego z **dwóch osobnych uprawnień** — `*_own` z szerszą listą dozwolonych poziomów (każdy poziom, który może w ogóle działać) i `*_any` z węższą (tylko poziomy zaufane, żeby dotykać cudzych rzeczy) — nigdy pojedyncze uprawnienie z doklejonym inline sprawdzeniem własności. To właśnie pozwala roli niestandardowej przyznać "edytuj własne komentarze" bez jednoczesnego przyznawania "edytuj czyjekolwiek."

## Krok 1 — Dodaj kolumnę właściciela

Nowa migracja:

```php
Schema::table('saved_filters', function (Blueprint $table) {
    $table->foreignId('user_id')->nullable()->after('project_id')->constrained()->nullOnDelete();
});
```

Nullable, więc istniejące wiersze utworzone przed tą zmianą nie potrzebują uzupełnienia, żeby pozostać poprawne — "nieposiadany" zapisany filtr po prostu nigdy nie pasuje do poniższej gałęzi "własny" i zawsze przechodzi do sprawdzenia `_any`.

## Krok 2 — Dodaj dwa uprawnienia

Na wzór dokładnego wzorca [`01-add-a-new-permission.md`](./01-add-a-new-permission.md):

```php
// app/Enums/Permissions/Permission.php
case SAVED_FILTERS_DELETE_OWN = 'saved_filters.delete_own';
case SAVED_FILTERS_DELETE_ANY = 'saved_filters.delete_any';
```

```php
// app/Services/RoleService.php
private const array MEMBER_DEFAULT_PERMISSIONS = [
    // ...existing entries...
    Permission::SAVED_FILTERS_DELETE_OWN,
];
```

Tylko `_OWN` trafia do `MEMBER_DEFAULT_PERMISSIONS` (Viewer nie dostaje żadnego, zgodnie ze swoją domyślną postawą tylko-do-odczytu) — `_ANY` jest celowo pominięte w każdej domyślnej wartości poza Owner/Admin, dokładnie zgodnie z precedensem uprawnień komentarzy.

## Krok 3 — Napisz Policy

Nowy plik: `app/Policies/SavedFilterPolicy.php`

```php
<?php

namespace App\Policies;

use App\Enums\Permissions\Permission;
use App\Enums\Permissions\RoleType;
use App\Models\SavedFilter;
use App\Models\User;

class SavedFilterPolicy
{
    private const array OWN_TIERS = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER];

    private const array ANY_TIERS = [RoleType::OWNER, RoleType::ADMIN];

    public function delete(User $user, SavedFilter $savedFilter): bool
    {
        $project = $savedFilter->project;

        if ($savedFilter->user_id === $user->id) {
            return $project->hasPermissionOrTier($user, Permission::SAVED_FILTERS_DELETE_OWN, self::OWN_TIERS);
        }

        return $project->hasPermissionOrTier($user, Permission::SAVED_FILTERS_DELETE_ANY, self::ANY_TIERS);
    }
}
```

Plik: `app/Http/Controllers/SavedFilterController.php`

```php
public function destroy(SavedFilter $savedFilter): RedirectResponse
{
    $this->authorize('delete', $savedFilter);

    $this->savedFilterService->delete($savedFilter);

    return redirect()->back()->with('success', 'Saved filters has been deleted successfully.');
}
```

zamieniając stare `$this->authorize('view', $savedFilter->project)` — to dlatego ten wzorzec należy do dedykowanej metody Policy zamiast inline w Controllerze: `authorize('delete', $savedFilter)` rozstrzyga się automatycznie do `SavedFilterPolicy::delete` (auto-discovery Policy w Laravelu, kluczowane po klasie modelu), żadna jawna rejestracja nie jest potrzebna, tak samo jak przy każdej innej Policy w tym kodzie.

## Krok 4 — Zapisz właściciela przy tworzeniu

Plik: `app/Services/SavedFilterService.php` (zobacz [`../saved-filters/01-extract-the-service-layer.md`](../saved-filters/01-extract-the-service-layer.md), jeśli tego jeszcze nie ma w Twoim checkoucie)

```php
public function create(Project $project, array $data): SavedFilter
{
    $filter = $this->savedFilterRepository->create([
        ...$data,
        'user_id' => auth()->id(),
    ]);

    $this->activityLogService->log($project->id, "Saved a new filter: \"{$filter->name}\"");

    return $filter;
}
```

## Krok 5 — Wyeksponuj to na frontend, jeśli UI musi to wiedzieć

Na wzór tej samej konwencji, jakiej używa krok 4 [`01-add-a-new-permission.md`](./01-add-a-new-permission.md) — oblicz boolean bezpośrednio z modelu/Gate na potrzeby propa UI, w ten sam sposób, w jaki robi to `Comment` jako **atrybut dołączony do modelu (appended)** zamiast obliczonego przez Controller:

```php
// app/Models/SavedFilter.php
protected $appends = ['can_delete'];

public function getCanDeleteAttribute(): bool
{
    return auth()->check() && Gate::forUser(auth()->user())->allows('delete', $this);
}
```

Dodaj `use Illuminate\Support\Facades\Gate;` do importów modelu. Sięgnij po ten kształt **atrybutu dołączonego do modelu** (zamiast obliczać boolean w Controllerze i przeprowadzać go jako osobny prop, tak jak robi to `SettingsController` dla `canUpdateIntegrations`) konkretnie wtedy, gdy zasób jest już serializowany jako lista instancji modelu wysyłana wprost na frontend — `can_delete` podróżuje wtedy za darmo z każdym filtrem w tablicy, bez żadnej osobnej równoległej tablicy id-które-można-usunąć do utrzymywania w zgodzie.

## Testy

- `tests/Feature/SavedFilterControllerTest.php` — dodaj "the owner can delete their own saved filter", "a non-owner member without `saved_filters.delete_any` cannot delete someone else's filter" oraz "an admin can delete any member's saved filter", na wzór dokładnych kształtów testów własne/cudze z `tests/Feature/CommentControllerTest.php`.
- `tests/Feature/Models/SavedFilterTest.php` — dodaj test asercujący, że `can_delete` odzwierciedla decyzję Policy zarówno dla właściciela, jak i osoby niebędącej właścicielem, na wzór pokrycia `can_edit`/`can_delete` w `tests/Feature/Models/CommentTest.php`.
- `tests/Feature/RoleServiceTest.php` — zaktualizuj dokładne asercje zbiorów id uprawnień dla domyślnych wartości Member/Viewer, żeby uwzględniały dwa nowe przypadki, ta sama aktualizacja, o jakiej mówi sekcja testów w [`01-add-a-new-permission.md`](./01-add-a-new-permission.md).
