# Cache a value and invalidate it

Two tools, both in `app/Support/Cache/CacheVersion.php` and plain `Cache`:

- **A single key** that one write path owns (a user's notifications): `Cache::remember`
  and `Cache::forget` in the same service.
- **A scope** that many writers can affect (who is a member of what):
  `CacheVersion`.

## 1. Cache a read under a scope

```php
use App\Support\Cache\CacheVersion;

public function getAllForUser(int $userId): Collection
{
    return CacheVersion::remember(
        CacheVersion::MEMBERSHIP,
        "user:$userId:projects",
        600,
        fn () => $this->projectRepository->getAllForUser($userId),
    );
}
```

The key embeds the scope's current version, so `bump()` retires every key of the
scope at once and the old entries age out through their TTL. There are no tags
(the `database` store does not support them) and no key lists to maintain.

## 2. Bump the version on every write that changes the answer

```php
CacheVersion::bump(CacheVersion::MEMBERSHIP);
```

The membership scope is bumped from the repositories that write membership,
roles and permissions: `ProjectMemberRepository`, `ProjectRepository`
(`attachMember`, `update`, `delete`), `RoleRepository` (`delete`,
`syncPermissions`), `UserRepository::delete`, `ProjectInvitationService` (accepting
an invitation) and the `GrantPermissionsToExistingRoles` command.

**If you add a new way to change membership, a role or a role's permissions, bump
the version there.** A missed bump means a stale permission for up to the TTL
(10 minutes), which is a security bug, not a cosmetic one. Bulk query-builder
updates and `attach()/sync()` on pivots fire no model events, which is why the
bumps live in the repositories and not in observers.

## Issue lists

`IssueService` caches the lists as the plain arrays Inertia serialises (never as
Eloquent models: `config/cache.php` sets `serializable_classes` to `false`, so
Redis hands objects back as incomplete classes; for model lists use
`CachedModels`). They depend on three scopes:

- `CacheVersion::ISSUES` is bumped on every save/delete of an `Issue`, `IssueType`
  or `WorkflowStatus` (the `BumpsIssueCache` trait). Query-builder updates and
  deletes fire no model events, so those bump it by hand
  (`IssueRepository::bulkDelete`, the workflow reset in `IssueTypeService`).
- `CacheVersion::USERS` is bumped when a user's name or avatar changes or the user
  is deleted (the `BumpsUserCache` trait), because lists embed people.
- `CacheVersion::MEMBERSHIP` (the dashboard only), because it lists every project
  the user belongs to.

**If you add a write to issues, issue types or statuses that bypasses model
events (`Issue::query()->update(...)`, raw SQL), bump `CacheVersion::ISSUES`.**
If a list starts embedding a new related model, give it `BumpsIssueCache` too.

## 3. Test both directions

Add the write to `tests/Feature/MembershipCacheInvalidationTest.php` (the version
moved) and, for behaviour, to `tests/Feature/ProjectMembershipCacheTest.php`
(the answer changed straight away). Use `queryCount()` there to prove a repeated
read hits no queries.

## When not to cache

- Anything that must be exact right now and has no single write path.
- Values that change on most requests (for example `projects.next_issue_number`).
- Data that is cheap and rarely read.
