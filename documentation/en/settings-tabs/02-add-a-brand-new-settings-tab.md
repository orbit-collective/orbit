# Add a brand-new settings tab

Worked example: adding a `billing` tab to the Account section — a tab
id that doesn't exist anywhere in the codebase yet, unlike guide 1's
Export (which already had a component and a registry row, just
disabled).

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
    | 'statuses'
    | 'priorities'
    | 'templates'
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
        label: 'Billing',
        icon: 'CreditCard',
        section: 'account',
        description: 'Manage your subscription plan and payment method.',
        enabled: true,
    },
    // ...remaining entries...
];

export const ACCOUNT_SETTINGS_TAB_IDS = [
    'preferences',
    'profile',
    'notifications',
    'security-access',
    'billing',
    'export',
] as const;
```

`section: 'account'` and adding the id to `ACCOUNT_SETTINGS_TAB_IDS`
are both required, and independently — the first decides which
sidebar group (`accountTabs`/`workspaceTabs` in
`Pages/Settings/Index.tsx`) the nav item renders under; the second is
what `isAccountSettingsTabId()` checks to decide whether
`AccountSettingsContent` or `WorkspaceSettingsContent` handles it (see
the [README](./README.md)'s architecture section). Get the id into the
array matching the wrong section (or neither) and the tab is
selectable in the sidebar but resolves to neither content component's
`if` chain, so nothing renders.

Pick an `icon` from `lucide-react` (any name valid as
`keyof typeof icons`) that isn't already representing a different tab.

## Step 3 — Create the tab component

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
selectable cards).

## Step 4 — Wire it into the switch

File: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsContent.tsx`

```tsx
import AccountSettingsBillingTab from './AccountSettingsBillingTab';
// ...existing imports...

interface AccountSettingsContentProps {
    tabId: AccountSettingsTabId;
    userName?: string;
    userAvatar?: string | null;
    sessions?: Session[];
    notificationSettings?: NotificationSettings;
    planName?: string;
}

export default function AccountSettingsContent({
    tabId,
    userName,
    userAvatar,
    sessions = [],
    notificationSettings,
    planName,
}: AccountSettingsContentProps) {
    if (tabId === 'preferences') {
        return <AccountSettingsPreferencesTab />;
    }

    // ...existing tabId branches, unchanged...

    if (tabId === 'billing') {
        return <AccountSettingsBillingTab planName={planName} />;
    }

    return <AccountSettingsExportTab />;
}
```

This is a flat `if` chain, not a lookup object — add the new branch
anywhere before the final `return`, in whatever order reads clearly;
order has no functional effect since each `if` returns immediately.

## Step 5 — Pass any real data down from the page

File: `resources/js/Pages/Settings/Index.tsx` — add `planName` to
`SettingsIndexProps` and pass it through to `AccountSettingsContent`,
the same way `notificationSettings` already flows through unchanged.

File: `app/Http/Controllers/SettingsController.php` — add a
`'planName' => ...` key to the `Inertia::render(...)` props array,
computed from whichever Service backs real billing data (not built
yet — this step is only the wiring pattern, following
`SettingsController::index()`'s existing shape of one array key per
prop, each usually gated behind whatever access check makes sense,
mirroring `hasIntegrationsAccess`/`integrationStatuses`'s pattern for
a feature-gated prop).

## Tests

- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsBillingTab.test.tsx`
  — new file, following the shape of any existing Account tab test
  (e.g. `AccountSettingsPreferencesTab.test.tsx`): render the
  component, assert the expected copy/props render.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsContent.test.tsx`
  (if one exists) — add a case asserting `tabId="billing"` renders
  `AccountSettingsBillingTab`.
- `tests/Feature/SettingsControllerTest.php` — if you wired a real
  backend prop in step 5, add a test asserting it appears in the
  Inertia response for an authenticated user.
