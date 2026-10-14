# Frontend ↔ backend wiring overview

A map of the whole feature: how notifications reach the browser, how
read/unread state round-trips, and how the settings tab persists
preferences. Useful to read before guide 01 or 02 if you haven't
touched this system before.

## 1. Reading: how the bell popup gets its data

The newest page of notifications arrives as a **shared Inertia prop** on
every page visit, the same way `auth.user` does; everything older (and
every filtered view) is fetched by the popup page by page.

```
Every Inertia request
        │
        ▼
HandleInertiaRequests::share()
  - 'notifications'          => the newest NotificationRepository::LIMIT (20)
                                rows, served from a per-user cache
  - 'notificationUnreadCount' => unread across the WHOLE inbox (cached
                                separately, dropped by every write)
        │
        ▼
PageHeader.tsx
  - reads `notificationUnreadCount` for the red badge on the Bell
    (capped at "9+") — it can no longer count the list itself, which
    is capped
  - owns `showNotificationsPopup`, closes it on click-outside/Escape
        │
        ▼ (only rendered while open)
NotificationsPopup.tsx
  - useNotificationsFeed(notifications, notificationUnreadCount)
        │
        ├─ first page: the shared prop, no request
        ├─ filter changed (unread / severity): GET /notifications
        │    ?unread=1&type=error  → replaces the list
        └─ end of list scrolled into view: GET /notifications?before=<last id>
             → appends the next page
```

`GET /notifications` (`NotificationController::index`) is keyset
paginated JSON, newest first:

```json
{ "data": [ ...notifications ], "next_cursor": 81, "unread_count": 34 }
```

`before` is the last id the client has (ordering is by id alone, so
the cursor and the order cannot disagree and a notification arriving
mid-scroll never shifts a page). `next_cursor` is `null` once the inbox
is exhausted. `per_page` is clamped to `NotificationRepository::MAX_PER_PAGE`.
Validation failures answer 422 JSON (`ListNotificationsRequest`), not a
redirect, because the caller is axios.

The command palette opens the popup through
`requestOpenNotifications({ onlyUnread?, selecting? })`
(`utils/notificationsPopupEvent.ts`): `PageHeader` receives the event,
remounts the popup and passes the options as `initialOnlyUnread` /
`initialSelecting`. The commands live in `hooks/useGlobalCommands.ts`:
*Go to Notifications*, *Show unread notifications*, *Select
notifications*, *Mark all notifications as read* and *Notification
clean-up schedule* (opens Settings → Notifications). Deleting is
deliberately not a palette command, since it would run without a
confirmation.

The popup's pieces:

- `useNotificationsFeed.ts` — all list state: items, cursor, unread
  count, loading/error flags, filters, and the mutations below. A
  request counter drops a slow response for a filter the user already
  left.
- `NotificationsList.tsx` — an `IntersectionObserver` sentinel at the end
  of the list calls `onLoadMore`; a visible "Load more" button is the
  fallback (and what jsdom tests click).
- `NotificationHeader.tsx` (unread count, mark all read, unread filter,
  selection toggle), `NotificationFilterTabs.tsx` (severity),
  `NotificationSelectionBar.tsx` (bulk actions),
  `NotificationClearRead.tsx` ("Delete all read" with a confirm step),
  `NotificationItem.tsx` (checkbox in selection mode).

## 2. Writing: read, delete, in bulk

Every mutation updates the feed's local state **immediately** and is
then sent through `router.post/delete` with
`only: ['notifications', 'notificationUnreadCount']`, so just the shared
props are refreshed when the redirect lands. A rejected request calls
`refresh()`, which refetches the first page so the list never keeps
showing something the server refused.

| UI action | Request | Controller |
| --- | --- | --- |
| mark one / several read | `POST /notifications/bulk-read` `{ids}` | `bulkMarkAsRead` |
| mark all read | `POST /notifications/mark-all-read` | `markAllAsRead` |
| delete one | `DELETE /notifications/{id}` | `destroy` (ownership checked, logged) |
| delete several | `POST /notifications/bulk-delete` `{ids}` | `bulkDestroy` |
| delete all read | `DELETE /notifications/read` | `destroyRead` |

The bulk routes take at most `NotificationRepository::MAX_BULK_IDS` (200)
ids (`BulkNotificationsRequest`) and the repository scopes every query
with `forUser($userId)`, so an id belonging to someone else is silently
ignored, never touched. Every service method that writes calls
`NotificationService::forget($userId)`, which drops both the list cache
and the unread-count cache.

`POST /notifications/{id}` (`update`) still exists but the popup no
longer uses it.

## 3. Settings: how a channel toggle persists

A **completely separate** read/write path from parts 1–2 — this one
*is* a real page load, not the shared prop:

```
GET /settings/notifications
        │
        ▼
SettingsController::notifications()
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
- `app/Http/Requests/Notifications/UpdateNotificationSettingsRequest.php`,
  `ListNotificationsRequest.php`, `BulkNotificationsRequest.php`
- `app/Http/Middleware/HandleInertiaRequests.php` (the shared
  `notifications`/`notificationUnreadCount`/`emailEnabled` props)
- `app/Notifications/NotificationMail.php` +
  `resources/views/emails/notification.blade.php`
- `resources/js/types/Notification.ts`
- `resources/js/Components/Organisms/PageHeader/PageHeader.tsx`,
  `NotificationsPopup/NotificationsPopup.tsx`,
  `NotificationsList/NotificationsList.tsx`,
  `AccountSettingsContent/AccountSettingsNotificationsTab.tsx`,
  `AccountSettingsContent/AccountSettingsNotificationTypeRow.tsx`
- `resources/js/hooks/useNotificationsFeed.ts`
- `resources/js/Components/Molecules/NotificationHeader/NotificationHeader.tsx`,
  `NotificationFilterTabs/NotificationFilterTabs.tsx`,
  `NotificationItem/NotificationItem.tsx`,
  `NotificationEmptyState/NotificationEmptyState.tsx`,
  `NotificationSelectionBar/NotificationSelectionBar.tsx`,
  `NotificationClearRead/NotificationClearRead.tsx`

The clean-up schedule has its own files, see
[guide 06](./06-clean-up-old-notifications.md).

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
