# Włącz i zabezpiecz portal

Dwie niezależne bramki, obie wymagane: bramka środowiska i bramka uprawnienia.

## Krok 1 — Bramka środowiska

Plik: `config/developer-portal.php`

```php
'enabled' => env('APP_ENV', 'production') === 'local',
```

Celowo nie ma drugiego przełącznika. Ustaw `APP_ENV=local` w `.env` (albo w Doppler), żeby dostać portal; cokolwiek innego (`production`, `prod`, `staging`, `testing`) zostawia go wyłączonym. Testy włączają go per test przez `config(['developer-portal.enabled' => true])`.

## Krok 2 — Bramka uprawnienia

Plik: `app/Enums/Permissions/Permission.php`

```php
case DEVELOPER_PORTAL_VIEW = 'developer.portal.view';
```

Idzie za przewodnikiem [Dodaj nowe uprawnienie](../permissions/01-add-a-new-permission.md): migracja `2026_11_04_120000_add_developer_portal_permission.php` tworzy wiersz i nadaje go istniejącym systemowym rolom Owner i Admin; etykieta mieszka w `resources/js/utils/permissions.ts`, a nowa grupa `developer` w `resources/js/utils/permissionGroups.ts`, więc uprawnienie pojawia się w Settings → Roles & management. Member i Viewer nie dostają go domyślnie.

Portal obejmuje całą instancję, a uprawnienia należą do projektów, więc `DeveloperPortalAccessService::canAccess()` zwraca true, gdy **którykolwiek projekt, do którego użytkownik należy,** nadaje uprawnienie (Owner zawsze przechodzi).

## Krok 3 — Zabezpiecz trasę

Plik: `routes/web.php`

```php
Route::get('/settings/dev-portal', [SettingsController::class, 'developerPortal'])
    ->middleware('developer-portal')
    ->name('settings.dev-portal');
```

`EnsureDeveloperPortalAccess` (alias `developer-portal`, zarejestrowany w `bootstrap/app.php`) odpowiada 404, gdy portal jest wyłączony, i 403 bez uprawnienia. Każdą nową trasę portalu umieszczaj za tym samym aliasem.

## Krok 4 — Ukryj zakładkę

`HandleInertiaRequests` współdzieli `developerPortalEnabled` (`DeveloperPortalAccessService::canAccess($user)`); `Sidebar.tsx` odfiltrowuje sekcję `developer` z `SETTINGS_TABS`, o ile nie jest `true`.

## Testy

- `tests/Feature/DeveloperPortalAccessTest.php` — macierz `APP_ENV` (prawdziwy podproces `artisan config:show`), 404/403/200 per rola, rola niestandardowa, współdzielony prop i migracja.
- `resources/js/Components/Organisms/Sidebar/Sidebar.test.tsx` — sekcja jest ukryta i pokazana.
