# Frontend ↔ backend wiring overview

A map of the whole feature: how notifications reach the browser, how
read/unread state round-trips, and how the settings tab persists
preferences. Useful to read before guide 01 or 02 if you haven't
touched this system before.

## 1. Reading: how the bell popup gets its data

Notifications are **not** fetched on demand by the popup — they arrive
as a shared Inertia prop on every single page load/visit, the same way
`auth.user` does:

```
Every Inertia request
        │
        ▼
HandleInertiaRequests::share()
  - 'notifications' => fn () => $request->user()
        ? $this->notificationService->getAllForUser($request->user()->id)
        : []
  - 'emailEnabled' => fn () => $this->mailConfigurationService->isEnabled()
        │
        ▼  every page component receives `notifications` as a prop automatically
        │
        ▼
PageHeader.tsx
  - owns `showNotificationsPopup` (local state, toggled by the Bell icon button)
        │
        ▼ (only rendered while open)
NotificationsPopup.tsx
  - reads `notifications` via usePage<PageProps>().props (not its own fetch)
  - owns `onlyUnread` (local filter state)
  - computes `unreadCount` = notifications.filter(n => !n.read).length
        │
        ├─▶ NotificationHeader.tsx   (unread badge, "Mark all as read" button, "Only show unread" toggle)
        └─▶ NotificationsList.tsx    (maps to NotificationItem, or NotificationEmptyState if empty)
                    │
                    └─▶ NotificationItem.tsx (title, message, "View details" link to action_url, unread dot)
```

Because the prop is refreshed on every Inertia visit, the badge/list
update after any action that causes a redirect back (which is every
mutating notification action below) — there's no polling, no
WebSocket, no separate "unread count" endpoint. The Bell icon button
itself carries no badge/dot of its own; the only unread indicator
lives inside the popup once it's opened.

There *is* a `GET /notifications` route
(`NotificationController::index()`, name `notifications.index`,
returns the collection as JSON) — nothing in the current frontend
calls it. It's unused by the popup (which relies entirely on the
shared prop above); leave it alone unless you have a concrete new
reason to fetch notifications outside of a normal page load.

## 2. Writing: mark as read, mark all as read, delete

Three mutating actions, all Inertia requests that redirect back
(triggering the shared-prop refresh from part 1) — none of them touch
local component state directly:

```
NotificationItem's unread dot clicked
        │
        ▼
NotificationsPopup::handleMarkAsRead(id)
  - POST /notifications/{id}  body: { ...notification, read: true }
        │
        ▼
NotificationController::update()
  - abort_if(notification.user_id !== auth()->id(), 403)
  - validates type/title/message/read/action_url
  - NotificationService::update()
        │
        ▼  redirect back → shared prop refetches → item re-renders as read
```

```
"Mark all as read" clicked
        │
        ▼
NotificationsPopup::handleMarkAllAsRead()
  - POST /notifications/mark-all-read
        │
        ▼
NotificationController::markAllAsRead()
  - NotificationService::markAllAsReadForUser(auth()->id())
  - bulk UPDATE, scoped to the authenticated user's own unread rows only
```

`NotificationController::destroy()` (`DELETE /notifications/{notification}`)
follows the same ownership check (`abort_if($notification->user_id !== auth()->id(), 403)`)
but returns plain JSON rather than a redirect — nothing in the current
frontend calls it either; add a delete button to `NotificationItem.tsx`
following the same `router.delete(...)` pattern used by
`WorkspaceSettingsDeleteRoleModal.tsx` (see
[`../permissions/03-grant-a-custom-role-in-bulk.md`](../permissions/03-grant-a-custom-role-in-bulk.md)
step 3) if you need to wire it up.

## 3. Settings: how a channel toggle persists

A **completely separate** read/write path from parts 1–2 — this one
*is* a real page load, not the shared prop:

```
GET /settings?tab=notifications
        │
        ▼
SettingsController::index()
  - 'notificationSettings' => $this->notificationSettingService->getAllSettings($user->id)
    (every NotificationType × NotificationChannel pair, defaulting via
    NotificationChannel::enabledByDefault() unless a NotificationSetting row overrides it)
        │
        ▼
AccountSettingsNotificationsTab.tsx
  - mergeNotificationSettings() folds the prop onto its own
    hand-maintained `defaultNotificationTypes` array (see guide 01's
    "one rule that matters most" — a type missing from that array
    never reaches this merge at all)
        │
        ▼ (toggle a switch)
AccountSettingsNotificationTypeRow.tsx → onInAppChange/onEmailChange
        │
        ▼
AccountSettingsNotificationsTab::updateNotificationType()
  - optimistically flips local state, then:
  - POST /account/notification-settings  body: { settings: { [type]: { in_app, email } } }
        │
        ▼
NotificationSettingController::update()
  - UpdateNotificationSettingsRequest (validates shape + that every
    key is a real NotificationType::cases() value)
  - NotificationSettingService::updateSettings()
    → updateOrCreate()s one NotificationSetting row per type/channel pair
    → logs one ActivityLog entry for the whole batch
        │
        ▼ onSuccess: success alert / onError: reverts the optimistic toggle + error alert
```

Unlike parts 1–2, this update is a **plain axios-style POST**
(`router.post`, not tied to the shared-prop refresh) — the UI trusts
its own optimistic state and only reconciles on `onError`, it doesn't
wait for a fresh `notificationSettings` prop to confirm the new value.

## Files this feature touches, end to end

- `app/Models/Notification.php`, `app/Models/NotificationSetting.php`
- `app/Enums/Notifications/NotificationType.php`, `NotificationChannel.php`
- `app/Repositories/NotificationRepository.php`,
  `NotificationSettingRepository.php` (interface) +
  `EloquentNotificationSettingRepository.php` (implementation)
- `app/Services/NotificationService.php`,
  `NotificationSettingService.php`, `NotificationMailService.php`
- `app/Listeners/SendNotificationListener.php`
- `app/Http/Controllers/NotificationController.php`,
  `NotificationSettingController.php`
- `app/Http/Requests/Notifications/UpdateNotificationSettingsRequest.php`
- `app/Http/Middleware/HandleInertiaRequests.php` (the shared
  `notifications`/`emailEnabled` props)
- `app/Notifications/NotificationMail.php` +
  `resources/views/emails/notification.blade.php`
- `resources/js/types/Notification.ts`
- `resources/js/Components/Organisms/PageHeader/PageHeader.tsx`,
  `NotificationsPopup/NotificationsPopup.tsx`,
  `NotificationsList/NotificationsList.tsx`,
  `AccountSettingsContent/AccountSettingsNotificationsTab.tsx`,
  `AccountSettingsContent/AccountSettingsNotificationTypeRow.tsx`
- `resources/js/Components/Molecules/NotificationHeader/NotificationHeader.tsx`,
  `NotificationItem/NotificationItem.tsx`,
  `NotificationEmptyState/NotificationEmptyState.tsx`

## Local testing checklist

1. Log in as two different users in the same project (or two
   browser profiles) so you have someone to trigger an event as, and
   someone to receive the notification.
2. To see an email actually land somewhere during local dev, set
   `MAIL_MAILER=log` in `.env` and tail the log (`php artisan pail`,
   already part of `composer dev`) — `log`/`array` mailers never error,
   so a silently-missing email is the #1 "why didn't this arrive"
   cause (see guide 02's channel breakdown).
3. Toggle a channel off in Account settings → Notifications, then
   trigger that type again, and confirm nothing was written
   (`Notification::where('user_id', $id)->latest()->first()` via
   `php artisan tinker`) rather than just "not visible" — a UI bug
   hiding a row and the row never being created look identical from
   the popup alone.
