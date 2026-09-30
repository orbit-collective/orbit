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

`App\Services\GithubOAuthService` to jedyne miejsce, gdzie faktycznie
zapadają decyzje logowania/łączenia/odłączania konta;
`App\Http\Controllers\Auth\GithubAuthController` to cienki kontroler z
dwiema akcjami (`redirect()`/`callback()` przez
`Laravel\Socialite\Facades\Socialite`, plus `unlink()`), który
rozgałęzia się na podstawie `$request->user()` — **ta sama** trasa
`/auth/github/callback` obsługuje zarówno gościa logującego się, jak i
już zalogowanego użytkownika łączącego swoje konto z poziomu Ustawień,
ponieważ przepływowi OAuth Socialite i tak nie zależy, kto go wywołuje.
`loginOrRegister()` rozstrzyga, w kolejności: istniejące dopasowanie po
`github_id` (logowanie), dopasowany zweryfikowany e-mail na
niepodlinkowanym koncie (auto-linkowanie — GitHub już udowodnił, że
wywołujący jest właścicielem tego e-maila), albo, gdy żadne z powyższych
nie zachodzi, zupełnie nowe konto bez hasła (kolumna `users.password`
jest nullable właśnie z tego powodu). Tożsamość GitHub nigdy nie jest
sekretem, który Orbit musiałby chronić: żaden access token nie jest
w ogóle zapisywany, tylko `github_id` (unikalny, używany do
wyszukiwania konta) i `github_username` (tylko do wyświetlania) w
tabeli `users`.

**To osobna tożsamość od integracji GitHub App**
(`app/Services/Integrations/Github`, zobacz
[`../integrations/06-github-integration.md`](../integrations/06-github-integration.md)).
Tamta jest przypisana do projektu i daje dostęp do repozytorium przez
installation token; ta jest przypisana do użytkownika i tylko
udowadnia, że "to konto Orbit należy do tego konta GitHub". Jedno nie
implikuje drugiego — projekt może być połączony z GitHub bez
podlinkowanego konta osobistego nikogo, a użytkownik może podlinkować
swoje konto GitHub, mimo że jego projekt w ogóle nie ma integracji z
GitHub.

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
