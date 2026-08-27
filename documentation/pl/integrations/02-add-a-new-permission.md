# Dodaj nowe uprawnienie

Przećwiczony przykład: dwa uprawnienia, których integracje faktycznie dziś używają, `projects.integrations.view` i `projects.integrations.update`. Ten wzorzec dotyczy **każdego** nowego uprawnienia `projects.*`/`issues.*`/`comments.*`, nie tylko tych związanych z integracjami.

## Krok 1 — Dodaj przypadek enuma

Plik: `app/Enums/Permissions/Permission.php`

```php
enum Permission: string
{
    // ... existing cases ...

    case SETTINGS_VIEW = 'projects.settings.view';
    case SETTINGS_UPDATE = 'projects.settings.update';

    case INTEGRATIONS_VIEW = 'projects.integrations.view';
    case INTEGRATIONS_UPDATE = 'projects.integrations.update';
}
```

**Struktura kropek w wartości string ma znaczenie** na froncie (zobacz krok 5) — `group.subgroup.action` renderuje się jako karta "Group" z sekcją "Subgroup" w środku. Trzymaj się istniejących prefiksów `projects.`, `issues.`, `comments.`, chyba że wprowadzasz naprawdę nowy obszar najwyższego poziomu.

## Krok 2 — Zdecyduj, kto dostaje je domyślnie

Plik: `app/Services/RoleService.php`

Każdy projekt ma cztery role systemowe (Owner, Admin, Member, Viewer). Owner i Admin **automatycznie dostają każde istniejące uprawnienie** — `defaultPermissionIdsFor()` przyznaje im pełne `Permission::cases()`, więc nigdy nie musisz niczego dotykać dla tych dwóch poziomów. Decydujesz jedynie, co domyślnie dostają **Member** i **Viewer**, dodając nowy przypadek(i) do odpowiedniej stałej `*_DEFAULT_PERMISSIONS`:

```php
private const array MEMBER_DEFAULT_PERMISSIONS = [
    Permission::PROJECT_VIEW,
    Permission::MEMBERS_VIEW,
    Permission::ROLES_VIEW,
    Permission::SETTINGS_VIEW,
    Permission::INTEGRATIONS_VIEW, // <- added
    Permission::ISSUES_VIEW,
    // ...
];

private const array VIEWER_DEFAULT_PERMISSIONS = [
    Permission::PROJECT_VIEW,
    Permission::MEMBERS_VIEW,
    Permission::ROLES_VIEW,
    Permission::INTEGRATIONS_VIEW, // <- added
    Permission::ISSUES_VIEW,
];
```

Zasada stosowana w całym tym repozytorium: dawaj Member/Viewer domyślnie połowę `*_VIEW` pary, nigdy połowy `*_UPDATE`/`*_CREATE`/`*_DELETE` — zdolności mutujące są tylko dla Owner/Admin (albo nadawane jawnie przez rolę niestandardową), chyba że masz konkretny powód, by otworzyć je szerzej.

## Krok 3 — Dodaj sprawdzenie autoryzacji

Dwie opcje, wybierz w zależności od tego, czy zdolność dotyczy istniejącego modelu, czy całego obszaru funkcjonalności:

**Opcja A — dodaj metodę do istniejącej Policy** (najczęstsza). Plik: `app/Policies/ProjectPolicy.php`:

```php
public function viewIntegrations(User $user, Project $project): bool
{
    return $project->hasPermissionOrTier($user, Permission::INTEGRATIONS_VIEW, [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER]);
}

public function updateIntegrations(User $user, Project $project): bool
{
    return $project->hasPermissionOrTier($user, Permission::INTEGRATIONS_UPDATE, [RoleType::OWNER, RoleType::ADMIN]);
}
```

`hasPermissionOrTier()` (na `App\Models\Project`) robi dwa sprawdzenia po kolei: czy własny poziom członkostwa użytkownika (`owner`/`admin`/`member`/`viewer`) znajduje się na podanej liście dozwolonych — jeśli tak, przyznaje natychmiast, bez odpytywania bazy o uprawnienia ról niestandardowych; w przeciwnym razie przechodzi do `hasPermission()`, które sprawdza, czy jakakolwiek rola niestandardowa posiadana przez użytkownika ma nadane konkretne `Permission` poprzez łańcuch pivotów `project_user_role`/`role_permission`. Dlatego Owner i Admin "po prostu działają" dla zdolności zależnych od poziomu, jeszcze zanim `ensureSystemRoles()` zsynchronizuje uprawnienia ich roli systemowej z tabelą pivot.

Wywołaj to z kontrolera przez `$this->authorize('updateIntegrations', $project);` (Laravel automatycznie rozwiązuje `ProjectPolicy::updateIntegrations` — nie trzeba jawnej rejestracji Policy, zobacz `app/Policies/*.php` po istniejącą konwencję).

**Opcja B — stwórz dedykowaną Policy**, gdy zdolność dotyczy tworzenia jeszcze nieistniejącego zasobu potomnego (odzwierciedla `app/Policies/RolePolicy.php::create`):

```php
$this->authorize('create', [Role::class, $project]);
```

wraz z

```php
public function create(User $user, Project $project): bool
{
    return $this->hasRolesOrSettingsAccess($user, $project, Permission::ROLES_CREATE);
}
```

Użyj opcji B tylko wtedy, gdy nie ma jeszcze instancji, względem której można sprawdzić (np. "czy ten użytkownik może stworzyć nowy X dla tego projektu", zanim X w ogóle istnieje).

## Krok 4 — Udostępnij je na froncie

Plik: `app/Http/Controllers/SettingsController.php`

Oblicz wartość boolean **bezpośrednio z modelu `Project`** (`hasPermissionOrTier`/`hasPermission`) w `index()` — nie przechodź tu przez Policy; Policy tutaj są zarezerwowane do autoryzacji rzeczywistych żądań mutujących (`$this->authorize(...)` w akcji kontrolera), podczas gdy `SettingsController::index()` oblicza zwykłe wartości boolean, żeby UI mógł warunkowo renderować:

```php
$viewTiers = [RoleType::OWNER, RoleType::ADMIN, RoleType::MEMBER];
$hasIntegrationsAccess = $selectedProject?->hasPermissionOrTier($user, PermissionEnum::INTEGRATIONS_VIEW, $viewTiers) ?? false;
$canUpdateIntegrations = $hasIntegrationsAccess
    && $selectedProject->hasPermissionOrTier($user, PermissionEnum::INTEGRATIONS_UPDATE, [RoleType::OWNER, RoleType::ADMIN]);
```

potem dodaj obie wartości do tablicy props `Inertia::render(...)` i przeprowadź je przez `Settings/Index.tsx` → `WorkspaceSettingsContent.tsx` → Twój komponent zakładki dokładnie tak, jak robi to już `canUpdateIntegrations` (zobacz przewodnik 5 po pełną listę przekazywania propsów).

## Krok 5 — Spraw, żeby dobrze się renderowało w Settings → Roles & management

Uprawnienie pojawi się **automatycznie**, poprawnie zgrupowane, w chwili gdy zaistnieje w tabeli `permissions` w bazie danych (zobacz krok 6) — żaden kod grupujący na froncie nie musi się zmienić. Ale jego **etykieta i opis** wymagają ręcznego wpisu, inaczej renderuje się jako goły, pozbawiony kontekstu wyraz.

Plik: `resources/js/utils/permissions.ts` — dodaj do `PERMISSION_META`:

```ts
'projects.integrations.view': {
    label: 'View integrations',
    description: 'See which integrations are connected to the project.',
},
'projects.integrations.update': {
    label: 'Manage integrations',
    description:
        'Connect, configure, or disconnect third-party integrations.',
},
```

Dlaczego to jest potrzebne: `getPermissionLabel()` odpytuje tę mapę po pełnym kluczu z kropkami; jeśli brak wpisu, spada do **ostatniego** segmentu po kropce, uczłowieczonego — więc `projects.integrations.view` bez wpisu renderuje się jako goły wyraz **"View"** (kolidujący wizualnie z każdym innym uprawnieniem `*.view`) i pusty opis. Zawsze dodawaj wpis w tym samym PR/commicie, który dodaje przypadek enuma.

Musisz dotknąć `resources/js/utils/permissionGroups.ts` (`GROUP_META`) tylko wtedy, gdy wprowadzasz **nową grupę najwyższego poziomu** (część przed pierwszą kropką) — `projects`, `issues` i `comments` już mają wpisy. Nowe uprawnienie `projects.integrations.*` ponownie wykorzystuje istniejący wpis grupy `projects` i za darmo dostaje własną **podsekcję** "Integrations", ponieważ `getPermissionSection()` w `resources/js/utils/permissions.ts` automatycznie wyprowadza etykietę podsekcji z drugiego segmentu po kropce (`humanize(parts[1])`) — do tej części mapa nie jest potrzebna.

## Krok 6 — Zaseeduj je do bazy danych (nie pomijaj tego!)

`database/seeders/PermissionSeeder.php` przechodzi po `Permission::cases()` i robi `updateOrCreate` na wierszu dla każdego przypadku — to właśnie sprawia, że nowy przypadek enuma jest faktycznie odpytywalny przez `PermissionModel`/`PermissionService::getAll()`. **Nie** jest uruchamiany automatycznie ponownie, gdy dodajesz przypadek enuma:

- **Testy** są w porządku — `tests/Pest.php` wywołuje `$this->seed(PermissionSeeder::class)` w globalnym `beforeEach`, więc każde uruchomienie testów zawsze ma każdy aktualny przypadek enuma jako wiersz.
- **Twoja lokalna baza deweloperska (i każde prawdziwe środowisko) nie jest w porządku**, dopóki nie uruchomisz tego sam:
  ```bash
  php artisan db:seed --class=PermissionSeeder
  # or, inside Docker:
  make shell
  php artisan db:seed --class=PermissionSeeder
  ```
  Jest to idempotentne (`updateOrCreate` kluczowane po `key`) — bezpieczne do uruchamiania tak często, jak chcesz, także na produkcji po deployu, który dodaje nowe przypadki uprawnień.

Jeśli to pominiesz, `getPermissionLabel`/cały interfejs Roles nie będzie "zepsuty" — uprawnienie po prostu w ogóle nie będzie istnieć jako wiersz, więc po cichu nigdy nie pojawi się na liście, i żadna rola nigdy nie będzie mogła go otrzymać. Jeśli kiedykolwiek zobaczysz "dodałem uprawnienie, ale nigdzie go nie ma w UI", to prawie zawsze jest tego powodem — sprawdź przez:

```bash
php artisan tinker --execute="App\Models\Permission::where('key', 'like', 'projects.integrations%')->get(['key','group'])"
```

## Krok 7 — Testy

- `tests/Feature/PermissionSeederTest.php` — nie trzeba zmian, już asertuje, że seeder jest idempotentny i pokrywa wszystkie aktualne przypadki generycznie.
- `tests/Feature/RoleServiceTest.php` — test `'it creates the owner, admin, member and viewer system roles with their default permissions'` asertuje dokładne zbiory id uprawnień na poziom; jeśli dodałeś nowy przypadek do `MEMBER_DEFAULT_PERMISSIONS`/`VIEWER_DEFAULT_PERMISSIONS`, zaktualizuj tam oczekiwaną listę.
- Jakąkolwiek metodę Policy dodałeś — pokryj ją bezpośrednio, jeśli ma ciekawe rozgałęzienia, albo (częściej) jest pokryta pośrednio przez test kontrolera dla akcji, którą chroni (zobacz test "member without the integrations.update permission cannot toggle an integration" w `tests/Feature/ProjectIntegrationControllerTest.php` po kształt do skopiowania).
- `tests/Feature/SettingsControllerTest.php` — dodaj testy `'settings page grants a[n] X access to Y'` asertujące nowy prop boolean dla Owner/Admin (true), zwykłego Membera (tylko podgląd: view=true, update=false) i Vievera bez zsynchronizowanej roli systemowej (false) — zobacz trzy istniejące już testy `*integrations*` po dokładny wzorzec.
