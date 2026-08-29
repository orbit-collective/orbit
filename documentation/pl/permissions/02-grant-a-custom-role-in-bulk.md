# Przyznaj rolę niestandardową masowo

Przećwiczony przykład: nowa akcja "Przyznaj wszystkim obecnym
członkom" dla roli niestandardowej, tak aby właściciel/admin projektu
mógł dać każdemu istniejącemu członkowi rolę (np. dopiero co
utworzoną rolę "QA Lead") bez otwierania selektora roli każdego
członka po kolei.

Najważniejsza zasada w tym przewodniku: przyznanie roli
niestandardowej członkowi **nigdy** nie może dotknąć jego poziomu
systemowego. Każda istniejąca ścieżka zapisu, która przypisuje role,
już to respektuje, używając dwóch różnych metod repozytorium do dwóch
różnych zadań — `ProjectMemberRepository::syncRoles()` (**zastępuje**
role niestandardowe członka) do interfejsu "edytuj role niestandardowe
tego członka" per-członek, oraz `ProjectMemberRepository::attachRoles()`
(**dodaje**, nigdy nie odłącza) dla
`ProjectInvitationService::acceptByToken()`, które przyznaje wszelkie
role niestandardowe dołączone do zaproszenia, ponad jakimkolwiek
poziomem systemowym, jaki zaproszenie określało. Akcja masowego
przyznania jest bliższa przypadkowi zaproszenia — *dodaje* jedną rolę
wielu osobom, nie zastępuje całego zestawu ról niestandardowych każdej
osoby — więc musi używać `attachRoles()`, nie `syncRoles()`.

## Krok 1 — Dodaj metodę w serwisie

Plik: `app/Services/RoleService.php`

```php
public function grantToAllMembers(Project $project, Role $role): void
{
    $this->assertNotSystemRole($role);

    foreach ($this->projectMemberRepository->getMembers($project) as $member) {
        $this->projectMemberRepository->attachRoles($project, $member->id, [$role->id]);
    }

    $this->activityLogService->log($project->id, "Granted the \"$role->name\" role to every member");
}
```

`assertNotSystemRole()` już istnieje w tej klasie (używana przez
`deleteRole()`) i jest tu ponownie użyta bez zmian — masowe przyznanie
roli poziomu systemowego (Owner/Admin/Member/Viewer) w ten sposób
byłoby pozbawione sensu, ponieważ poziomy są przypisywane pojedynczo
przez `ProjectMemberService::updateRole()`, nigdy nie są dołączane
obok poziomu, który członek już posiada.

## Krok 2 — Dodaj akcję w kontrolerze i trasę

Plik: `app/Http/Controllers/RoleController.php`

```php
public function grantToAllMembers(Project $project, Role $role): RedirectResponse
{
    $this->ensureRoleBelongsToProject($project, $role);
    $this->authorize('assign', [Role::class, $project]);

    $this->roleService->grantToAllMembers($project, $role);

    return redirect()->back()->with('success', "The \"$role->name\" role has been granted to every member.");
}
```

To ponownie wykorzystuje `RolePolicy::assign` — dokładnie tę samą
zdolność, która już blokuje dostęp do
`ProjectMemberController::syncRoles()` i pola `roles` w
`ProjectInvitationController::store()` — ponieważ "przyznaj tę rolę
komuś" to to samo uprawnienie niezależnie od tego, ilu osobom jest
przyznawane naraz.

Plik: `routes/web.php`, obok pozostałych tras `roles/{role}`:

```php
Route::post('/projects/{project}/roles/{role}/grant-all', [RoleController::class, 'grantToAllMembers'])->name('projects.roles.grant-all');
```

## Krok 3 — Podepnij przycisk

Plik: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsRolesTab.tsx`

Zastosuj ten sam kształt `router.<verb>(url, { preserveScroll,
onStart, onFinish, onSuccess, onError })`, jakiego
`WorkspaceSettingsDeleteRoleModal.tsx` już używa dla `roles.destroy`:

```ts
import { router } from '@inertiajs/react';

const handleGrantToAll = (role: WorkspaceRole) => {
    router.post(
        `/projects/${projectId}/roles/${role.id}/grant-all`,
        {},
        {
            preserveScroll: true,
            onSuccess: () => {
                addAlert(
                    `The "${role.name}" role has been granted to every member.`,
                    'success',
                );
            },
            onError: () => {
                addAlert(
                    `Failed to grant the "${role.name}" role to every member.`,
                    'error',
                );
            },
        },
    );
};
```

Zabezpiecz sam przycisk tym samym uprawnieniem, które sprawdza backend
— ten projekt oblicza boolowskie flagi na potrzeby UI bezpośrednio na
modelu `Project`, a nie przez warstwę Policy (zobacz
[`../integrations/02-add-a-new-permission.md`](../integrations/02-add-a-new-permission.md)
krok 4), więc przeprowadź prop `canAssignRoles` w dół od nadrzędnej
strony Inertia kontrolera `RoleController` dokładnie tak, jak
`canUpdateIntegrations` już przepływa do tej zakładki.

## Krok 4 — Testy

- `tests/Feature/RoleServiceTest.php` — dodaj
  `'it can grant a custom role to every current member and logs the
  change'`, asercując, że każdy członek kończy z posiadaną rolą
  poprzez `$member->pivot->roles`, oraz że członkowie, którzy już ją
  posiadali, nie są zdublowani (`attachRoles()`'s `syncWithoutDetaching`
  już to gwarantuje — test musi tylko to potwierdzić).
- `tests/Feature/RoleControllerTest.php` — na wzór `'an admin can
  create a role'`/`'a member without the roles.create permission
  cannot create a role'` dodaj analogiczne testy dla nowej trasy:
  admin może przyznać, zwykły member bez `roles.assign` (i bez roli
  niestandardowej, która to przyznaje) dostaje 403, a przyznanie roli
  z innego projektu przez niepasującą parę `{project}`/`{role}` zwraca
  404 (skopiuj konfigurację z `'a role from another project cannot be
  updated through a mismatched project'`).
- `tests/Feature/ProjectMemberRepositoryTest.php` — bez zmian;
  `attachRoles()` jest tam już pokryte testami, a metoda serwisu z
  tego przewodnika wywołuje ją bez modyfikacji.
