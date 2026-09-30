# Add an OAuth provider

Worked example: wiring up Google the same way GitHub is wired today,
so `SocialLoginButtons` can stop disabling it. Steps 1-6 generalize to
any Socialite-supported provider; only the driver name and a couple of
field names change.

## 1. Add the Socialite driver's config

`laravel/socialite` already ships the `google` driver. Add its
credentials to `config/services.php`, next to `github`:

```php
'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect' => env('GOOGLE_REDIRECT_URI'),
],
```

Add the matching env vars to `.env.example`, mirroring the GitHub
block already there.

## 2. Add the provider's identity columns

```php
Schema::table('users', function (Blueprint $table) {
    $table->string('google_id')->nullable()->unique()->after('github_username');
});
```

No new `password` change needed - that migration already made
`password` nullable for the GitHub provider, and it stays nullable for
every provider from here on. Add `google_id` to `User::$fillable`.

## 3. Add repository methods

Mirror `UserRepository::findByGithubId()`/`linkGithubAccount()` with
`findByGoogleId()`/`linkGoogleAccount()`. Don't generalize these into
one parameterized method yet - two providers sharing near-identical
code is fine; refactor once a third provider makes the duplication
actually painful.

## 4. Add the service

Copy `GithubOAuthService` to `GoogleOAuthService`, replacing
`github_id`/`github_username`/`getNickname()` with
`google_id`/(no separate username field, Google doesn't have one)/`getName()`.
Keep the exact same three methods (`loginOrRegister`, `linkToUser`,
`unlink`) and the exact same safety rules:

- `assertGoogleIdIsFree()` before linking (someone else may already own
  that Google account).
- `unlink()` refuses when `$user->password` is null - a Google-only
  account must not be lockable-out.
- Never persist an access/refresh token. The only reason this service
  talks to Google is to prove identity once during the callback; it
  never calls the Google API again afterwards.

## 5. Add the controller and routes

Copy `GithubAuthController` to `GoogleAuthController`
(`Socialite::driver('google')`), and add the matching routes in
`routes/auth.php`:

```php
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
Route::delete('/auth/google', [GoogleAuthController::class, 'unlink'])->name('auth.google.unlink');
```

The redirect/callback pair stays outside both the `guest` and `auth`
middleware groups - it must work for both a signed-out visitor (login)
and a signed-in user (link), exactly like GitHub's.

## 6. Share the linked state and wire up the frontend

Add `google_id`-derived state to `HandleInertiaRequests::share()`'s
`auth.user` (e.g. `'google_linked' => $request->user()->google_id !== null`)
and to the `User` type in `resources/js/types/index.d.ts`. Flip
`enabled: false` to `true` on the `Google` entry in
`SocialLoginButtons.tsx`, pointing its link at
`route('auth.google.redirect')`. Add a second `SettingsPanelRow` to
`AccountSettingsSecurityTab`'s "Connected accounts" panel for linking
and unlinking Google, following the GitHub row already there.

## 7. Tests

Mirror `GithubOAuthServiceTest`/`GithubAuthControllerTest` exactly -
same scenarios (sign in via existing link, auto-link by email, fresh
registration with no public email rejected, link already claimed by
someone else rejected, unlink blocked with no password set). Mock
`Laravel\Socialite\Contracts\User`/`Provider` the same way, swapping
`driver('github')` for `driver('google')`.
