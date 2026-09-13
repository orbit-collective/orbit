# Flip a placeholder tab live

Worked example: turning **Export** (Account section) from an
unreachable nav item into a real tab. Its component,
`AccountSettingsExportTab.tsx`, already exists and already renders a
full UI (two export cards, an account-deletion row) — it's just never
reachable, because its registry entry is `enabled: false` and it has
no route. This is the same "the UI already exists, just make it real"
shape
[`../integrations/01-add-a-new-integration.md`](../integrations/01-add-a-new-integration.md)
covers for a catalog integration — skip straight to whichever step
below actually applies if a placeholder tab you're working with is
further along than Export.

## Step 1 — Flip the flag

File: `resources/js/types/Settings.ts`

```ts
{
    id: 'export',
    path: '/settings/export',
    label: 'Export',
    icon: 'Download',
    section: 'account',
    description: 'Prepare and download your account-related data exports.',
    enabled: true, // was false
},
```

This flag is what makes the nav item clickable: the main app `Sidebar`
(`resources/js/Components/Organisms/Sidebar/Sidebar.tsx`) renders the
Account/Workspace sections straight from `SETTINGS_TABS` whenever the
current URL is under `/settings`, linking each enabled tab to its
`path` and rendering each disabled one as an inert `div` with a "Soon"
badge (see [`../architecture/03-frontend-architecture-and-atomic-design.md`](../architecture/03-frontend-architecture-and-atomic-design.md)).
Flipping it alone isn't enough any more, though — without steps 2–4
the link now points at a URL that 404s.

## Step 2 — Add the route

File: `routes/web.php`

```php
Route::get('/settings/export', [SettingsController::class, 'export'])->name('settings.export');
```

Keep the path identical to the registry entry's `path` and the route
name at `settings.<tab id>` — that convention is what lets backend
code link to a tab with `route('settings.export')` the way
`ImportJiraIssuesJob` links to `route('settings.integrations', ['project' => ...])`.

## Step 3 — Add the controller action

File: `app/Http/Controllers/SettingsController.php`

```php
public function export(Request $request): Response
{
    return Inertia::render('Settings/Export', [
        'projects' => $this->projects($request),
        'exportRequests' => $this->exportService->getRequests($request->user()->id),
    ]);
}
```

One action per tab, each returning **only** the props that tab's UI
reads. `projects` is the exception every action passes — the `Sidebar`
needs it on every settings page. Anything project-scoped instead
spreads `$this->projectScope($projects, $selectedProject)` (see the
`labels()`/`members()` actions), which supplies `projects`,
`memberProjects` and `selectedProjectId` together. Resist adding a
prop "while you're here" that only a different tab needs — not
over-fetching is the whole point of the per-tab split.

## Step 4 — Add the page

New file: `resources/js/Pages/Settings/Export.tsx`

```tsx
import AccountSettingsExportTab from '@/Components/Organisms/AccountSettingsContent/AccountSettingsExportTab';
import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import { Project } from '@/types/Projects';

interface SettingsExportProps {
    projects?: Project[];
    exportRequests?: ExportRequest[];
}

export default function SettingsExport({
    projects = [],
    exportRequests = [],
}: SettingsExportProps) {
    return (
        <SettingsLayout tabId="export" projects={projects}>
            <AccountSettingsExportTab exportRequests={exportRequests} />
        </SettingsLayout>
    );
}
```

The page is deliberately thin: declare the props the controller sends,
hand them to the tab component, and let `SettingsLayout` draw the
sidebar, breadcrumb, heading and description from the `tabId`'s
registry entry. The Inertia page name in
`Inertia::render('Settings/Export', ...)` has to match this file's
path under `resources/js/Pages/` exactly.

## Step 5 — Thread real data into the tab component (don't leave it static)

`AccountSettingsExportTab` today takes no props at all — every string
on it is hardcoded copy. Before shipping it live, thread through
whatever real data the tab actually needs, the same way every other
Account tab already does (`AccountSettingsProfileTab` takes
`userName`/`userAvatar`, `AccountSettingsNotificationsTab` takes
`notificationSettings` — see
[`../notifications/03-frontend-backend-wiring-overview.md`](../notifications/03-frontend-backend-wiring-overview.md)
for that one's full round trip).

File: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsExportTab.tsx`

```tsx
import Button from '@/Components/Atoms/Button/Button';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';

interface AccountSettingsExportTabProps {
    userEmail?: string;
}

export default function AccountSettingsExportTab({
    userEmail,
}: AccountSettingsExportTabProps) {
    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Export data"
                description="Generate portable snapshots of your account data."
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            Full account export
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-gray-color)]">
                            {userEmail
                                ? `We'll email the export to ${userEmail}.`
                                : 'Includes profile, preferences, and activity.'}
                        </p>
                        <Button
                            type="button"
                            isBox
                            className="mt-3 w-full py-1.5"
                        >
                            Request export
                        </Button>
                    </div>
                </div>
            </SettingsPanel>
        </div>
    );
}
```

Data that's already on the `auth` shared prop (the user's name, email,
avatar) doesn't need a controller prop at all — read it off
`usePage<PageProps>()` in the page, the way `Pages/Settings/Profile.tsx`
does (see
[`../architecture/03-frontend-architecture-and-atomic-design.md`](../architecture/03-frontend-architecture-and-atomic-design.md)).
Building the actual "generate and email an export" backend feature is
outside this guide's scope — steps 2–5 are the settings-tab wiring
pattern, not the feature behind a specific placeholder.

## Tests

- `tests/Feature/SettingsControllerTest.php` — add a case asserting
  `GET /settings/export` returns the `Settings/Export` component with
  the props from step 3, mirroring the existing per-tab tests there.
  If the tab's data is permission-gated, also assert the gated shape
  for a user who lacks access, the way the labels/integrations cases
  do.
- `resources/js/Pages/Settings/Export.test.tsx` — new file, following
  any existing page test (e.g. `Preferences.test.tsx`): mock
  `SettingsLayout` and the tab component, assert the page renders its
  tab with the right `tabId` and forwards its props.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsExportTab.test.tsx`
  (create if it doesn't exist) — assert the email-conditional copy
  renders correctly with and without a `userEmail` prop.
- `resources/js/Components/Organisms/Sidebar/Sidebar.test.tsx` — the
  existing "renders disabled settings tabs without a link" case counts
  the disabled tabs; check it still holds once one fewer tab is
  disabled.
