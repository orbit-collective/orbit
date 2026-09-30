# Authentication

Password auth (`AuthService`, `RegisteredUserController`,
`AuthenticatedSessionController`) plus an OAuth login pathway, so a
user can sign in with an external identity provider instead of (or in
addition to) an Orbit password. GitHub is the first provider wired up
(v0.9.5); Google and Microsoft are shown but disabled in
`SocialLoginButtons` until they're wired the same way.

## Guides, in the order you'd actually need them

1. **[Add an OAuth provider](./01-add-an-oauth-provider.md)** — worked
   example wiring up Google the same way GitHub is wired today.

## The architecture in one paragraph

`App\Services\GithubOAuthService` is the only place the actual
login/link/unlink decisions are made; `App\Http\Controllers\Auth\GithubAuthController`
is a thin two-action controller (`redirect()`/`callback()` via
`Laravel\Socialite\Facades\Socialite`, plus `unlink()`) that branches
on `$request->user()` — the **same** `/auth/github/callback` route
handles both a guest signing in and an already-authenticated user
linking their account from Settings, since Socialite's OAuth dance
doesn't otherwise care who's calling it. `loginOrRegister()` resolves,
in order: an existing `github_id` match (sign in), a matching verified
email on an unlinked account (auto-link — GitHub already proved the
caller owns that email), or, failing both, a brand-new account with no
password (`users.password` is nullable for exactly this reason). A
GitHub identity is never a secret Orbit has to protect: no access
token is stored at all, only `github_id` (unique, used to look the
account up) and `github_username` (display only) on `users`.

**This is a separate identity from the GitHub App integration**
(`app/Services/Integrations/Github`, see
[`../integrations/06-github-integration.md`](../integrations/06-github-integration.md)).
That one is project-scoped and grants repository access via an
installation token; this one is user-scoped and only proves "this
Orbit account is owned by this GitHub account." Neither implies the
other — a project can be connected to GitHub with nobody's personal
account linked, and a user can link their GitHub account without their
project having any GitHub integration at all.

## Using the link as a gate elsewhere

A linked GitHub account is also used as a precondition for an
unrelated action: creating a branch or pull request from an issue
(`IssueGithubDevelopmentController::assertGithubAccountLinked()`)
requires `$user->github_id !== null`, checked **separately** from the
`createGithubDevelopment` permission (`IssuePolicy`) — permission asks
"is your role allowed to," this asks "did you prove who you are on
GitHub." Follow this pattern (a small private guard method throwing
`ValidationException` with a field key the frontend already expects,
e.g. `branch`/`pullRequest`) rather than folding an identity check into
a policy, if a future feature needs the same kind of gate.

## Unlinking safety

`GithubOAuthService::unlink()` refuses to clear `github_id` when
`users.password` is null — a GitHub-only account would otherwise be
permanently locked out. The Security & Access settings page
(`AccountSettingsSecurityTab`) disables its "Unlink" button for the
same reason, but the backend check is the one that actually matters;
the frontend disable is just UX.
