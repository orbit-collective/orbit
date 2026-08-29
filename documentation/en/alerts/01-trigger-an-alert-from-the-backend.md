# Trigger an alert from a backend action

Worked example: adding a "View in settings" link to the existing
notification-settings confirmation toast. This is also the guide to
read if you just want to know "how do I show a toast for my new
controller action" — most of the time (any redirect response), the
answer is: you already can, with zero frontend changes.

## The one rule that matters most here

**The flash key is not the same vocabulary as the `Notification`
model's `type` column.** This codebase has two unrelated
"what kind of message is this" string sets that happen to look
similar:

- The alert/toast flash keys (this guide): exactly one of
  `success` / `error` / `warning` / `information` — used as the
  **key itself** (`->with('warning', $message)`), read by
  `AlertContext::showFlashAlerts()`.
- `Notification`'s `type` column / `NotificationService::notify()`'s
  `$type` parameter (see
  [`../notifications/02-send-a-notification-from-your-code.md`](../notifications/02-send-a-notification-from-your-code.md)):
  `'success'|'info'|'warning'|'error'` — note **`info`**, not
  `information` — passed as a **value**, not a key.

Flash `->with('info', $message)` by analogy with the other system and
nothing breaks, but nothing shows either: `information` is the only
key `showFlashAlerts()` checks for that family of message, so an
`info` key is silently ignored. There's no validation layer that would
catch this — a toast that never appears is the only symptom.

## Zero-code case: this already works today

Any controller returning a `redirect()->back()->with('success', '...')`
(or `error`/`warning`/`information`) already produces a toast — no
`AlertProvider`/`addAlert` code to write. For example,
`app/Http/Controllers/IssueController.php`'s `bulkDestroy()`:

```php
public function bulkDestroy(Request $request): RedirectResponse
{
    $validated = $request->validate([
        'ids' => ['required', 'array'],
        'ids.*' => ['required', 'integer', 'exists:issues,id'],
    ]);

    foreach (Issue::whereIn('id', $validated['ids'])->get() as $issue) {
        $this->authorize('delete', $issue);
    }

    $this->issueService->bulkDeleteIssues($validated['ids']);

    return redirect()->back()
        ->with('success', "Selected issues have been deleted successfully.");
}
```

produces a green success toast reading "Selected issues have been
deleted successfully." with no other code involved — this is true of
every `->with('success'|'error'|'warning'|'information', ...)` call
already in the codebase (grep `app/Http/Controllers` for `->with(` to
see dozens more).

## Step — Add an optional action link

File: `app/Http/Controllers/NotificationSettingController.php`

The toast can carry a "View details" link (`Alert.tsx` renders it next
to the message) by flashing a sibling `action_url` key alongside the
message key — the exact pattern
`app/Http/Controllers/IssueController.php`'s `store()`/`update()` and
`app/Http/Controllers/CommentController.php`'s actions already use:

```php
public function update(UpdateNotificationSettingsRequest $request): RedirectResponse
{
    $this->notificationSettingService->updateSettings($request->user()->id, $request->validated('settings'));

    return back()
        ->with('success', 'Notification settings updated successfully.')
        ->with('action_url', route('settings').'?tab=notifications');
}
```

`action_url` is always built with `route(...)`, never a hand-built
string — see every existing call site. There's exactly one `action_url`
per response; if a future change needs to flash more than one message
in the same response (not done anywhere today), each would need its
own dedicated flash key plumbed through `InertiaPageProps['flash']`
and `AlertContext::showFlashAlerts()`, since the shape only supports
one `action_url` shared by whichever single message key is present.

## Tests

- `tests/Feature/NotificationSettingControllerTest.php` — the
  existing `'an authenticated user can update their notification
  settings'` test already asserts
  `$response->assertSessionHas('success', '...')`; add
  `->assertSessionHas('action_url', route('settings').'?tab=notifications')`
  to it rather than writing a new test — this isn't new behavior
  worth its own test, just an assertion added to the existing one.
- No frontend test changes are needed for this guide specifically —
  `AlertContext.test.tsx`'s existing flash-handling tests (e.g.
  `'surfaces a flash error from a subsequent Inertia visit'`) already
  cover the generic mechanism this relies on. Only add a frontend test
  here if you're introducing an actual new flash **key** (not just a
  new call site using the four that already exist).
