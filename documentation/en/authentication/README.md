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

Orbit Local never talks to GitHub's OAuth endpoints and never holds a
GitHub OAuth App client secret - orbit-api is a **centralized sign-in
broker**, shared by every self-hosted Orbit Local instance, using the
one GitHub App/OAuth client it already has installed for the
repository integration (see
[`../integrations/06-github-integration.md`](../integrations/06-github-integration.md)).
This means a self-hosted deployment gets "Sign in with GitHub" for
free, without its operator ever registering their own GitHub OAuth
App. The hand-off between the two codebases (`src/auth/github-login`
in orbit-api, `GithubAuthController` in Local) is:

1. Local's `redirect()` generates its own CSRF `state`, stores it in
   the session, and redirects the browser to orbit-api's
   `GET /v1/auth/github/redirect?return_to=<Local's own callback URL, state included>`.
2. orbit-api's `GitHubLoginService::start()` stores that `return_to`
   against a **second**, orbit-api-owned `state` (its own CSRF
   protection for the GitHub round-trip - Local's `state` is just an
   opaque part of the URL to orbit-api at this point) and redirects to
   GitHub's real authorize URL.
3. GitHub redirects back to orbit-api's fixed `GITHUB_LOGIN_CALLBACK_URL`.
   `GitHubLoginService::callback()` exchanges the code, fetches the
   profile (`GET /user`, falling back to `GET /user/emails` for a
   private email - see `github-user.client.ts`), mints a random,
   single-use `exchange_token` valid for 60 seconds, and redirects the
   browser back to the stored `return_to` (Local's own callback,
   **its** `state` still attached) with `exchange_token` appended.
4. Local's `callback()` checks its own `state` against the session
   (standard CSRF check, unrelated to step 2's), then calls
   `OrbitRelayClient::resolveGithubLoginToken($exchangeToken)` -
   **server-to-server**, unauthenticated (possession of the token is
   itself the authorization, exactly like an OAuth code) - which
   redeems the token exactly once for a `GithubIdentityDTO`
   (`githubId`, `githubUsername`, `email`, `name`). A GitHub access
   token never reaches Local, and the exchange_token itself is useless
   after its first (and only) redemption.

`App\Services\GithubOAuthService::loginOrRegister()`/`linkToUser()`/`unlink()`
are unchanged by any of this - they only ever see a `GithubIdentityDTO`,
never knowing or caring whether it came from Socialite directly or
through the broker. `loginOrRegister()` resolves, in order: an existing
`github_id` match (sign in), a matching verified email on an unlinked
account (auto-link - GitHub already proved the caller owns that
email), or, failing both, a brand-new account with no password
(`users.password` is nullable for exactly this reason).

**This is a separate identity from the GitHub App integration**
(`app/Services/Integrations/Github`). That one is project-scoped and
grants repository access via an installation token; this one is
user-scoped and only proves "this Orbit account is owned by this
GitHub account." Neither implies the other - a project can be
connected to GitHub with nobody's personal account linked, and a user
can link their GitHub account without their project having any GitHub
integration at all.

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
