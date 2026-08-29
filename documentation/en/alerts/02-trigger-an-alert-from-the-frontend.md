# Trigger an alert from the frontend

Worked example: `IssuePageHeader`'s "copy issue link" button calls
`navigator.clipboard.writeText(...)` today and gives the user no
feedback at all — no page reload, no redirect, so guide 1's mechanism
doesn't apply. This is exactly the case for calling `useAlert().addAlert()`
directly: a purely client-side action with nothing to flash from the
backend, because there's no backend request in the first place.

## When to use this instead of guide 1

Reach for `addAlert()` directly, instead of a backend flash, when:
- the action never sends a request at all (clipboard copy, a
  client-only UI toggle), or
- the action does send a request, but you're already handling
  `onSuccess`/`onError` for other reasons (an optimistic update, a
  `useForm` submission) and want the toast wording or duration to
  differ from whatever the backend would flash — see
  `WorkspaceSettingsDeleteRoleModal.tsx`'s `handleConfirm()` or
  `AccountSettingsNotificationsTab.tsx`'s `updateNotificationType()`
  for two existing examples of this shape (both call `addAlert()`
  from `router.<verb>(...)`'s callbacks rather than relying on the
  redirect's own flash).

## The `addAlert()` signature

```ts
addAlert(message: string, type?: AlertType, duration?: number, actionUrl?: string): void
```

- `type` defaults to `'success'`; the full set is
  `'success' | 'error' | 'warning' | 'information'` (`AlertType` in
  `resources/js/types/Alert.ts`) — the same four values guide 1's
  backend flash keys map to, so a component and a controller action
  that produce "the same kind" of toast agree on vocabulary.
- `duration` defaults to 4000 (ms); pass `0` for an alert that only
  goes away when the user clicks its close button.
- `actionUrl` is optional, renders the same "View details" link
  `Alert.tsx` renders for a backend-flashed one.

## Step 1 — Wire up the alert

File: `resources/js/Components/Organisms/IssuePageHeader/IssuePageHeader.tsx`

```tsx
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import { useAlert } from '@/context/AlertContext';
import { IssuePageHeaderProps } from '@/types/Components';
import { Link } from '@inertiajs/react';
import React from 'react';

const IssuePageHeader: React.FC<IssuePageHeaderProps> = ({
    project,
    issue,
}) => {
    const { addAlert } = useAlert();

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        addAlert('Issue link copied to clipboard', 'success', 2000);
    };

    return (
        <header className="flex items-center justify-between border-b border-solid border-[var(--border-color)] px-6 py-3">
            <div className="flex min-w-0 items-center gap-2 text-sm">
                <IconButton
                    isLink
                    link={route('projects.show', project.id)}
                    iconName="ArrowLeft"
                    ariaLabel="Back to project"
                />
                <Link
                    href={route('projects.show', project.id)}
                    className="text-[var(--text-gray-color)] hover:text-[var(--text-color)]"
                >
                    {project.name}
                </Link>
                <span className="text-[var(--text-gray-color)]">/</span>
                <span className="text-[var(--text-gray-color)]">Issues</span>
                <span className="text-[var(--text-gray-color)]">/</span>
                <span className="truncate text-[var(--text-color)]">
                    #{issue.id} {issue.title}
                </span>
            </div>
            <div className="flex items-center gap-1">
                <IconButton
                    iconName="Link"
                    ariaLabel="Copy issue link"
                    onClick={handleCopyLink}
                />
            </div>
        </header>
    );
};

export default IssuePageHeader;
```

`useAlert()` throws if the component isn't rendered under
`AlertProvider` (see `AlertContext.tsx`'s `useAlert()`) — true for
every real page in this app, since `AlertProvider` wraps the whole
Inertia root in `app.tsx`, but matters for the test below. A shorter
duration (`2000` vs. the `4000` default) fits a lightweight
confirmation that doesn't need to linger.

## Step 2 — Tests

File: `resources/js/Components/Organisms/IssuePageHeader/IssuePageHeader.test.tsx`

Every test in this file renders `IssuePageHeader` directly; since it
now calls `useAlert()`, it must be wrapped in `AlertProvider` — the
same pattern `AccountSettingsNotificationsTab.test.tsx` already uses
for a component with the same requirement:

```tsx
import { AlertProvider } from '@/context/AlertContext';

test('copies the current page link to the clipboard and shows a confirmation toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
        <AlertProvider>
            <IssuePageHeader project={project} issue={issue} />
        </AlertProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy issue link' }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(
        await screen.findByText('Issue link copied to clipboard'),
    ).toBeInTheDocument();
});
```

The existing `'copies the current page link to the clipboard when
clicked'` test (which doesn't wrap in `AlertProvider`) will start
throwing once `useAlert()` is added — update it to wrap in
`AlertProvider` too, even if it doesn't assert on the toast itself.
