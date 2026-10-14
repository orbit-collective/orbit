# Clean up old notifications and activity history

Notifications and activity log entries pile up forever unless something
removes them. Orbit gives every user two ways to do that, both in
**Settings → Notifications**:

- an **automatic schedule** (daily / weekly / monthly) that deletes
  notifications and the user's own activity entries older than N days;
- **"Clean up now"** buttons that do the same thing once, immediately.

This guide covers how it fits together and how to extend it (a new
kind of data to clean, a new frequency).

## The moving parts

```
notification_retention_settings (one row per user, optional)
  enabled, frequency, notifications_older_than_days,
  notifications_only_read, activity_older_than_days, last_run_at
        │
routes/console.php ── Schedule::command('notifications:prune')->hourly()
        │
PruneOldNotifications  →  NotificationRetentionService::runDue()
        │
        ├─ NotificationRetentionRepository::getDue($now)
        │     enabled AND (last_run_at IS NULL OR last_run_at <= now - frequency)
        ├─ apply(): purgeNotifications() / purgeActivity()
        └─ stamps last_run_at (only if apply() did not throw)
```

- **Model / table**: `App\Models\NotificationRetentionSetting`; one row
  per user (`user_id` unique, cascade-deleted with the user). No row
  means "schedule off", `getSettings()` fills in the defaults.
- **Frequency**: `App\Enums\Notifications\RetentionFrequency`
  (`daily`/`weekly`/`monthly`); `days()` is the minimum gap between two
  runs.
- **Why hourly?** The command runs every hour but each schedule decides
  whether a full period has passed, so users do not need a time of day
  and a missed tick is harmless. A failure for one user is logged and
  skipped (their schedule stays due), it never stops the others.
- **What is deleted**: notifications via
  `NotificationRepository::deleteOlderThanForUser()` (optionally only
  read ones — `notifications_only_read`, on by default) and the user's
  **own** `activity_logs` rows (`user_id = me`) via
  `ActivityLogRepository::deleteOlderThanForUser()`. Entries written by
  other people are never touched, even in the same project. Note that
  the activity log feeds the project activity feed too, so removing
  your own old entries removes them there as well.
- **Cache**: purging notifications calls `NotificationService::forget()`
  so the shared prop and the unread badge do not show deleted rows.

## HTTP

| Route | Controller | Purpose |
| --- | --- | --- |
| `GET /settings/notifications` | `SettingsController::notifications` | page; passes `notificationRetention` |
| `POST /account/notification-retention` | `NotificationRetentionController::update` | save the schedule |
| `POST /account/notification-retention/purge` | `NotificationRetentionController::purge` | run once: `target` (`notifications`\|`activity`), `days`, `only_read` |

Validation: ages are integers `1..NotificationRetentionService::MAX_DAYS`
(3650); a schedule cannot be switched on with both ages empty
(`UpdateNotificationRetentionRequest`).

## Frontend

`AccountSettingsNotificationCleanup.tsx` (rendered by
`AccountSettingsNotificationsTab.tsx`) keeps a local *draft* of the
schedule, enables "Save schedule" only when it differs from what was
saved, and shows server errors inline. "Clean up now" uses an inline
two-step confirm because deletion cannot be undone. The age presets live
in one `AGE_DAYS` array.

## Extending

### Add another age preset

Add the number to `AGE_DAYS` in `AccountSettingsNotificationCleanup.tsx`.
The backend accepts any value up to `MAX_DAYS`, so nothing else changes.

### Add a new frequency

1. Add a case and its `days()` to `RetentionFrequency` (the migration
   stores the string, so no schema change).
2. Add `{ value, label }` to `FREQUENCY_OPTIONS` and the literal to the
   `RetentionFrequency` type in `resources/js/types/Notification.ts`.
3. `getDue()` iterates `RetentionFrequency::cases()`, so it picks the new
   case up by itself.

### Clean up another kind of data

1. Add a nullable `<thing>_older_than_days` column
   (new migration — never edit the existing one) and put it in the
   model's `$fillable`/`casts`.
2. Add a repository `deleteOlderThanForUser()`-style method and a
   `purge<Thing>()` in `NotificationRetentionService`; call it from
   `apply()`.
3. Extend `UpdateNotificationRetentionRequest`, `getSettings()` and the
   `NotificationRetention` TS type; add the row to the cleanup
   component and the `target` option of `PurgeNotificationDataRequest`.
4. Remember to drop any cache that holds the data you delete
   (`CacheVersion::bump(...)` for the shared lists, see
   [`../redis/`](../redis/README.md)).

## Testing

- PHP: `tests/Feature/NotificationRetentionTest.php` covers the due
  logic (period, disabled, failure isolation), the command, the schedule
  registration and every endpoint. Build old rows by passing
  `created_at` to the factory.
- JS: `AccountSettingsNotificationCleanup.test.tsx`.
- Run the schedule by hand: `php artisan notifications:prune`.
