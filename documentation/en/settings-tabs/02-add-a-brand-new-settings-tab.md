# Add a brand-new settings tab

Worked example: adding a `billing` tab to the Account section — a tab
id that doesn't exist anywhere in the codebase yet, unlike guide 1's
Export (which already had a component and a registry row, just
disabled and unrouted).

## Step 1 — Add the tab id

File: `resources/js/types/Settings.ts`

```ts
export type SettingsTabId =
    | 'preferences'
    | 'profile'
    | 'notifications'
    | 'security-access'
    | 'billing'
    | 'integrations'
    | 'export'
    | 'labels'
    | 'issue-types'
    | 'priorities'
    | 'documents'
    | 'members'
    | 'roles-management';
```

## Step 2 — Register it

File: `resources/js/types/Settings.ts`

```ts
export const SETTINGS_TABS: SettingsTab[] = [
    // ...existing entries...
    {
        id: 'billing',
        path: '/settings/billing',
        label: 'Billing',
        icon: 'CreditCard',
        section: 'account',
        description: 'Manage your subscription plan and payment method.',
        enabled: true,
    },
    // ...remaining entries...
];
```

`section: 'account'` decides which sidebar group the nav item renders
under — `Sidebar.tsx` filters `SETTINGS_TABS` by `section` into its
"Account"/"Workspace" nav sections whenever the URL is under
`/settings`. `path` is what the nav item links to and what
`getSettingsTabByPath()` matches the current URL against to mark a tab
active, so it has to equal the route you register in step 3; keep it
at `/settings/<tab id>` unless you have a reason not to.

Pick an `icon` from `lucide-react` (any name valid as
`keyof typeof icons`) that isn't already representing a different tab.

## Step 3 — Add the route

File: `routes/web.php`

```php
Route::get('/settings/billing', [SettingsController::class, 'billing'])->name('settings.billing');
```

Inside the existing `Route::middleware('auth')` group, alongside the
other `settings.*` routes. A tab with a registry entry but no route is
a nav link to a 404 — there is no client-side fallback to the default
tab any more.

## Step 4 — Add the controller action

File: `app/Http/Controllers/SettingsController.php`

```php
public function billing(Request $request): Response
{
    return Inertia::render('Settings/Billing', [
        'projects' => $this->projects($request),
        'planName' => $this->billingService->getPlanName($request->user()),
    ]);
}
```

One action per tab, each shipping only that tab's props plus
`projects` (which the `Sidebar` needs everywhere). A project-scoped
tab spreads `$this->projectScope($projects, $selectedProject)` instead
of passing `projects` by hand, and gates its data behind whatever
access check makes sense — `hasIntegrationsAccess` /
`integrationStatuses` in `integrations()` is the pattern for a
feature-gated prop, and `can()` / `hasRolesAccess()` are the shared
helpers for the permission booleans.

## Step 5 — Add the page

New file: `resources/js/Pages/Settings/Billing.tsx`

```tsx
import AccountSettingsBillingTab from '@/Components/Organisms/AccountSettingsContent/AccountSettingsBillingTab';
import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import { Project } from '@/types/Projects';

interface SettingsBillingProps {
    projects?: Project[];
    planName?: string;
}

export default function SettingsBilling({
    projects = [],
    planName = 'Free',
}: SettingsBillingProps) {
    return (
        <SettingsLayout tabId="billing" projects={projects}>
            <AccountSettingsBillingTab planName={planName} />
        </SettingsLayout>
    );
}
```

The file's path under `resources/js/Pages/` is the Inertia page name
the controller renders, so `Settings/Billing.tsx` ↔
`Inertia::render('Settings/Billing', ...)`. `SettingsLayout` takes the
heading, breadcrumb and description from the `tabId`'s registry entry
— don't restate that copy in the page.

## Step 6 — Create the tab component

New file: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsBillingTab.tsx`

```tsx
import Button from '@/Components/Atoms/Button/Button';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';

interface AccountSettingsBillingTabProps {
    planName?: string;
}

export default function AccountSettingsBillingTab({
    planName = 'Free',
}: AccountSettingsBillingTabProps) {
    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Current plan"
                description="See your active plan and manage your subscription."
            >
                <SettingsPanelRow
                    title={planName}
                    description="Your workspace's current billing plan."
                    action={
                        <Button type="button" isBox className="px-3 py-1.5">
                            Change plan
                        </Button>
                    }
                />
            </SettingsPanel>
        </div>
    );
}
```

Every existing Account tab follows this same shape — one or more
`SettingsPanel`s, each holding either free-form content or
`SettingsPanelRow`s — copy whichever existing tab's layout is closest
to what the new one needs (`AccountSettingsSecurityTab` for a
list-of-items panel, `AccountSettingsPreferencesTab` for a grid of
selectable cards). Account tabs live in
`Components/Organisms/AccountSettingsContent/`, Workspace tabs in
`Components/Organisms/WorkspaceSettingsContent/`; that folder split is
now purely organisational, since nothing dispatches on it any more.

## Tests

- `tests/Feature/SettingsControllerTest.php` — add a case asserting
  `GET /settings/billing` renders `Settings/Billing` with the props
  from step 4, and extend the "each settings page only ships its own
  tab data" case if the new tab introduces a prop other tabs must not
  receive.
- `resources/js/Pages/Settings/Billing.test.tsx` — new file, copying
  any existing page test (e.g. `Preferences.test.tsx`): mock
  `SettingsLayout` and the tab component, assert the `tabId` and the
  forwarded props.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsBillingTab.test.tsx`
  — new file, following any existing Account tab test (e.g.
  `AccountSettingsSecurityTab.test.tsx`): render the component, assert
  the expected copy/props render.
