# Project invitations

The root [`README.md`](../../../README.md#project-membership--invitations)
already narrates the whole invitation flow end to end (token, 7-day
expiry, the logged-in-vs-not accept paths, why the invitation email
either goes through the normal notification pipeline or a dedicated
one-time `ProjectInvitationMail` depending on whether the address
already has an account). This category doesn't repeat that — it's the
"how do I extend this" companion, since the flow itself doesn't have
one anywhere yet.

## Guides, in the order you'd actually need them

1. **[Invite multiple emails at once](./01-invite-multiple-emails-at-once.md)**
   — worked example turning the single-email invite form into a bulk
   one, tracing the change through the hook, the component, the
   validation, and the Service loop.

Two related, already-documented pieces worth knowing about before
extending this flow further:
[`../permissions/03-grant-a-custom-role-in-bulk.md`](../permissions/03-grant-a-custom-role-in-bulk.md)
covers the custom-role-preassignment side of an invitation, and
[`../notifications/04-add-a-dedicated-transactional-email.md`](../notifications/04-add-a-dedicated-transactional-email.md)
covers `ProjectInvitationMail`'s own pattern for a dedicated,
preference-independent email.

## The architecture in one paragraph

`ProjectInvitationService::invite()` is the single entry point: it
checks `MailConfigurationService::isEnabled()` first (no working
outgoing mail, no invitations — the entire feature is gated on it),
deletes any existing pending invitation for the same email/project
pair (so re-inviting someone is just calling `invite()` again — there
is no separate "resend" action or endpoint), creates a new
`ProjectInvitation` row with a random 64-character token and a 7-day
`expires_at`, optionally attaches pre-assigned custom `Role`s via the
`project_invitation_role` pivot, and fires `ProjectInvited` (consumed
by `SendNotificationListener` — see
[`../notifications/README.md`](../notifications/README.md)). Accepting
one (`acceptByToken()`) attaches the user to the project with the
invitation's base `RoleType`, syncs their system role, attaches any
pre-assigned custom roles, and marks the invitation `accepted_at` —
called either automatically right after login/register (if the
`pending_invitation_token` session key from a not-logged-in click on
the email link is present) or manually by pasting the token into the
Members tab's `JoinWithCodePanel`.
