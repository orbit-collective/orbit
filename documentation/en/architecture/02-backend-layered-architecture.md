# Backend layered architecture

Controller → Service → Repository, with no exceptions and no
shortcuts — a controller never builds an Eloquent query, and a
repository never contains business logic or fires an event. Traced
below through one real, complete request.

## The rule for each layer

- **Controller** (`app/Http/Controllers/`) — validates the request
  (inline `$request->validate([...])` or a Form Request class),
  calls exactly one Service method to do the actual work, and returns
  a `redirect()` (mutating routes) or an `Inertia::render(...)`
  response (page routes). Never touches Eloquent directly, never
  contains a conditional that represents a business rule.
- **Service** (`app/Services/`) — owns business logic and every side
  effect: writing an `ActivityLog` entry, firing a domain `Event`,
  enforcing an invariant via `ValidationException`. Calls one or more
  Repositories for actual data access, and can call other Services
  (e.g. `ProjectMemberService` calls `RoleService`). Never returns an
  HTTP response, never reads `$request` directly.
- **Repository** (`app/Repositories/`) — every Eloquent query in the
  app lives here: `where()`, eager-loading, ordering, pagination,
  aggregation. A repository method does exactly what its name says
  and nothing else — no business rules, no events, no validation.

## Traced through a real request

`PATCH /projects/{project}/members/{user}` — promoting a member —
end to end:

```
ProjectMemberController::updateRole()
  - $this->authorize('updateMemberRole', $project)      [Policy check]
  - $request->validate([...])                            [shape check]
  - $this->projectMemberService->updateRole($project, $user, $role)
        │
        ▼
ProjectMemberService::updateRole()
  - assertIsMember() / assertNotOwner()                   [business rules]
  - $this->projectMemberRepository->updateRole(...)       [data access]
  - $this->roleService->syncSystemRoleForMember(...)      [another Service]
  - $this->activityLogService->log(...)                   [side effect]
        │
        ▼
ProjectMemberRepository::updateRole()
  - $project->users()->updateExistingPivot($userId, ['role' => $role->value])
        │
        ▼ (back up through Service, back up through Controller)
redirect()->back()->with('success', "...")
```

Every layer only knows about the layer directly below it — the
Controller never calls a Repository, and the Repository never knows a
`Policy` exists.

## Authorization lives outside all three layers

`app/Policies/` is a fourth, cross-cutting concern, not a layer in the
chain above — a Policy is only ever called from a Controller
(`$this->authorize(...)`) or, for computing a plain UI-facing boolean
prop rather than gating a mutating request, directly off a Model
method (`Project::hasPermission()`/`hasPermissionOrTier()` — see
[`../permissions/README.md`](../permissions/README.md)'s architecture
section for exactly when to use which).

## Adding a brand-new domain that follows this pattern

If you're adding an entirely new resource (not extending an existing
one — see every other category in `documentation/` for that), the
checklist, using `Comment` as the reference shape (a smaller, complete
example than `Issue`):

1. **Migration + Model** (`app/Models/`) — fillable fields, casts,
   relationships (`belongsTo`, `hasMany`).
2. **Repository** (`app/Repositories/`) — one method per query shape
   the feature actually needs (`getForIssue()`, not a generic
   `findBy(array $criteria)` — see every existing repository for this
   convention: narrow, purpose-named methods over a generic query
   builder wrapper).
3. **Service** (`app/Services/`) — one public method per use case
   (`addComment()`, `updateComment()`, `deleteComment()`), each
   calling the Repository and firing whatever `Event`/`ActivityLog`
   entry the use case implies.
4. **Policy** (`app/Policies/`) — one method per ability, following
   the `hasPermissionOrTier()`/`hasPermission()` pattern if the
   resource is project-scoped (see
   [`../permissions/01-add-a-new-permission.md`](../permissions/01-add-a-new-permission.md)).
5. **Controller** (`app/Http/Controllers/`) — one action per route,
   each `$this->authorize(...)`-gated, delegating to exactly one
   Service call.
6. **Routes** (`routes/web.php`) — named, grouped with the resource's
   related routes.
7. **Frontend types + components** — a type in `resources/js/types/`
   mirroring the model's shape, then whatever Atoms/Molecules/
   Organisms the feature's UI needs (see
   [`03-frontend-architecture-and-atomic-design.md`](./03-frontend-architecture-and-atomic-design.md)).

## Tests

Every layer gets its own test file, mirroring the real ones:
`tests/Feature/<Domain>ServiceTest.php`,
`tests/Feature/<Domain>RepositoryTest.php`,
`tests/Feature/<Domain>ControllerTest.php`, and — if the domain has
interesting model-level behavior (a cast, a computed attribute) —
`tests/Feature/Models/<Domain>Test.php`. See
`tests/Feature/CommentServiceTest.php`/`CommentRepositoryTest.php`/
`CommentControllerTest.php` for the smallest complete real example of
this four-file shape.
