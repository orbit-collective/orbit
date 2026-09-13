# Surface the activity log in the UI

`ActivityLogService::getRecentForUser()` already powers the Dashboard's
"Recent Work Activity" panel, and `getRecentForProject()` already
powers a project's **Activity** issue view (see
[`../issue-views/README.md`](../issue-views/README.md)) — both render
the same `ActivityLogs`/`ActivityLogItem` component pair off the same
`ActivityLogEntry` shape. This guide adds a third surface: a "Recent
account activity" panel on the Account → Security & access settings
tab, reusing `getRecentForUser()` (the exact same read method the
Dashboard already calls) rather than adding a new one.

## Step 1 — Thread the read method into the Security & access action

File: `app/Http/Controllers/SettingsController.php`

```php
public function securityAccess(Request $request): Response
{
    $user = $request->user();

    return Inertia::render('Settings/SecurityAccess', [
        'projects' => $this->projects($request),
        'sessions' => $this->userService->getUserSessions($user),
        'accountActivity' => $this->activityLogService
            ->getRecentForUser($user->id, 15)
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'body' => $entry->body,
                'userName' => $entry->user?->name,
                'createdAt' => $entry->created_at->diffForHumans(),
            ]),
    ]);
}
```

`ActivityLogService` is already injected into this Controller for
other settings features, so no constructor change is needed — just
call the method it already exposes. Map to the same
`{ id, body, userName, createdAt }` shape `DashboardController` and
`ProjectController` already use (`createdAt` pre-formatted server-side
via `diffForHumans()`) so the frontend doesn't need a second shape or
formatter for what's the same `ActivityLogEntry` type.

## Step 2 — Pass it down to the tab

File: `resources/js/Pages/Settings/SecurityAccess.tsx`

```tsx
interface SettingsSecurityAccessProps {
    projects?: Project[];
    sessions?: Session[];
    accountActivity?: ActivityLogEntry[];
}

export default function SettingsSecurityAccess({
    projects = [],
    sessions = [],
    accountActivity = [],
}: SettingsSecurityAccessProps) {
    return (
        <SettingsLayout tabId="security-access" projects={projects}>
            <AccountSettingsSecurityTab
                sessions={sessions}
                accountActivity={accountActivity}
            />
        </SettingsLayout>
    );
}
```

Each settings tab is its own page (see
[`../settings-tabs/README.md`](../settings-tabs/README.md)), so there
is no dispatcher to thread the prop through — the page hands it
straight to `AccountSettingsSecurityTab`, the same way `sessions`
already does today.

## Step 3 — Render it with the existing components

File: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsSecurityTab.tsx`

```tsx
import ActivityLogs from '@/Components/Organisms/ActivityLogs/ActivityLogs';
import { ActivityLogEntry } from '@/types/ActivityLog';

interface AccountSettingsSecurityTabProps {
    sessions?: Session[];
    accountActivity?: ActivityLogEntry[];
}

export default function AccountSettingsSecurityTab({
    sessions = [],
    accountActivity = [],
}: AccountSettingsSecurityTabProps) {
    return (
        <div className="space-y-5">
            {/* ...existing Password/Active sessions/Session expiry panels... */}

            <SettingsPanel
                title="Recent account activity"
                description="The last actions taken on your account, across every project."
                icon="Activity"
            >
                <div className="px-2 pb-2">
                    <ActivityLogs logs={accountActivity} />
                </div>
            </SettingsPanel>

            {/* ...existing Delete account panel... */}
        </div>
    );
}
```

No new list/empty-state/icon-coloring code — `ActivityLogs` already
handles an empty array (its own empty state) and `ActivityLogItem`
already derives each entry's colored dot from its body text via
`getActivityLogVisual()` (`resources/js/utils/activityLog.ts`). This is
the payoff of the Dashboard and project Activity view already sharing
one component pair instead of each rolling its own list markup — a
third surface is a data-plumbing change, not a new UI.

## Tests

- `tests/Feature/SettingsControllerTest.php` — add a case asserting
  `GET /settings/security-access` includes an `accountActivity` prop shaped like
  `{ id, body, userName, createdAt }`, mirroring however
  `DashboardControllerTest` (if one exists) already asserts
  `activityLogs`.
- `resources/js/Pages/Settings/SecurityAccess.test.tsx` — add a case
  asserting `accountActivity` reaches `AccountSettingsSecurityTab`.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsSecurityTab.test.tsx` —
  add a case rendering with a couple of `accountActivity` entries and
  asserting they show up, plus a case with an empty array asserting
  `ActivityLogs`'s empty state renders.
