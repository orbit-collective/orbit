# Dodaj nowy poziom roli systemowej

Przećwiczony przykład: dodanie piątego poziomu, **Contributor**,
znajdującego się pomiędzy Member a Viewer — może widzieć wszystko to,
co Member, oraz tworzyć issues/komentarze, ale nie może niczego usuwać
ani zarządzać członkami/rolami/ustawieniami.

Poziom to po prostu **rola systemowa** (`roles.is_system = true`,
`roles.role = <wartość RoleType>`), której dokładnie jeden wiersz ma
każdy projekt, więc dodanie go to głównie dane: nowy przypadek
`RoleType`, jego domyślny zestaw uprawnień w `RoleService` oraz
migracja danych tworząca nową rolę systemową w każdym *istniejącym*
projekcie (nowe projekty dostają ją automatycznie z
`ensureSystemRoles()`). **Nie ma list poziomów do utrzymywania w
Policy ani Controllerach** — każde sprawdzenie to
`Project::hasPermission($user, Permission::X)`, więc nowy poziom jest
autoryzowany wyłącznie uprawnieniami swojej roli. Zmiana schematu też
nie jest potrzebna: `roles.role` to zwykły string, więc nowy przypadek
`RoleType` jest poprawny w momencie, gdy enum o nim wie.

Po znacznie krótszy przewodnik o zabezpieczaniu nowej akcji zobacz
[`./01-add-a-new-permission.md`](./01-add-a-new-permission.md).

## Krok 1 — Dodaj przypadek enuma

Plik: `app/Enums/Permissions/RoleType.php`

```php
<?php

namespace App\Enums\Permissions;

enum RoleType: string
{
    case OWNER = 'owner';
    case ADMIN = 'admin';
    case MEMBER = 'member';
    case CONTRIBUTOR = 'contributor';
    case VIEWER = 'viewer';
    case CUSTOM = 'custom';
}
```

## Krok 2 — Zarejestruj go jako poziom systemowy i zdecyduj o domyślnych uprawnieniach

Plik: `app/Services/RoleService.php`

Dodaj przypadek do `SYSTEM_ROLE_TYPES` (to właśnie sprawia, że
`ensureSystemRoles()` tworzy/zasiewa wiersz `roles` dla niego w każdym
projekcie) i nadaj mu własną stałą `*_DEFAULT_PERMISSIONS`:

```php
private const array SYSTEM_ROLE_TYPES = [
    RoleType::OWNER,
    RoleType::ADMIN,
    RoleType::MEMBER,
    RoleType::CONTRIBUTOR,
    RoleType::VIEWER,
];

/**
 * A step down from Member: can view and contribute (issues, comments)
 * but can't delete anything or touch members/roles/settings.
 */
private const array CONTRIBUTOR_DEFAULT_PERMISSIONS = [
    Permission::PROJECT_VIEW,
    Permission::MEMBERS_VIEW,
    Permission::ROLES_VIEW,
    Permission::INTEGRATIONS_VIEW,
    Permission::ISSUES_VIEW,
    Permission::ISSUES_CREATE,
    Permission::ISSUES_UPDATE,
    Permission::COMMENTS_CREATE,
    Permission::COMMENTS_UPDATE_OWN,
];
```

Następnie dodaj odpowiednią gałąź do `defaultPermissionIdsFor()`:

```php
private function defaultPermissionIdsFor(RoleType $role): array
{
    $keys = match ($role) {
        RoleType::OWNER, RoleType::ADMIN => array_map(fn (Permission $permission) => $permission->value, Permission::cases()),
        RoleType::MEMBER => array_map(fn (Permission $permission) => $permission->value, self::MEMBER_DEFAULT_PERMISSIONS),
        RoleType::CONTRIBUTOR => array_map(fn (Permission $permission) => $permission->value, self::CONTRIBUTOR_DEFAULT_PERMISSIONS),
        RoleType::VIEWER => array_map(fn (Permission $permission) => $permission->value, self::VIEWER_DEFAULT_PERMISSIONS),
        RoleType::CUSTOM => [],
    };

    return PermissionModel::query()->whereIn('key', $keys)->pluck('id')->all();
}
```

Nic więcej w `RoleService` nie musi się zmienić —
`ensureSystemRoles()`, `syncSystemRoleForMember()`, `createRole()`,
`syncPermissions()` oraz zabezpieczenia dla Ownera/ról systemowych
operują na `SYSTEM_ROLE_TYPES`/`RoleType` w sposób ogólny.

## Krok 3 — Policy nie wymagają zmian

W przeciwieństwie do starego modelu z listami poziomów, nie ma tu nic
do przeglądania: `IssuePolicy`, `CommentPolicy`, `ProjectPolicy` i
`SettingsController` wywołują wyłącznie `hasPermission()`, więc
Contributor może tworzyć issues i komentarze (oraz edytować własne
komentarze), ponieważ `CONTRIBUTOR_DEFAULT_PERMISSIONS` z kroku 2
zawiera `ISSUES_CREATE`, `ISSUES_UPDATE`, `COMMENTS_CREATE` i
`COMMENTS_UPDATE_OWN`, a nie może niczego usuwać ani zarządzać, bo
tych uprawnień nie zawiera. Decyzja, którą kiedyś trzeba było
powtarzać w każdej Policy, żyje teraz w jednym miejscu: w domyślnym
zestawie uprawnień wybranym w kroku 2 (który administratorzy mogą
potem dostosować per projekt w Settings → Roles — edycja dowolnej
roli systemowej poza Owner naprawdę zmienia to, co mogą jej
członkowie).

Dwa miejsca nadal patrzą na sam string poziomu, przez
`Project::roleOf()`: `restricted_role_types` typu issue
(`IssuePolicy::createOfType()`) przechowuje stringi poziomów, więc nowy
poziom po prostu staje się dodatkową wartością, którą admin może tam
wybrać, oraz kod wyświetlający (odznaki, listy rozwijane) odczytujący
poziom. Sprawdź obsługę `restricted_role_types`, jeśli Contributor
ma być tam wybieralny.

## Krok 4 — Spraw, by dało się go przypisać

Plik: `app/Http/Controllers/ProjectMemberController.php` oraz
`app/Http/Controllers/ProjectInvitationController.php`

Oba już walidują przychodzącą rolę za pomocą
`Rule::enum(RoleType::class)->except([RoleType::OWNER, RoleType::CUSTOM])`
— czyli **listą wykluczeń**, nie listą dozwolonych, więc zupełnie nowy
przypadek jest przypisywalny automatycznie. Nic tu nie trzeba zmieniać,
chyba że chcesz, aby Contributor był **nieprzypisywalny** przez te
przepływy (mało prawdopodobne), w którym to przypadku dodaj go do
tablicy `except([...])` w obu plikach.

## Krok 5 — Typy i motyw na froncie

Plik: `resources/js/types/Roles.ts`

```ts
export type RoleTypeValue =
    | 'owner'
    | 'admin'
    | 'member'
    | 'contributor'
    | 'viewer'
    | 'custom';
```

Plik: `resources/js/types/ProjectMembers.ts`

```ts
export type ProjectMemberRole =
    | 'owner'
    | 'admin'
    | 'member'
    | 'contributor'
    | 'viewer';
export type AssignableProjectMemberRole = Exclude<ProjectMemberRole, 'owner'>;
```

Plik: `resources/js/utils/roleTheme.ts` — dodaj wpis `contributor` do
`ROLE_TYPE_THEME` (to właśnie stąd każdy odznaka roli, lista rozwijana
poziomu i pasek boczny ról odczytują etykietę/kolor/ikonę — pomiń to,
a Contributor wyrenderuje się z niezdefiniowanym stylem wszędzie tam,
gdzie jest poprawnie otypowany, ale nie ma wpisu w motywie):

```ts
contributor: {
    label: 'Contributor',
    dot: 'bg-teal-400',
    ring: 'stroke-teal-400',
    badgeClass: 'bg-teal-400/10 text-teal-400',
    gradient: 'from-teal-400/20 to-teal-400/5',
    icon: 'PenLine',
},
```

## Krok 6 — Uzupełnij rolę systemową w istniejących projektach

`ensureSystemRoles()` tworzy rolę Contributor w projekcie przy
najbliższym uruchomieniu (utworzenie projektu, zmiana roli członka,
zaproszenie), ale do tego czasu istniejący projekt po prostu nie ma
roli Contributor i admin nie mógłby jej wybrać. Utwórz ją wszędzie
migracją danych, na wzór
`database/migrations/2026_10_13_100000_backfill_system_roles_for_existing_members.php`:

```php
return new class extends Migration
{
    public function up(): void
    {
        $roleService = app(RoleService::class);

        Project::query()->chunkById(100, function ($projects) use ($roleService) {
            foreach ($projects as $project) {
                $roleService->ensureSystemRoles($project);
            }
        });

        CacheVersion::bump(CacheVersion::MEMBERSHIP);
    }

    public function down(): void {}
};
```

`ensureSystemRoles()` jest idempotentne: zasiewa domyślne uprawnienia
tylko dla roli, którą *właśnie utworzyło*, więc istniejące role
Owner/Admin/Member/Viewer — i wszelkie ich dostosowania przez adminów —
zostają nietknięte. Ta migracja nikomu nie przypisuje nowej roli;
członkowie przechodzą na nią zwykłym przepływem zmiany roli
(`RoleService::syncSystemRoleForMember()`).

Sama tabela `permissions` nie wymaga żadnych zmian dla nowego poziomu
(jest już w pełni zasiana przez `PermissionSeeder`, zobacz
[`./01-add-a-new-permission.md`](./01-add-a-new-permission.md)
krok 6). Aby zobaczyć rolę od razu w istniejącym lokalnym projekcie
bez migrowania:

```bash
php artisan tinker --execute="app(App\Services\RoleService::class)->ensureSystemRoles(App\Models\Project::first())"
# or, inside Docker:
make shell
php artisan tinker --execute="app(App\Services\RoleService::class)->ensureSystemRoles(App\Models\Project::first())"
```

## Krok 7 — Testy

- `tests/Feature/RoleServiceTest.php` — test
  `'it creates the owner, admin, member and viewer system roles with
  their default permissions'` asercuje dokładną listę kluczy poziomów
  (`['owner', 'admin', 'member', 'viewer']`), a
  `'it is idempotent and does not duplicate system roles'` dokładną
  liczbę "4 roli systemowych" — oba wymagają aktualizacji do 5/z
  uwzględnieniem `contributor`.
- `tests/Feature/ProjectMemberServiceTest.php` /
  `tests/Feature/ProjectMemberControllerTest.php` — dodaj test "can
  promote a member to contributor" na wzór istniejącego "can promote a
  member to admin" i potwierdź, że `syncSystemRoleForMember` poprawnie
  podmienia pivot dla nowego poziomu. W testach dodawaj członków przez
  `addProjectMember($project, $userId, 'contributor')` z
  `tests/Pest.php` (wiersz członkostwa + rola systemowa), nigdy przez
  `attach(['role' => ...])`.
- `tests/Feature/Models/RoleTest.php` — jeśli gdzieś wylicza przypadki
  `RoleType`, dodaj Contributora do oczekiwanej listy.
- Zachowanie samego poziomu jest pokryte przez testy Controllerów
  akcji, które może/nie może wykonywać — dodaj "a contributor can
  create an issue but cannot delete one" do
  `tests/Feature/IssueControllerTest.php`, na wzór istniejących testów
  dla poziomu Member. Żadna Policy nie została zmieniona, więc to
  ćwiczy `CONTRIBUTOR_DEFAULT_PERMISSIONS` od początku do końca.
- `resources/js/utils/roleTheme.test.ts` (jeśli istnieje) lub
  którykolwiek test iterujący po `ROLE_TYPE_THEME`/`RoleTypeValue` —
  dodaj `contributor`, żeby brakujący wpis w motywie zawiódł głośno
  zamiast renderować się pusto.
