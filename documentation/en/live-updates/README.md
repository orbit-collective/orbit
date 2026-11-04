# Live updates

Changes other people make, and new notifications, show up on open pages without
a reload: statuses, assignees and comments on an issue, the board, the list,
the calendar, the dashboard counters, the notification bell, and who else is
looking at an issue. It runs on **Laravel Reverb** (a WebSocket server) with
**Laravel Echo** in the browser. Without Reverb the app keeps working and
refreshes itself on a timer instead.

## Architecture in one paragraph

A write calls `LiveUpdates` (directly, or through the `BroadcastsLiveChanges`
model trait). `LiveUpdates` collects and de-duplicates the changes of a request
or job and, once it is done, dispatches one `ProjectChanged` event per project
(and `AccessChanged` / `NotificationsChanged` per user) on the `live` queue.
Reverb delivers it to the **private** channels `project.{id}` and `user.{id}`.
The event carries **ids and kinds only, never row contents**. In the browser
`useLiveChannel` receives it, `changeProps.ts` maps it to the Inertia props that
went stale, and `requestLiveReload` re-reads just those props through the normal
authorised routes (coalesced, paused while the tab is hidden or a card is being
dragged). If the socket is off or down, `useLiveFallback` does the same re-read
on a timer. Presence ("who is viewing this issue", "someone is editing the
description") uses a presence channel and client-to-client whispers; it needs
the socket and has no fallback.

## Guides, in the order you'd actually need them

1. **[Set up Reverb](./01-set-up-reverb.md)** — the `reverb` Docker service, every
   environment variable (Doppler and `.env`), generating keys, development vs
   production behind a TLS proxy, scaling.
2. **[Announce a change](./02-announce-a-change.md)** — make a new model or write
   path tell live clients: `BroadcastsLiveChanges`, `LiveUpdates`, the events and
   the rule that payloads carry no data.
3. **[React to a change in the UI](./03-react-to-a-change-in-the-ui.md)** — keep a
   page in step: `useLiveChannel`, `changeProps.ts`, closures for lazy props,
   pausing reloads.
4. **[Presence and edit hints](./04-presence-and-edit-hints.md)** — show who is on
   a page and warn about concurrent edits.
5. **[Fallback, security and troubleshooting](./05-fallback-and-troubleshooting.md)** —
   what happens without Reverb, the security model, and what to check when
   nothing arrives.

## What is live today

| Where | Event | The page re-reads |
| --- | --- | --- |
| Notification bell and popup, browser notifications | `notifications.changed` on `user.{id}` | `notifications`, `notificationUnreadCount` |
| The user's abilities and project list | `access.changed` on `user.{id}` | the whole page |
| Project list, board, calendar, activity | `project.changed` on `project.{id}` | the props of the visible view |
| Issue page (fields, comments, activity) | `project.changed` | `issue`, `ancestors`, `linkedPullRequests`, activity while open |
| Dashboard counters, trend, feed | `project.changed` on each of the user's projects | `issueStats`, `productivity_trend`, `projects`, `activityLogs` |
| Settings: members, roles, labels, priorities, issue types | `project.changed` | the whole page |
| Who is viewing an issue, description edit warning | presence channel `issue.{id}` | no reload (client state) |

## Environment variables at a glance

| Variable | Purpose |
| --- | --- |
| `BROADCAST_CONNECTION` | `reverb` turns live updates on; anything else (or missing keys) keeps the app on polling |
| `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` | the credentials; `make reverb-keys` prints a fresh set |
| `REVERB_PUBLIC_HOST`, `REVERB_PUBLIC_PORT`, `REVERB_PUBLIC_SCHEME` | what the **browser** connects to |
| `REVERB_ALLOWED_ORIGINS` | hosts allowed to open a socket (default: the `APP_URL` host) |
| `REVERB_SCALING_ENABLED` | share events between several Reverb instances through Redis |
| `LIVE_POLL_INTERVAL` | fallback refresh in seconds (default 30, minimum 10, `0` = off) |
