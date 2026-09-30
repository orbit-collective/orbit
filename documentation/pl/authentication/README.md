# Uwierzytelnianie

Logowanie hasłem (`AuthService`, `RegisteredUserController`,
`AuthenticatedSessionController`) plus ścieżka logowania OAuth,
dzięki której użytkownik może zalogować się zewnętrznym dostawcą
tożsamości zamiast (albo obok) hasła w Orbit. GitHub jest pierwszym
podłączonym dostawcą (v0.9.5); Google i Microsoft są pokazane, ale
wyłączone w `SocialLoginButtons`, dopóki nie zostaną podłączone w ten
sam sposób.

## Przewodniki, w kolejności, w jakiej naprawdę byś ich potrzebował

1. **[Dodaj dostawcę OAuth](./01-add-an-oauth-provider.md)** —
   przykład podłączenia Google w ten sam sposób, w jaki GitHub jest
   podłączony dzisiaj.

## Architektura w jednym akapicie

Orbit Local nigdy nie rozmawia bezpośrednio z endpointami OAuth
GitHuba i nigdy nie trzyma sekretu klienta GitHub OAuth App —
orbit-api jest **scentralizowanym brokerem logowania**, współdzielonym
przez każdą samodzielnie hostowaną instancję Orbit Local, korzystającym
z tego samego GitHub App/klienta OAuth, który już ma zainstalowany dla
integracji repozytorium (zobacz
[`../integrations/06-github-integration.md`](../integrations/06-github-integration.md)).
Oznacza to, że samodzielnie hostowane wdrożenie dostaje "Sign in with
GitHub" za darmo, bez potrzeby zakładania przez operatora własnej
aplikacji GitHub OAuth. Przekazanie między dwoma bazami kodu
(`src/auth/github-login` w orbit-api, `GithubAuthController` w Local)
wygląda tak:

1. `redirect()` w Local generuje własny token CSRF `state`, zapisuje
   go w sesji i przekierowuje przeglądarkę do orbit-api
   `GET /v1/auth/github/redirect?return_to=<własny URL callbacku Local, wraz ze state>`.
2. `GitHubLoginService::start()` w orbit-api zapisuje ten `return_to`
   pod **drugim**, należącym do orbit-api `state` (jego własna ochrona
   CSRF dla rundy z GitHubem — `state` z Local jest w tym momencie dla
   orbit-api tylko nieprzezroczystą częścią URL-a) i przekierowuje do
   prawdziwego URL-a autoryzacji GitHuba.
3. GitHub przekierowuje z powrotem na ustalony na stałe
   `GITHUB_LOGIN_CALLBACK_URL` orbit-api. `GitHubLoginService::callback()`
   wymienia kod, pobiera profil (`GET /user`, z fallbackiem na
   `GET /user/emails` dla prywatnego e-maila — zobacz
   `github-user.client.ts`), generuje losowy, jednorazowy
   `exchange_token` ważny 60 sekund i przekierowuje przeglądarkę z
   powrotem do zapisanego `return_to` (własny callback Local, z jego
   `state` wciąż dołączonym), doklejając `exchange_token`.
4. `callback()` w Local sprawdza swój własny `state` wobec sesji
   (standardowa kontrola CSRF, niezwiązana z krokiem 2), a następnie
   woła `OrbitRelayClient::resolveGithubLoginToken($exchangeToken)` —
   **serwer-do-serwera**, bez uwierzytelnienia (samo posiadanie tokena
   jest autoryzacją, dokładnie jak w przypadku kodu OAuth) — co
   wymienia token dokładnie raz na `GithubIdentityDTO`
   (`githubId`, `githubUsername`, `email`, `name`). Token dostępu
   GitHuba nigdy nie trafia do Local, a sam exchange_token staje się
   bezużyteczny zaraz po pierwszym (i jedynym) użyciu.

`App\Services\GithubOAuthService::loginOrRegister()`/`linkToUser()`/`unlink()`
nie zmieniają się przez to w ogóle — zawsze widzą tylko
`GithubIdentityDTO`, nigdy nie wiedząc ani nie dbając o to, czy
pochodzi on bezpośrednio z Socialite czy przez brokera.
`loginOrRegister()` rozstrzyga, w kolejności: istniejące dopasowanie po
`github_id` (logowanie), dopasowany zweryfikowany e-mail na
niepodlinkowanym koncie (auto-linkowanie — GitHub już udowodnił, że
wywołujący jest właścicielem tego e-maila), albo, gdy żadne z powyższych
nie zachodzi, zupełnie nowe konto bez hasła (kolumna `users.password`
jest nullable właśnie z tego powodu).

**To osobna tożsamość od integracji GitHub App**
(`app/Services/Integrations/Github`). Tamta jest przypisana do
projektu i daje dostęp do repozytorium przez installation token; ta
jest przypisana do użytkownika i tylko udowadnia, że "to konto Orbit
należy do tego konta GitHub". Jedno nie implikuje drugiego — projekt
może być połączony z GitHub bez podlinkowanego konta osobistego
nikogo, a użytkownik może podlinkować swoje konto GitHub, mimo że jego
projekt w ogóle nie ma integracji z GitHub.

## Użycie linku jako bramki gdzie indziej

Podlinkowane konto GitHub jest też używane jako warunek wstępny dla
niepowiązanej akcji: utworzenie brancha lub pull requesta z poziomu
issue (`IssueGithubDevelopmentController::assertGithubAccountLinked()`)
wymaga `$user->github_id !== null`, sprawdzanego **osobno** od
uprawnienia `createGithubDevelopment` (`IssuePolicy`) — uprawnienie
pyta "czy twoja rola na to pozwala", to pytanie brzmi "czy udowodniłeś,
kim jesteś na GitHubie". Przy podobnej bramce w przyszłej funkcji
podążaj za tym wzorcem (mała prywatna metoda-strażnik rzucająca
`ValidationException` z kluczem pola, którego frontend już oczekuje,
np. `branch`/`pullRequest`), zamiast wplatać sprawdzenie tożsamości w
politykę.

## Bezpieczeństwo odlinkowywania

`GithubOAuthService::unlink()` odmawia wyczyszczenia `github_id`, gdy
`users.password` jest puste — konto istniejące tylko dzięki GitHubowi
zostałoby inaczej trwale zablokowane. Strona ustawień Security & Access
(`AccountSettingsSecurityTab`) blokuje z tego samego powodu przycisk
"Unlink", ale to sprawdzenie po stronie backendu faktycznie ma
znaczenie; blokada we frontendzie to tylko UX.
