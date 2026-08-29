# Notifications (in-app & email)

Orbit tells users about activity two ways: an in-app notification (the
bell dropdown) and an email, per `App\Enums\Notifications\NotificationType`
— per-user, per-channel, independently toggleable in Account settings.
This category documents that system: how a domain event becomes a
notification, how per-user preferences gate delivery, and the one step
that's easy to forget when adding a new kind of notification.

## Guides, in the order you'd actually need them

1. **[Add a new notification type](./01-add-a-new-notification-type.md)**
   — worked example adding `MemberRoleChanged` (notifying a member when
   their project role changes) end to end: the enum case, firing and
   handling the event, and — the step that's easy to skip — the
   frontend settings row that makes the new type visible and
   toggleable at all.
2. **[Send a notification from your code](./02-send-a-notification-from-your-code.md)**
   — the full `NotificationService::notify()` contract (recipient,
   type, severity, message, action URL, what each channel actually
   does), for when you want to send an existing notification type
   directly, without introducing a new domain event.
3. **[Frontend ↔ backend wiring overview](./03-frontend-backend-wiring-overview.md)**
   — how a notification actually reaches the browser (it's a shared
   Inertia prop, not a fetch), how mark-as-read/mark-all-as-read/delete
   round-trip, and how the settings tab persists a toggle — useful as
   a map before diving into either guide above.

Wiring a domain event into the notification pipeline is itself
documented as part of
[`../integrations/03-add-a-new-event-type.md`](../integrations/03-add-a-new-event-type.md)
(using `IssueCreated` as its worked example) — guide 1 doesn't repeat
that mechanic, it covers everything specific to *notification types*
on top of it: the settings row, channel defaults, and the
frontend/backend split that guide doesn't touch.

## The architecture in one paragraph

Every notification-worthy fact is one `NotificationType` case (e.g.
`IssueAssigned`, `ProjectInvited`). Every notification can go out on
one or both of two `NotificationChannel`s — `InApp` (on by default)
and `Email` (off by default, see `NotificationChannel::enabledByDefault()`)
— and a user can override either channel for either type via a
`NotificationSetting` row (`user_id` + `type` + `channel` + `enabled`;
no row means "use the channel's default"). `NotificationService::notify()`
is the single funnel everything goes through: it always asks
`NotificationMailService` to (maybe) send the email, then checks the
recipient's in-app preference before writing a `Notification` row at
all — skip the check and you'd persist rows for channels the user
explicitly turned off. Domain events don't call `notify()` directly;
`SendNotificationListener::handle()` is the one place that turns "this
happened" (`IssueAssigned`, `CommentAdded`, `ProjectInvited`, …) into
"tell this specific person, with this title/message" — see
[`../integrations/03-add-a-new-event-type.md`](../integrations/03-add-a-new-event-type.md)
for how an event itself gets created and registered. On the frontend,
`AccountSettingsNotificationsTab.tsx`'s `defaultNotificationTypes`
array is a **hand-maintained mirror** of the backend's `NotificationType`
cases (icon, title, description per type) — nothing generates it from
the enum, so a new backend type is invisible in Settings until you add
its row there too.
