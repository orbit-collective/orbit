# Enable and protect the portal

Two independent gates, both required: the environment gate and the
permission gate.

## Step 1 — The environment gate

File: `config/developer-portal.php`

```php
'enabled' => env('APP_ENV', 'production') === 'local',
```

There is deliberately no second switch. Set `APP_ENV=local` in `.env` (or in
Doppler) to get the portal; anything else (`production`, `prod`, `staging`,
`testing`) keeps it off. Tests turn it on per test with
`config(['developer-portal.enabled' => true])`.

## Step 2 — The permission gate

File: `app/Enums/Permissions/Permission.php`

```php
case DEVELOPER_PORTAL_VIEW = 'developer.portal.view';
```

It follows [Add a new permission](../permissions/01-add-a-new-permission.md):
the migration `2026_11_04_120000_add_developer_portal_permission.php` creates
the row and grants it to the existing Owner and Admin system roles; the label
lives in `resources/js/utils/permissions.ts` and the new `developer` group in
`resources/js/utils/permissionGroups.ts`, so it shows up in Settings → Roles &
management. Member and Viewer do not get it by default.

The portal is instance-wide while permissions belong to projects, so
`DeveloperPortalAccessService::canAccess()` is true when **any project the
user belongs to** grants the permission (an Owner always passes).

## Step 3 — Guard the route

File: `routes/web.php`

```php
Route::get('/settings/dev-portal', [SettingsController::class, 'developerPortal'])
    ->middleware('developer-portal')
    ->name('settings.dev-portal');
```

`EnsureDeveloperPortalAccess` (alias `developer-portal`, registered in
`bootstrap/app.php`) answers 404 when the portal is off and 403 without the
permission. Put every new portal route behind the same alias.

## Step 4 — Hide the tab

`HandleInertiaRequests` shares `developerPortalEnabled`
(`DeveloperPortalAccessService::canAccess($user)`); `Sidebar.tsx` filters the
`developer` section of `SETTINGS_TABS` out unless it is `true`.

## Tests

- `tests/Feature/DeveloperPortalAccessTest.php` — the `APP_ENV` matrix (a real
  `artisan config:show` subprocess), 404/403/200 per role, a custom role, the
  shared prop and the migration.
- `resources/js/Components/Organisms/Sidebar/Sidebar.test.tsx` — the section is
  hidden and shown.
