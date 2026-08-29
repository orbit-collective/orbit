# Warstwowa architektura backendu

Controller → Service → Repository, bez wyjątków i bez skrótów — kontroler nigdy nie buduje zapytania Eloquent, a repozytorium nigdy nie zawiera logiki biznesowej ani nie wystrzeliwuje eventu. Prześledzone poniżej przez jedno prawdziwe, kompletne żądanie.

## Zasada dla każdej warstwy

- **Controller** (`app/Http/Controllers/`) — waliduje żądanie (inline `$request->validate([...])` albo klasa Form Request), wywołuje dokładnie jedną metodę Service, żeby wykonać faktyczną pracę, i zwraca `redirect()` (trasy mutujące) albo odpowiedź `Inertia::render(...)` (trasy stron). Nigdy nie dotyka Eloquent bezpośrednio, nigdy nie zawiera warunku reprezentującego regułę biznesową.
- **Service** (`app/Services/`) — posiada logikę biznesową i każdy efekt uboczny: zapis wpisu do `ActivityLog`, wystrzelenie domenowego `Event`, wymuszenie niezmiennika przez `ValidationException`. Wywołuje jedno lub więcej Repozytoriów po faktyczny dostęp do danych, i może wywoływać inne Serwisy (np. `ProjectMemberService` wywołuje `RoleService`). Nigdy nie zwraca odpowiedzi HTTP, nigdy nie czyta `$request` bezpośrednio.
- **Repository** (`app/Repositories/`) — każde zapytanie Eloquent w aplikacji żyje tutaj: `where()`, eager-loading, sortowanie, paginacja, agregacja. Metoda repozytorium robi dokładnie to, co mówi jej nazwa, i nic więcej — żadnych reguł biznesowych, żadnych eventów, żadnej walidacji.

## Prześledzone przez prawdziwe żądanie

`PATCH /projects/{project}/members/{user}` — awansowanie członka — od początku do końca:

```
ProjectMemberController::updateRole()
  - $this->authorize('updateMemberRole', $project)      [Policy check]
  - $request->validate([...])                            [shape check]
  - $this->projectMemberService->updateRole($project, $user, $role)
        │
        ▼
ProjectMemberService::updateRole()
  - assertIsMember() / assertNotOwner()                   [business rules]
  - $this->projectMemberRepository->updateRole(...)       [data access]
  - $this->roleService->syncSystemRoleForMember(...)      [another Service]
  - $this->activityLogService->log(...)                   [side effect]
        │
        ▼
ProjectMemberRepository::updateRole()
  - $project->users()->updateExistingPivot($userId, ['role' => $role->value])
        │
        ▼ (back up through Service, back up through Controller)
redirect()->back()->with('success', "...")
```

Każda warstwa zna tylko warstwę bezpośrednio poniżej siebie — Controller nigdy nie wywołuje Repository, a Repository nigdy nie wie, że istnieje `Policy`.

## Autoryzacja żyje poza wszystkimi trzema warstwami

`app/Policies/` to czwarty, przekrojowy temat, nie warstwa w powyższym łańcuchu — Policy jest wywoływana tylko z Controllera (`$this->authorize(...)`) albo, do obliczenia zwykłego propa boolean na potrzeby UI zamiast zabezpieczania mutującego żądania, bezpośrednio z metody Modelu (`Project::hasPermission()`/`hasPermissionOrTier()` — zobacz sekcję architektury w [`../permissions/README.md`](../permissions/README.md) po dokładnie to, kiedy używać której).

## Dodawanie zupełnie nowej domeny w tym samym wzorcu

Jeśli dodajesz zupełnie nowy zasób (nie rozszerzasz istniejącego — zobacz każdą inną kategorię w `documentation/` po to), checklista, na przykładzie `Comment` jako wzorca (mniejszy, kompletny przykład niż `Issue`):

1. **Migracja + Model** (`app/Models/`) — pola fillable, casty, relacje (`belongsTo`, `hasMany`).
2. **Repository** (`app/Repositories/`) — jedna metoda na kształt zapytania, jakiego funkcja faktycznie potrzebuje (`getForIssue()`, nie generyczny `findBy(array $criteria)` — zobacz każde istniejące repozytorium po tę konwencję: wąskie, nazwane po celu metody zamiast generycznego wrappera na query builder).
3. **Service** (`app/Services/`) — jedna publiczna metoda na przypadek użycia (`addComment()`, `updateComment()`, `deleteComment()`), każda wywołująca Repository i wystrzeliwująca jakikolwiek `Event`/wpis `ActivityLog`, jaki implikuje ten przypadek użycia.
4. **Policy** (`app/Policies/`) — jedna metoda na zdolność, na wzór `hasPermissionOrTier()`/`hasPermission()`, jeśli zasób jest scope'owany do projektu (zobacz [`../permissions/01-add-a-new-permission.md`](../permissions/01-add-a-new-permission.md)).
5. **Controller** (`app/Http/Controllers/`) — jedna akcja na trasę, każda zabezpieczona `$this->authorize(...)`, delegująca do dokładnie jednego wywołania Service.
6. **Trasy** (`routes/web.php`) — nazwane, zgrupowane z powiązanymi trasami zasobu.
7. **Typy i komponenty frontendu** — typ w `resources/js/types/` odzwierciedlający kształt modelu, potem jakiekolwiek Atoms/Molecules/Organisms, jakich potrzebuje UI funkcji (zobacz [`03-frontend-architecture-and-atomic-design.md`](./03-frontend-architecture-and-atomic-design.md)).

## Testy

Każda warstwa dostaje własny plik testów, na wzór prawdziwych: `tests/Feature/<Domain>ServiceTest.php`, `tests/Feature/<Domain>RepositoryTest.php`, `tests/Feature/<Domain>ControllerTest.php`, a jeśli domena ma ciekawe zachowanie na poziomie modelu (cast, obliczony atrybut) — `tests/Feature/Models/<Domain>Test.php`. Zobacz `tests/Feature/CommentServiceTest.php`/`CommentRepositoryTest.php`/`CommentControllerTest.php` po najmniejszy kompletny prawdziwy przykład tego czteroplikowego kształtu.
