# Flip a placeholder tab live

Worked example: turning **Export** (Account section) from an
unreachable nav item into a real tab. Its component,
`AccountSettingsExportTab.tsx`, already exists and already renders a
full UI (two export cards, an account-deletion row) — it's just never
reachable, because its registry entry is `enabled: false`. This is the
same "the UI already exists, just make it real" shape
[`../integrations/01-add-a-new-integration.md`](../integrations/01-add-a-new-integration.md)
covers for a catalog integration — skip straight to whichever step
below actually applies if a placeholder tab you're working with is
further along than Export.

## Step 1 — Flip the flag

File: `resources/js/types/Settings.ts`

```ts
{
    id: 'export',
    label: 'Export',
    icon: 'Download',
    section: 'account',
    description: 'Prepare and download your account-related data exports.',
    enabled: true, // was false
},
```

This one flag does the entire "is it reachable" job —
`Pages/Settings/Index.tsx`'s `isEnabledSettingsTabId()` check (see the
[README](./README.md)'s architecture section) now lets `?tab=export`
resolve instead of silently falling back to `preferences`, and the
nav item becomes clickable rather than visually disabled. That nav
item isn't a dedicated settings component — the main app `Sidebar`
(`resources/js/Components/Organisms/Sidebar/Sidebar.tsx`) itself
renders the Account/Workspace sections straight from `SETTINGS_TABS`
whenever the current URL is under `/settings`, disabled tabs included
(see [`../architecture/03-frontend-architecture-and-atomic-design.md`](../architecture/03-frontend-architecture-and-atomic-design.md)).
No other frontend change is required for the tab to become
*visitable* — steps 2–3 are about making it show something real once
you're there.

## Step 2 — Thread real data to it (don't leave it static)

`AccountSettingsExportTab` today takes no props at all — every string
on it is hardcoded copy. Before shipping it live, thread through
whatever real data the tab actually needs, the same way every other
Account tab already does (`AccountSettingsProfileTab` takes
`userName`/`userAvatar`, `AccountSettingsNotificationsTab` takes
`notificationSettings` — see
[`../notifications/03-frontend-backend-wiring-overview.md`](../notifications/03-frontend-backend-wiring-overview.md)
for that one's full round trip). A small, concrete example: showing
which address the export will be emailed to.

File: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsExportTab.tsx`

```tsx
import Button from '@/Components/Atoms/Button/Button';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';

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

File: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsContent.tsx`

```tsx
interface AccountSettingsContentProps {
    tabId: AccountSettingsTabId;
    userName?: string;
    userAvatar?: string | null;
    userEmail?: string;
    sessions?: Session[];
    notificationSettings?: NotificationSettings;
}

export default function AccountSettingsContent({
    tabId,
    userName,
    userAvatar,
    userEmail,
    sessions = [],
    notificationSettings,
}: AccountSettingsContentProps) {
    // ...existing tabId branches...

    return <AccountSettingsExportTab userEmail={userEmail} />;
}
```

File: `resources/js/Pages/Settings/Index.tsx` — add `userEmail` to the
props interface and pass it down to `AccountSettingsContent` alongside
the existing `userName`/`userAvatar` reads off
`props.auth?.user?.email`.

## Step 3 — Wire the backend, if the tab needs any of its own

Export doesn't need a dedicated `SettingsController` prop for this
step (`userEmail` already comes from the `auth` shared prop every page
gets — see
[`../architecture/03-frontend-architecture-and-atomic-design.md`](../architecture/03-frontend-architecture-and-atomic-design.md)),
but a tab needing genuinely new data follows
`SettingsController::index()`'s existing pattern exactly: add a new
key to the `Inertia::render('Settings/Index', [...])` array, computed
from whatever Service the tab's real feature needs, the same way
`notificationSettings`/`sessions`/`integrationStatuses` already are.
Building the actual "generate and email an export" backend feature
itself is outside this guide's scope — this step is only about the
settings-tab wiring pattern, not the feature behind a specific
placeholder.

## Tests

- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsExportTab.test.tsx`
  (create if it doesn't exist) — assert the email-conditional copy
  renders correctly with and without a `userEmail` prop.
- `resources/js/Pages/Settings/Index.test.tsx` (if one exists) or
  whichever test covers `isEnabledSettingsTabId` — add a case
  asserting `?tab=export` now resolves to the `export` tab instead of
  falling back to `preferences`.
- `tests/Feature/SettingsControllerTest.php` — if you added a new
  backend prop in step 3, add a test asserting it's present in the
  Inertia response, mirroring the existing prop-assertion tests there.
