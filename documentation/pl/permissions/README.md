# Role i uprawnienia (RBAC)

Każdy projekt ma własną kontrolę dostępu opartą na rolach: cztery
wbudowane **poziomy roli systemowej** (Owner, Admin, Member, Viewer)
oraz dowolną liczbę projektowych **ról niestandardowych**, obie
zbudowane z tego samego łańcucha pivotów `Role`/`Permission`. Ta
kategoria dokumentuje cały ten system — model danych, sposób w jaki
faktycznie rozstrzygane jest sprawdzenie uprawnienia oraz dwie rzeczy,
których najprawdopodobniej będziesz potrzebować: zupełnie nowy poziom
roli i nowe miejsce w aplikacji, które przyznaje rolę.

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Dodaj nowe uprawnienie](./01-add-a-new-permission.md)** —
   ogólny wzorzec dodawania zupełnie nowego przypadku `Permission`
   `projects.*`/`issues.*`/`comments.*`: kto może co robić i jak to
   się pojawia w Settings → Roles & management. Zacznij tutaj, jeśli
   potrzebujesz zabezpieczyć nową akcję własnym uprawnieniem.
2. **[Dodaj nowy poziom roli systemowej](./02-add-a-new-role-tier.md)**
   — przećwiczony przykład dodania piątego poziomu (`Contributor`,
   pomiędzy Member a Viewer) od początku do końca: enum, jego domyślny
   zestaw uprawnień, migracja tworząca rolę systemową w każdym
   istniejącym projekcie, typy na froncie oraz testy, które przypinają
   listę poziomów.
3. **[Przyznaj rolę niestandardową masowo](./03-grant-a-custom-role-in-bulk.md)**
   — przećwiczony przykład dodania nowego miejsca przyznającego rolę
   niestandardową członkom (akcja "przyznaj wszystkim obecnym
   członkom"), obejmujący kluczową różnicę między `syncRoles`
   (zastępuje) a `attachRoles` (dodaje).
4. **[Dodaj autoryzację własne-vs-cudze do nowego zasobu](./04-add-own-vs-any-authorization-to-a-new-resource.md)**
   — wzorzec `CommentPolicy` (dwa uprawnienia, `*_own` i `*_any`,
   sprawdzane po porównaniu własności) zastosowany do zasobu, który
   jeszcze go nie ma (`SavedFilter`), plus kiedy wyeksponować wynikowy
   boolean jako atrybut dołączony do modelu zamiast propa obliczonego
   przez Controller.

## Architektura w jednym akapicie

Cztery systemowe poziomy projektu (`App\Enums\Permissions\RoleType`:
Owner, Admin, Member, Viewer) są leniwie materializowane jako
prawdziwe wiersze `roles` (`is_system = true`) przez
`RoleService::ensureSystemRoles()` — dzięki czemu uprawnienia poziomu
żyją w dokładnie tej samej tabeli pivotowej `permission_role`, co
każda utworzona przez użytkownika **rola niestandardowa**
(`role = 'custom'`, `is_system = false`), z tą różnicą, że przy
pierwszym utworzeniu wiersza dla danego poziomu są zasiewane
sensownymi wartościami domyślnymi (`MEMBER_DEFAULT_PERMISSIONS`/
`VIEWER_DEFAULT_PERMISSIONS` w `RoleService`; Owner i Admin dostają
wszystkie uprawnienia). Nigdzie nie ma osobnej kolumny "poziomu":
poziom członka **to** jego jedyna *rola systemowa*, przypisana przez
ten sam pivot `project_user_role` co jego role niestandardowe
(`project_user` → `project_user_role` → `roles` → `permission_role` →
`permissions`). Oczekujące zaproszenie działa tak samo — jego poziom
jest zapisany jako rola systemowa w `project_invitation_role`, obok
ról niestandardowych (`ProjectInvitation::tier()` /
`customRoleIds()`). Dawne kolumny tekstowe `project_user.role` oraz
`project_invitations.role` już nie istnieją.

Każde sprawdzenie autoryzacji przechodzi przez jedną metodę,
`Project::hasPermission($user, Permission::X)`: Owner od razu dostaje
`true` (a systemowa rola Owner jest resetowana z powrotem do
"wszystkich uprawnień" przy każdym wywołaniu `ensureSystemRoles()` i
nigdy nie może być edytowana — `RoleService::assertNotOwnerRole()`),
a każdy inny członek dostaje sumę uprawnień wszystkich swoich ról,
rozstrzygniętą z cache'u członkostwa per użytkownik
(`Project::membershipOf()`, unieważniany przez
`CacheVersion::MEMBERSHIP`). W Policy ani w Controllerach nie ma list
dozwolonych poziomów: edycja roli systemowej (poza Owner) w Settings →
Roles naprawdę zmienia to, co mogą jej członkowie. `Project::roleOf()`
nadal zwraca string poziomu (`owner`/`admin`/`member`/`viewer`),
wyprowadzony z roli systemowej — służy do wyświetlania i do kilku
miejsc, które naprawdę zależą od poziomu (np. `restricted_role_types`
typu issue, które nadal przechowuje stringi poziomów i jest
porównywane z `roleOf()`).

Członek może jednocześnie trzymać jedną rolę systemową **i** dowolną
liczbę ról niestandardowych. Zmiany poziomu przechodzą wyłącznie przez
`RoleService::syncSystemRoleForMember()` (zmiana roli członka,
przekazanie własności, utworzenie projektu, przyjęcie zaproszenia);
swobodny endpoint synchronizacji ról oraz `roleIds` zaproszenia
przyjmują wyłącznie role niestandardowe (`RoleService::customRoleIds()`),
a `ProjectMemberRepository::syncRoles()` zostawia rolę systemową
członka nietkniętą.

## Aktualizacja ze starego modelu

Przed migracją ról poziom był kolumną tekstową
(`project_user.role`, `project_invitations.role`), a Policy wywoływały
`hasPermissionOrTier($user, $permission, $tiers)` z zapisanymi na
sztywno listami `*_TIERS`. Dwie migracje przeniosły istniejące dane:

- `2026_10_13_100000_backfill_system_roles_for_existing_members.php`
  utworzyła cztery role systemowe w **każdym istniejącym projekcie**,
  przypisała każdemu członkowi i każdemu oczekującemu zaproszeniu rolę
  systemową odpowiadającą jego dawnemu poziomowi, uzupełniła Owner/Admin
  o wszystkie uprawnienia i nadała właściciela projektom bez
  właściciela (najwcześniejszy członek, potem alfabetycznie).
- `2026_10_13_110000_drop_legacy_role_columns.php` usunęła obie dawne
  kolumny.

`Project::hasPermissionOrTier()` oraz wszystkie stałe `*_TIERS`
zostały usunięte. W testach dodawaj członków przez
`addProjectMember()` z `tests/Pest.php` (wiersz członkostwa + rola
systemowa), nigdy przez `attach(['role' => ...])`.
