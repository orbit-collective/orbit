# Integracja z GitHubem

W przeciwieństwie do integracji typu **notify** (webhook) i **import**
(pull) opisanych w innych przewodnikach z tej kategorii, GitHub to
trzeci rodzaj: instalacja GitHub App, połączona przez mały publiczny
serwis relay, która łączy pull request z issue w Orbicie. Ten
przewodnik dokumentuje faktyczną funkcję — architekturę, jak połączyć
projekt, składnię znacznika i rozwiązywanie problemów — a nie "jak
dodać kolejną", ponieważ GitHub jest jedyną integracją tego rodzaju.

## Po co relay

Orbit jest self-hosted, więc typowa instancja Orbit Local nie jest
publicznie dostępna — GitHub nie może dostarczyć webhooka bezpośrednio
do niej. `orbit-api` (mały, osobno hostowany serwis Netlify Functions,
domyślnie `api.orbit-dev.app`) istnieje po to, żeby połączyć tę lukę:

```
GitHub  --webhook-->  orbit-api  <--poll--  Orbit Local  --żądanie komentarza-->  orbit-api  --API GitHub App-->  GitHub
```

1. GitHub wysyła webhook `pull_request` do orbit-api, gdy PR zostaje otwarty.
2. orbit-api weryfikuje podpis webhooka i zapisuje go jako oczekujący
   "event relay", przypisany do połączenia danego projektu.
3. Orbit Local odpytuje orbit-api raz na minutę (`PollGithubRelayEvents`,
   zaplanowane w `routes/console.php`) o oczekujące eventy.
4. Dla każdego eventu Orbit Local parsuje treść PR-a w poszukiwaniu
   znacznika `<!-- orbit-issue:ID -->`, rozwiązuje issue i zapisuje
   powiązanie.
5. Orbit Local prosi orbit-api o dodanie komentarza potwierdzającego
   na PR-ze, używając tokenu instalacji GitHub App należącego do
   orbit-api — Orbit Local nigdy sam nie posiada tokenu GitHuba ani
   klucza prywatnego GitHub App.
6. Orbit Local potwierdza (ACK) event, co usuwa go z kolejki oczekujących.

Autorytatywnym źródłem kontraktu API jest sam kod orbit-api; ten
przewodnik opisuje wyłącznie stronę Orbit Local.

## Przechowywanie lokalne

Nie ma dedykowanej tabeli dla połączenia z GitHubem — rozszerza ono
ten sam wiersz `project_integrations`, którego używa każda inna
integracja (zobacz zasadę "nigdy nie dodawaj schematu specyficznego
dla integracji" z [przewodnika 05](./05-add-an-import-integration.md)),
z kolumnami specyficznymi dla GitHuba (`github_status`,
`github_relay_token`, `github_installation_id`,
`github_repository_owner`/`github_repository_name` itd.) dodanymi przez
migrację. `github_relay_token` jest szyfrowany at rest (cast
`'encrypted'` na `App\Models\ProjectIntegration`) i nigdy nie trafia do
żadnego propsa Inertii — strona ustawień otrzymuje wyłącznie mały DTO
statusu (`GithubIntegrationService::getConnectStatus()`).

Samo powiązanie PR ↔ issue korzysta z `external_issue_links` (tej samej
tabeli, której używa integracja importu z Jiry do deduplikacji),
oznaczonej `external_type = 'github_pull_request'`. Jej unikalny
constraint na `(project_integration_id, external_id)` — gdzie
`external_id` to własny numeryczny identyfikator pull requesta z
GitHuba — sprawia, że ponowne połączenie tego samego PR-a (np. przy
ponowionym evencie relay) jest idempotentne zamiast tworzyć duplikat
wiersza.

## Zmienne środowiskowe

```
ORBIT_API_URL=https://api.orbit-dev.app
```

Ustawiane w `.env`/`.env.example` i odczytywane przez
`config('services.orbit_api.url')` (`config/services.php`) — nigdy nie
zaszywaj tego URL-a na sztywno w serwisie. Wskaż tutaj self-hostowaną
instancję orbit-api, jeśli nie korzystasz z domyślnej.

## Łączenie projektu

1. Ustawienia projektu → Integracje → GitHub → **Connect with GitHub**.
2. Orbit Local prosi orbit-api o utworzenie połączenia
   (`GithubIntegrationService::connect()`), zapisuje identyfikator
   połączenia i token relay (zaszyfrowany) oraz otwiera zwrócony URL
   instalacji GitHub App w nowej karcie.
3. Strona ustawień odpytuje w tle (`WorkspaceSettingsIntegrationsTab`,
   co ~2 sekundy, rezygnując po 5 minutach), dopóki połączenie jest w
   stanie `pending`.
4. Gdy instalacja GitHub App zakończy się i wybrane zostanie dokładnie
   jedno repozytorium, orbit-api oznacza połączenie jako `connected`;
   kolejne odpytanie to wychwytuje i UI pokazuje połączone repozytorium.

**Disconnect** unieważnia połączenie w orbit-api i oznacza lokalny
wiersz jako `revoked` — nie odinstalowuje GitHub App z organizacji na
GitHubie (zobacz [ograniczenia](#ograniczenia-mvp)).

## Składnia znacznika

Jedynym wspieranym sposobem powiązania pull requesta z issue w Orbicie
jest ukryty znacznik w opisie PR-a:

```
<!-- orbit-issue:213769 -->
```

- **Brak znacznika** → event jest ignorowany (potwierdzany, bez ponawiania).
- **Dokładnie jeden znacznik** → dane issue jest rozwiązywane i
  łączone, o ile należy do tego samego projektu w Orbicie, z którym
  połączona jest integracja GitHub. Issue z innego projektu nigdy nie
  zostanie powiązane.
- **Dwa lub więcej znaczników** → traktowane jako niejednoznaczne. Nic
  nie zostaje powiązane, a niejednoznaczność jest logowana
  diagnostycznie. To wynik trwały, a nie przejściowy błąd — event i
  tak zostaje potwierdzony (ACK).

Nie ma żadnego fallbacku: brak parsowania tytułu, brancha czy
wiadomości commitów. Zobacz
`App\Services\Integrations\Github\GithubMarkerParser`.

## Semantyka potwierdzania (ACK)

Event zostaje potwierdzony (usunięty z kolejki oczekujących), gdy
`GithubRelayEventProcessor::process()` zwróci wynik bez rzucenia
wyjątku — obejmuje to zarówno udane powiązanie, jak i każdy z
powyższych trwale-nieprawidłowych przypadków (brak znacznika,
niejednoznaczność, brak issue, zły projekt, nieobsługiwany
event/akcja). Błąd **przejściowy** — niedostępne orbit-api, nieudane
żądanie komentarza, błąd bazy danych — powoduje, że `process()` rzuca
wyjątek, a `PollGithubRelayEvents` celowo nie potwierdza w takim
przypadku eventu: pozostaje on oczekujący i zostanie ponowiony przy
kolejnym odpytaniu. Nie ma osobnej infrastruktury kolejki ponowień —
mechanizmem ponawiania jest sam stan "oczekujący" po stronie relay.

## Ograniczenia MVP

- Obsługiwany jest wyłącznie `pull_request.opened` — edycje,
  zamknięcia, merge'e, review'y i CI/check runs nie są synchronizowane.
- Jedno połączenie z GitHubem na projekt w Orbicie, jedno repozytorium
  na połączenie i jedno issue w Orbicie na pull request.
- Brak automatyzacji statusu: powiązanie PR-a nigdy nie zmienia statusu
  issue ani go nie zamyka.
- Brak synchronizacji komentarzy w żadną stronę poza pojedynczym
  komentarzem potwierdzającym, który orbit-api publikuje raz.
- Rozłączenie w Orbicie nie odinstalowuje GitHub App z GitHuba — tylko
  sprawia, że Orbit Local przestaje ufać temu połączeniu.

## Rozwiązywanie problemów

**Połączenie utknęło na "pending"** — instalacja GitHub App nigdy nie
została ukończona albo ukończono ją z zerem lub więcej niż jednym
wybranym repozytorium (orbit-api wymaga dokładnie jednego). Otwórz
ponownie stronę instalacji z panelu integracji i spróbuj jeszcze raz.

**Połączenie pokazuje "revoked" i nie da się połączyć ponownie** —
kliknij ponownie **Connect with GitHub**; zawsze tworzy to zupełnie
nowe połączenie w orbit-api zamiast próbować wznowić stare.

**PR nie zostaje powiązany** — sprawdź, czy znacznik ma dokładnie
postać `<!-- orbit-issue:ID -->` z numerycznym id, występuje dokładnie
raz w opisie PR-a, a identyfikator issue należy do tego samego
projektu w Orbicie, co połączone repozytorium. Sprawdź też, czy status
połączenia to `connected`, a nie `pending`.

**Eventy się nie przetwarzają** — upewnij się, że scheduler faktycznie
działa (procesy queue/schedule z `composer dev` albo wpis crona w
produkcji dla `php artisan schedule:run`); `PollGithubRelayEvents`
uruchamia się raz na minutę tylko wtedy, gdy coś wywołuje scheduler
Laravela.

## Uwagi bezpieczeństwa

- Orbit Local posiada wyłącznie token relay orbit-api — nigdy nie
  otrzymuje ani nie przechowuje tokenu GitHuba ani klucza prywatnego
  GitHub App. Te sekrety żyją wyłącznie w orbit-api.
- Orbit Local nigdy nie wywołuje bezpośrednio REST API GitHuba;
  wszystkie akcje wymagające uwierzytelnienia w GitHubie (publikacja
  komentarza potwierdzającego) są proxowane przez orbit-api przy
  użyciu jego własnego tokenu instalacji GitHub App.
- `github_relay_token` jest szyfrowany at rest i nigdy nie jest
  logowany ani wysyłany na frontend.
