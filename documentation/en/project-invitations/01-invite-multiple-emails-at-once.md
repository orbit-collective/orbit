# Invite multiple emails at once

Worked example: turning the single-email "Invite by email" form into
a bulk one — paste several addresses, get one invitation per address,
with per-address failures reported instead of one bad address failing
the whole batch.

## The one rule that matters most here

**Don't change `ProjectInvitationService::invite()`'s signature or add
a bulk method to the Service.** It already does exactly one thing —
invite one email — correctly (the pending-invite check, the
7-day expiry, the mail-configuration gate, the optional custom-role
attachment). A bulk operation is a Controller-level concern: call the
existing method once per address, and handle each address's own
success/failure independently, exactly the way
[`../permissions/03-grant-a-custom-role-in-bulk.md`](../permissions/03-grant-a-custom-role-in-bulk.md)'s
`grantToAllMembers()` loops over an existing single-target method
rather than rewriting it into something bulk-aware internally.

## Step 1 — Accept an array in the Controller

File: `app/Http/Controllers/ProjectInvitationController.php`

```php
public function store(Request $request, Project $project): RedirectResponse
{
    $this->authorize('inviteMembers', $project);

    $validated = $request->validate([
        'emails' => ['required', 'array', 'min:1'],
        'emails.*' => ['required', 'string', 'email', 'max:255'],
        'role' => ['required', Rule::enum(RoleType::class)->except([RoleType::OWNER, RoleType::CUSTOM])],
        'roles' => ['sometimes', 'array'],
        'roles.*' => ['integer', Rule::exists('roles', 'id')->where('project_id', $project->id)],
    ]);

    if (! empty($validated['roles'])) {
        $this->authorize('assign', [Role::class, $project]);
    }

    $invited = 0;
    $skipped = [];

    foreach (array_unique($validated['emails']) as $email) {
        try {
            $this->projectInvitationService->invite(
                $project,
                $email,
                RoleType::from($validated['role']),
                $request->user(),
                $validated['roles'] ?? []
            );
            $invited++;
        } catch (ValidationException $e) {
            $skipped[] = $email;
        }
    }

    $message = $invited > 0
        ? "Invited $invited ".Str::plural('person', $invited).'.'
        : 'No invitations were sent.';

    if (! empty($skipped)) {
        $message .= ' Skipped: '.implode(', ', $skipped).'.';
    }

    return redirect()->back()->with($invited > 0 ? 'success' : 'error', $message);
}
```

Add `use Illuminate\Validation\ValidationException;` and
`use Illuminate\Support\Str;` to the file's imports. Every address that
already belongs to a member, or already has a pending invite that
somehow still throws (it shouldn't, since `invite()` deletes an
existing pending one first — but a not-yet-obvious future validation
rule inside `invite()` might), lands in `$skipped` rather than
aborting the whole request — see
[`../alerts/01-trigger-an-alert-from-the-backend.md`](../alerts/01-trigger-an-alert-from-the-backend.md)
for why a single `success`/`error` flash key is enough here even
though the outcome is mixed per address; the message body itself
carries the per-address detail, since the flash mechanism only carries
one message string.

`array_unique()` guards against the same address pasted twice in one
batch — without it, the second copy would hit the "this user is
already a member" duplicate-invite check `invite()` raises internally
against its own just-created row from the first copy, showing up as a
confusing self-inflicted "skip."

## Step 2 — Accept multiple addresses in the frontend

File: `resources/js/hooks/useMembersManagement.ts`

```ts
const [inviteEmails, setInviteEmails] = useState('');
// ...existing inviteRole/inviteRoleIds/inviteError/isInviting state, unchanged...

const submitInvite = (event: SyntheticEvent) => {
    event.preventDefault();
    if (!selectedProject) {
        return;
    }

    const emails = inviteEmails
        .split(/[\n,]+/)
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

    if (emails.length === 0) {
        return;
    }

    router.post(
        `/projects/${selectedProject.id}/invitations`,
        { emails, role: inviteRole, roles: inviteRoleIds },
        {
            preserveScroll: true,
            onStart: () => setIsInviting(true),
            onFinish: () => setIsInviting(false),
            onSuccess: () => {
                setInviteEmails('');
                setInviteRoleIds([]);
                setInviteError(null);
            },
            onError: (errors) => {
                setInviteError(errors.emails ?? null);
                if (errors.emails) {
                    addAlert(errors.emails, 'error');
                }
            },
        },
    );
};
```

`inviteEmails` replaces `inviteEmail` (singular) as a single free-text
string — parsing happens client-side, right before the request, not
on every keystroke, so the input stays a plain controlled textarea
with no per-character validation.

File: `resources/js/Components/Molecules/InviteByEmailPanel/InviteByEmailPanel.tsx`

Swap the single-line `Input` for a multi-line textarea and update the
prop names to match:

```tsx
interface InviteByEmailPanelProps {
    emailEnabled: boolean;
    isManager: boolean;
    canAssignRoles: boolean;
    assignableRoles: WorkspaceRole[];
    emails: string;
    role: AssignableProjectMemberRole;
    roleIds: number[];
    error: string | null;
    isInviting: boolean;
    onEmailsChange: (emails: string) => void;
    onRoleChange: (role: AssignableProjectMemberRole) => void;
    onToggleRoleId: (roleId: number, enabled: boolean) => void;
    onSubmit: (event: SyntheticEvent) => void;
}
```

```tsx
<textarea
    value={emails}
    onChange={(event) => onEmailsChange(event.target.value)}
    placeholder="teammate@company.com, another@company.com"
    rows={2}
    className="min-w-[200px] flex-1 rounded-md border border-[var(--border-color)] bg-transparent p-2 text-sm text-[var(--text-color)] placeholder-[var(--text-muted-color)] outline-none"
/>
```

File: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsMembersTab.tsx`
— update the `InviteByEmailPanel` call site's prop names
(`email`/`onEmailChange` → `emails`/`onEmailsChange`) to match the
hook's renamed state.

## Tests

- `tests/Feature/ProjectInvitationControllerTest.php` — add "it
  invites every valid email in the batch", "it skips an address that's
  already a member without failing the others", and "it deduplicates
  a repeated address in the same request", following the existing
  single-invite tests' setup shape.
- `tests/Feature/ProjectInvitationServiceTest.php` — no change
  needed; `invite()`'s own behavior is unchanged, only called more
  than once per request now.
- `resources/js/hooks/useMembersManagement.test.ts` (or wherever the
  hook's existing invite tests live) — update the existing
  single-email assertions to the new `emails` array shape, and add a
  case asserting a comma/newline-separated string splits into the
  right array before the `router.post` call.
- `resources/js/Components/Molecules/InviteByEmailPanel/InviteByEmailPanel.test.tsx`
  — update prop names in existing tests, and add a case for the
  textarea's multi-line input.
