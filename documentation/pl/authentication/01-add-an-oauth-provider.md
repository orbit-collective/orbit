# Dodaj dostawcę OAuth

Przykład: podłączenie Google w ten sam sposób, w jaki GitHub jest
podłączony dzisiaj, tak aby `SocialLoginButtons` mógł przestać go
wyłączać. Kroki 1-6 uogólniają się na dowolnego dostawcę wspieranego
przez Socialite; zmienia się tylko nazwa sterownika i kilka nazw pól.

## 1. Dodaj konfigurację sterownika Socialite

`laravel/socialite` już udostępnia sterownik `google`. Dodaj jego dane
uwierzytelniające w `config/services.php`, obok `github`:

```php
'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect' => env('GOOGLE_REDIRECT_URI'),
],
```

Dodaj pasujące zmienne env do `.env.example`, odzwierciedlając blok
GitHub, który już tam jest.

## 2. Dodaj kolumny tożsamości dostawcy

```php
Schema::table('users', function (Blueprint $table) {
    $table->string('google_id')->nullable()->unique()->after('github_username');
});
```

Nie jest potrzebna kolejna zmiana `password` - ta migracja już
zrobiła `password` nullable dla dostawcy GitHub i zostaje takie dla
każdego kolejnego dostawcy. Dodaj `google_id` do `User::$fillable`.

## 3. Dodaj metody repozytorium

Odwzoruj `UserRepository::findByGithubId()`/`linkGithubAccount()` jako
`findByGoogleId()`/`linkGoogleAccount()`. Nie uogólniaj ich jeszcze do
jednej sparametryzowanej metody - dwóch dostawców z niemal identycznym
kodem to nie problem; refaktoryzuj dopiero, gdy trzeci dostawca
faktycznie uczyni tę duplikację uciążliwą.

## 4. Dodaj serwis

Skopiuj `GithubOAuthService` jako `GoogleOAuthService`, zastępując
`github_id`/`github_username`/`getNickname()` przez
`google_id`/(bez osobnego pola username, Google go nie ma)/`getName()`.
Zachowaj dokładnie te same trzy metody (`loginOrRegister`, `linkToUser`,
`unlink`) i dokładnie te same zasady bezpieczeństwa:

- `assertGoogleIdIsFree()` przed podlinkowaniem (ktoś inny może już
  być właścicielem tego konta Google).
- `unlink()` odmawia, gdy `$user->password` jest puste - konto istniejące
  tylko dzięki Google nie może dać się zablokować.
- Nigdy nie zapisuj access/refresh tokena. Jedynym powodem, dla którego
  ten serwis rozmawia z Google, jest jednorazowe potwierdzenie
  tożsamości podczas callbacku; nigdy nie woła ponownie API Google
  potem.

## 5. Dodaj kontroler i trasy

Skopiuj `GithubAuthController` jako `GoogleAuthController`
(`Socialite::driver('google')`) i dodaj pasujące trasy w
`routes/auth.php`:

```php
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
Route::delete('/auth/google', [GoogleAuthController::class, 'unlink'])->name('auth.google.unlink');
```

Para redirect/callback zostaje poza grupami middleware `guest` i
`auth` - musi działać zarówno dla wylogowanego gościa (logowanie), jak
i zalogowanego użytkownika (linkowanie), dokładnie jak w przypadku
GitHub.

## 6. Udostępnij stan podlinkowania i podłącz frontend

Dodaj stan wyprowadzony z `google_id` do `HandleInertiaRequests::share()`'s
`auth.user` (np. `'google_linked' => $request->user()->google_id !== null`)
oraz do typu `User` w `resources/js/types/index.d.ts`. Zmień
`enabled: false` na `true` przy wpisie `Google` w
`SocialLoginButtons.tsx`, kierując jego link na
`route('auth.google.redirect')`. Dodaj drugi `SettingsPanelRow` do
panelu "Connected accounts" w `AccountSettingsSecurityTab` do
linkowania i odlinkowywania Google, wzorując się na istniejącym
wierszu GitHub.

## 7. Testy

Odwzoruj dokładnie `GithubOAuthServiceTest`/`GithubAuthControllerTest` -
te same scenariusze (logowanie przez istniejący link, auto-linkowanie
po e-mailu, świeża rejestracja bez publicznego e-maila odrzucona,
link już zajęty przez kogoś innego odrzucony, odlinkowanie
zablokowane bez ustawionego hasła). Mockuj
`Laravel\Socialite\Contracts\User`/`Provider` w ten sam sposób,
zamieniając `driver('github')` na `driver('google')`.
