# Add an OAuth provider

Worked example: wiring up Google the same way GitHub is wired today,
so `SocialLoginButtons` can stop disabling it. Since orbit-api is the
centralized sign-in broker, this touches **both repos** - orbit-api
owns the actual OAuth exchange with the provider, and Orbit Local only
ever sees a resolved identity, never a provider access token or
secret.

## orbit-api: the broker side

### 1. Add the provider's OAuth App config

```ts
// src/auth/google-login/google-login.config.ts
import { env } from "@/shared/env";

export function getGoogleLoginConfig() {
    return {
        clientId: env("GOOGLE_CLIENT_ID"),
        clientSecret: env("GOOGLE_CLIENT_SECRET"),
        callbackUrl: env("GOOGLE_LOGIN_CALLBACK_URL"),
    };
}
```

Add the matching env vars to `.env.example` - this is a real OAuth App
you register once, centrally, at Google's own developer console; no
self-hosted Orbit Local deployment ever needs its own.

### 2. Mirror the login-state/exchange-token building blocks

Copy `src/auth/github-login/login-state.{model,keys,repository}.ts`
and `exchange-token.{model,keys,repository}.ts` into a new
`src/auth/google-login/` folder, renaming only the blob key prefixes
(`login-state/` → `google-login-state/`, etc., so the two providers'
pending flows never collide in the shared store). The TTLs (15 minutes
for a login state, 60 seconds for an exchange token, single-use for
both) are provider-agnostic - keep them as-is.

### 3. Add a profile-fetching client and the service

`src/auth/google-login/google-user.client.ts`: call Google's
`userinfo` endpoint with the provider's own access token, returning
`{id, login, name, email}` shaped like `GitHubUserProfile` (`login`
can just be the email's local part, since Google has no separate
username).

`src/auth/google-login/google-login.service.ts`: copy
`github-login.service.ts`'s `start()`/`callback()`/`resolve()`
exactly, swapping the GitHub authorize URL for
`https://accounts.google.com/o/oauth2/v2/auth`, the scope for
`openid email profile`, and the token exchange for Google's own
`POST https://oauth2.googleapis.com/token`. Keep the same contract:
`start(returnTo)` returns `{url}`, `callback(code, state)` returns
`{redirectUrl}` (never throwing once the login state resolves - always
redirecting back with `?error=` instead, so Local's browser never gets
stranded on a bare JSON page), `resolve(exchangeToken)` returns the
identity or throws `ApiError` for an invalid/expired/already-used
token.

### 4. Add the three endpoints

`netlify/functions/google-login-{redirect,callback,resolve}.ts`,
copied from the GitHub ones verbatim (swap the import), plus matching
`netlify.toml` redirects: `/v1/auth/google/redirect`,
`/v1/auth/google/callback`, `/v1/auth/google/resolve`.

### 5. Tests

Mirror every `tests/auth/github-login/*.test.ts` file - the repository
tests barely change (just the key prefixes), the service test swaps
the mocked authorize URL/scope, the profile-client test swaps the
mocked endpoint.

## Orbit Local: the consuming side

### 6. Add the identity DTO, service methods, and relay client method

`App\DataTransferObjects\Github\GithubIdentityDTO` is already generic
enough in shape (`id`/`username`/`email`/`name`) that a provider-neutral
rename is worth doing once a second provider lands - until then, add a
parallel `GoogleIdentityDTO` the same way. Add
`OrbitRelayClient::resolveGoogleLoginToken(string $exchangeToken): GoogleIdentityDTO`
(same unauthenticated `POST` pattern as `resolveGithubLoginToken()`).
Add `GoogleOAuthService` mirroring `GithubOAuthService` exactly
(`loginOrRegister`/`linkToUser`/`unlink`, same safety rules: reject
linking a Google account already claimed by someone else, refuse
unlinking when the account has no password set).

### 7. Add the controller and routes

Copy `GithubAuthController` to `GoogleAuthController` - same
`redirect()`/`callback()`/`unlink()` shape, same local `state`
CSRF-check pattern, same `OrbitRelayClient` call, just pointed at
`/v1/auth/google/redirect` and `/v1/auth/google/callback` on orbit-api.
Add the matching routes in `routes/auth.php`, outside both the `guest`
and `auth` middleware groups (it must work for both a signed-out
visitor and a signed-in user linking their account).

### 8. Share the linked state and wire up the frontend

Add `google_id`-derived state to `HandleInertiaRequests::share()`'s
`auth.user` (e.g. `'google_linked' => $request->user()->google_id !== null`)
and to the `User` type in `resources/js/types/index.d.ts`. Flip
`enabled: false` to `true` on the `Google` entry in
`SocialLoginButtons.tsx`, pointing its link at
`route('auth.google.redirect')`. Add a second `SettingsPanelRow` to
`AccountSettingsSecurityTab`'s "Connected accounts" panel for linking
and unlinking Google, following the GitHub row already there.

### 9. Tests

Mirror `GithubOAuthServiceTest`/`GithubAuthControllerTest` exactly -
same scenarios (sign in via existing link, auto-link by email, fresh
registration with no public email rejected, link already claimed by
someone else rejected, unlink blocked with no password set, mismatched
CSRF state rejected, broker error redirects with a message). The
controller test fakes `Http` for `*/v1/auth/google/resolve` instead of
mocking a provider SDK directly - see `fakeGithubResolve()` in
`GithubAuthControllerTest.php` for the pattern.
