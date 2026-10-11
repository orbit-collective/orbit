# Sessions on Redis

With `SESSION_DRIVER=database` the Security page lists the `sessions` table. Redis
stores one opaque payload per session id and cannot be searched by user, so
`App\Support\Sessions\SessionRegistry` keeps a per-user map next to it.

## How it works

- `EnforceSessionLifetime` registers the current session (`touch`) after it
  stamps `last_activity_at`, at most once every `SessionRegistry::TOUCH_INTERVAL`
  seconds, and immediately for a new session id (after login).
- `UserRepository::getUserSessions`, `deleteSession` and `deleteOtherSessions`
  use the registry when `SessionRegistry::enabled()` (the `redis`, `memcached` and
  `dynamodb` drivers) and the table otherwise.
- A session counts as signed in only while its payload still exists, so expired
  and revoked sessions drop out when the list is read. Revoking destroys the
  payload, so that device is signed out on its next request.
- `AuthenticatedSessionController::destroy` forgets the session on logout.

## Adding another session consumer

Read and revoke sessions through `UserRepository`, never `DB::table('sessions')`
directly: that table is empty under Redis.

## Tests

`tests/Feature/Support/SessionRegistryTest.php` exercises the registry against an
in-memory session handler; the middleware, logout and repository wiring have
their own tests next to the code they cover.
