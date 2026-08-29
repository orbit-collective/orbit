# Dodaj nowy poziom roli systemowej

Przećwiczony przykład: dodanie piątego poziomu, **Contributor**,
znajdującego się pomiędzy Member a Viewer — może widzieć wszystko to,
co Member, oraz tworzyć issues/komentarze, ale nie może niczego usuwać
ani zarządzać członkami/rolami/ustawieniami. W tym przewodniku nigdzie
nie jest potrzebna migracja: kolumna `role` roli to zwykły string,
więc nowy przypadek `RoleType` jest poprawny w momencie, gdy enum o
nim wie.

Poziomy są celowo zapisane na sztywno w kilku miejscach zamiast być
sterowane uporządkowaną tabelą, więc ten przewodnik dotyka więcej
plików niż dodanie zwykłego uprawnienia (zobacz
[`../integrations/02-add-a-new-permission.md`](../integrations/02-add-a-new-permission.md)
po ten, znacznie krótszy, przewodnik). Wykonaj każdy krok poniżej —
pominięcie jednego niczego nie wywala, po prostu zostawia Contributor
bez możliwości zrobienia czegoś, co jest zbliżone do Membera, a
powinno być dostępne.

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

## Krok 3 — Przejrzyj każde sprawdzenie w Policy zależne od poziomu

Każde wywołanie `hasPermissionOrTier($user, $permission, $tiers)` ma
zapisaną na sztywno własną listę dozwolonych poziomów, więc nowy
poziom jest niewidoczny dla sprawdzenia, dopóki jawnie nie zdecydujesz,
że tam należy. Oto każde istniejące miejsce wywołania — przejdź przez
każde i zdecyduj, czy Contributor powinien się na nim znaleźć:

- `app/Policies/IssuePolicy.php` — `MODIFY_TIERS = [OWNER, ADMIN, MEMBER]`
- `app/Policies/CommentPolicy.php` — `OWN_TIERS = [OWNER, ADMIN, MEMBER]`, `ANY_TIERS = [OWNER, ADMIN]`
- `app/Policies/ProjectPolicy.php` — `updateDetails`, `inviteMembers`, `updateMemberRole`, `removeMember`, `viewIntegrations`, `updateIntegrations`
- `app/Http/Controllers/SettingsController.php` — `$viewTiers` oraz dwie osadzone w kodzie tablice poziomów dla `PROJECT_UPDATE`/`PROJECT_DELETE`

W tym przećwiczonym przykładzie Contributor dostaje tworzenie
issues/komentarzy oraz edycję własnych, ale nie moderację ani
usuwanie, więc:

```php
// app/Policies/IssuePolicy.php
private const array MODIFY_TIERS = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER, RoleType::CONTRIBUTOR];
```

pozostaw `CommentPolicy::ANY_TIERS` oraz każdą listę poziomów w
`ProjectPolicy`/`SettingsController` **bez zmian** — Contributor
polega na swoich `CONTRIBUTOR_DEFAULT_PERMISSIONS`
(`COMMENTS_CREATE`, `COMMENTS_UPDATE_OWN`) w kwestii komentarzy zamiast
na skrócie poziomowym, i nie ma żadnego powodu, by zarządzać
członkami/ustawieniami/integracjami. To jest właśnie decyzja, dla
której istnieje ten krok: poziom nie musi pojawiać się na każdej
liście dozwolonych, tylko na tych, które odpowiadają temu, co
zdecydowałeś, że może robić w kroku 2.

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

## Krok 6 — Zasiej uprawnienia przed ręcznym testowaniem

Tabela `permissions` nie wymaga żadnych zmian dla nowego poziomu (jest
już w pełni zasiana przez `PermissionSeeder`, zobacz
[`../integrations/02-add-a-new-permission.md`](../integrations/02-add-a-new-permission.md)
krok 6) — wiersz Contributora zostaje utworzony, a jego domyślne
uprawnienia zsynchronizowane automatycznie, przy pierwszym uruchomieniu
`ensureSystemRoles()` dla dowolnego projektu (przy tworzeniu projektu
albo przy najbliższej zmianie roli któregokolwiek członka). Aby zobaczyć
to od razu w istniejącym lokalnym projekcie:

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
  podmienia pivot dla nowego poziomu.
- `tests/Feature/Models/RoleTest.php` — jeśli gdzieś wylicza przypadki
  `RoleType`, dodaj Contributora do oczekiwanej listy.
- Każde zachowanie Policy zmienione w kroku 3
  (`IssuePolicy::MODIFY_TIERS` w tym przykładzie) jest pokryte
  pośrednio przez `tests/Feature/IssueControllerTest.php` — dodaj tam
  test "a contributor can create an issue but cannot delete one", na
  wzór istniejących testów dla poziomu Member.
- `resources/js/utils/roleTheme.test.ts` (jeśli istnieje) lub
  którykolwiek test iterujący po `ROLE_TYPE_THEME`/`RoleTypeValue` —
  dodaj `contributor`, żeby brakujący wpis w motywie zawiódł głośno
  zamiast renderować się pusto.
