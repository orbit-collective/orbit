# Dodaj dostawcę OAuth

Przykład: podłączenie Google w ten sam sposób, w jaki GitHub jest
podłączony dzisiaj, tak aby `SocialLoginButtons` mógł przestać go
wyłączać. Ponieważ orbit-api jest scentralizowanym brokerem
logowania, dotyczy to **obu repozytoriów** — orbit-api odpowiada za
faktyczną wymianę OAuth z dostawcą, a Orbit Local zawsze widzi tylko
rozwiązaną tożsamość, nigdy tokena dostępu ani sekretu dostawcy.

## orbit-api: strona brokera

### 1. Dodaj konfigurację OAuth App dostawcy

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

Dodaj pasujące zmienne env do `.env.example` — to prawdziwa aplikacja
OAuth, którą rejestrujesz raz, centralnie, w konsoli deweloperskiej
Google; żadna samodzielnie hostowana instancja Orbit Local nigdy nie
potrzebuje własnej.

### 2. Odwzoruj elementy login-state/exchange-token

Skopiuj `src/auth/github-login/login-state.{model,keys,repository}.ts`
oraz `exchange-token.{model,keys,repository}.ts` do nowego folderu
`src/auth/google-login/`, zmieniając tylko prefiksy kluczy blobów
(`login-state/` → `google-login-state/` itd., tak aby oczekujące
przepływy obu dostawców nigdy się nie zderzyły we współdzielonym
magazynie). TTL-e (15 minut dla stanu logowania, 60 sekund dla tokena
wymiany, jednorazowość dla obu) są niezależne od dostawcy — zostaw je
bez zmian.

### 3. Dodaj klienta pobierającego profil i serwis

`src/auth/google-login/google-user.client.ts`: wywołuje endpoint
`userinfo` Google z tokenem dostępu dostawcy, zwracając
`{id, login, name, email}` w kształcie takim jak `GitHubUserProfile`
(`login` może być po prostu lokalną częścią e-maila, bo Google nie ma
osobnej nazwy użytkownika).

`src/auth/google-login/google-login.service.ts`: skopiuj dokładnie
`start()`/`callback()`/`resolve()` z `github-login.service.ts`,
zamieniając URL autoryzacji GitHuba na
`https://accounts.google.com/o/oauth2/v2/auth`, scope na
`openid email profile`, a wymianę tokena na własny endpoint Google
`POST https://oauth2.googleapis.com/token`. Zachowaj ten sam kontrakt:
`start(returnTo)` zwraca `{url}`, `callback(code, state)` zwraca
`{redirectUrl}` (nigdy nie rzuca po rozwiązaniu stanu logowania —
zawsze przekierowuje z powrotem z `?error=`, tak aby przeglądarka
Local nigdy nie utknęła na gołej stronie JSON), `resolve(exchangeToken)`
zwraca tożsamość albo rzuca `ApiError` dla nieprawidłowego/wygasłego/
już użytego tokena.

### 4. Dodaj trzy endpointy

`netlify/functions/google-login-{redirect,callback,resolve}.ts`,
skopiowane dosłownie z wersji GitHub (zmień tylko import), plus
pasujące przekierowania w `netlify.toml`: `/v1/auth/google/redirect`,
`/v1/auth/google/callback`, `/v1/auth/google/resolve`.

### 5. Testy

Odwzoruj każdy plik `tests/auth/github-login/*.test.ts` — testy
repozytoriów prawie się nie zmieniają (tylko prefiksy kluczy), test
serwisu zamienia zamockowany URL autoryzacji/scope, test klienta
profilu zamienia zamockowany endpoint.

## Orbit Local: strona konsumująca

### 6. Dodaj DTO tożsamości, metody serwisu i metodę klienta relay

`App\DataTransferObjects\Github\GithubIdentityDTO` ma już wystarczająco
ogólny kształt (`id`/`username`/`email`/`name`), żeby przy drugim
dostawcy warto było zrobić neutralne dla dostawcy przemianowanie — do
tego czasu dodaj równoległe `GoogleIdentityDTO` w ten sam sposób. Dodaj
`OrbitRelayClient::resolveGoogleLoginToken(string $exchangeToken): GoogleIdentityDTO`
(ten sam nieuwierzytelniony wzorzec `POST` co
`resolveGithubLoginToken()`). Dodaj `GoogleOAuthService` odwzorowujący
dokładnie `GithubOAuthService` (`loginOrRegister`/`linkToUser`/`unlink`,
te same zasady bezpieczeństwa: odrzuć linkowanie konta Google już
zajętego przez kogoś innego, odmów odlinkowania, gdy konto nie ma
ustawionego hasła).

### 7. Dodaj kontroler i trasy

Skopiuj `GithubAuthController` jako `GoogleAuthController` — ten sam
kształt `redirect()`/`callback()`/`unlink()`, ten sam wzorzec
sprawdzania CSRF lokalnego `state`, to samo wywołanie
`OrbitRelayClient`, tylko skierowane na `/v1/auth/google/redirect` i
`/v1/auth/google/callback` w orbit-api. Dodaj pasujące trasy w
`routes/auth.php`, poza grupami middleware `guest` i `auth` (musi
działać zarówno dla wylogowanego gościa, jak i zalogowanego
użytkownika linkującego konto).

### 8. Udostępnij stan podlinkowania i podłącz frontend

Dodaj stan wyprowadzony z `google_id` do `HandleInertiaRequests::share()`'s
`auth.user` (np. `'google_linked' => $request->user()->google_id !== null`)
oraz do typu `User` w `resources/js/types/index.d.ts`. Zmień
`enabled: false` na `true` przy wpisie `Google` w
`SocialLoginButtons.tsx`, kierując jego link na
`route('auth.google.redirect')`. Dodaj drugi `SettingsPanelRow` do
panelu "Connected accounts" w `AccountSettingsSecurityTab` do
linkowania i odlinkowywania Google, wzorując się na istniejącym
wierszu GitHub.

### 9. Testy

Odwzoruj dokładnie `GithubOAuthServiceTest`/`GithubAuthControllerTest` —
te same scenariusze (logowanie przez istniejący link, auto-linkowanie
po e-mailu, świeża rejestracja bez publicznego e-maila odrzucona,
link już zajęty przez kogoś innego odrzucony, odlinkowanie
zablokowane bez ustawionego hasła, niedopasowany stan CSRF odrzucony,
błąd z brokera przekierowuje z komunikatem). Test kontrolera mockuje
`Http` dla `*/v1/auth/google/resolve` zamiast mockować bezpośrednio
SDK dostawcy — zobacz `fakeGithubResolve()` w
`GithubAuthControllerTest.php` po wzorzec.
