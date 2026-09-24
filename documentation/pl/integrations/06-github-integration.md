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

1. GitHub wysyła webhook `pull_request` do orbit-api dla wspieranej
   akcji — `opened`, `reopened`, `closed` albo `synchronize`.
2. orbit-api weryfikuje podpis webhooka i zapisuje go jako oczekujący
   "event relay", przypisany do połączenia danego projektu.
3. Orbit Local odpytuje orbit-api raz na minutę (`PollGithubRelayEvents`,
   zaplanowane w `routes/console.php`) o oczekujące eventy.
4. Dla eventu `opened` Orbit Local parsuje treść PR-a w poszukiwaniu
   znacznika `<!-- orbit-issue:ID -->`, rozwiązuje issue i zapisuje
   powiązanie. Dla `reopened`/`closed`/`synchronize` Orbit Local
   zamiast tego szuka *istniejącego* powiązania po własnych, stabilnych
   identyfikatorach GitHuba (zobacz
   [Synchronizacja cyklu życia pull requesta](#synchronizacja-cyklu-%C5%BCycia-pull-requesta)
   poniżej) i nigdy nie parsuje znacznika ponownie.
5. Tylko `opened` wywołuje komentarz potwierdzający na PR-ze, przy
   użyciu tokenu instalacji GitHub App należącego do orbit-api — Orbit
   Local nigdy sam nie posiada tokenu GitHuba ani klucza prywatnego
   GitHub App i nigdy nie publikuje komentarza dla eventu cyklu życia.
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

Ten sam wiersz przechowuje też tytuł PR-a, branch źródłowy/docelowy,
`status` i flagę `draft` (`pull_request_title`, `source_branch`,
`target_branch`, `status`, `draft` — wszystkie nullable), a od v0.9.3
także `github_updated_at` i `merged_at` (również nullable). Powiązanie
utworzone przed dodaniem tych kolumn po prostu ma w nich nulle; panel
Development na stronie issue (`IssueDevelopmentPanel`) renderuje się
mimo brakujących pól zamiast rzucać błąd, a nic nie uzupełnia starych
wierszy danymi z GitHuba. Ponowne przetworzenie eventu nigdy nie
nadpisuje już zapisanych metadanych nullem — zobacz filtrowanie nulli
w `GithubRelayEventProcessor` przed wywołaniem `upsertFor()`/`touch()`.

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

Znacznik służy wyłącznie do *pierwszego* powiązania, przy `opened`.
Event `reopened`/`closed`/`synchronize` nigdy nie parsuje go ponownie
— zobacz następną sekcję.

## Synchronizacja cyklu życia pull requesta

Po powiązaniu pull requesta Orbit Local utrzymuje jego `status`
aktualny, reagując na kolejne eventy webhooka, nigdy nie dotykając
przy tym ponownie znacznika:

| Akcja GitHuba | Wynikowy `status` | Uwagi |
| --- | --- | --- |
| `reopened` | `open` | |
| `closed`, `merged: false` | `closed` | GitHub używa `closed` zarówno dla zwykłego zamknięcia, jak i mergea; to własne pole `merged` z payloadu (nigdy nazwy branchy, commity ani znaczniki czasu) decyduje, o który przypadek chodzi. |
| `closed`, `merged: true` | `merged` | `merged_at` jest zapisywane, jeśli GitHub je dostarcza. |
| `synchronize` | bez zmian | Do brancha PR-a zostały wypchnięte nowe commity. Odświeżany jest tylko tytuł/branche/draft — żadna lista ani liczba commitów nie jest zapisywana. |

Wyszukiwanie odbywa się po własnych, stabilnych identyfikatorach
GitHuba — połączeniu (które implikuje repozytorium) plus numerycznym
id pull requesta — nigdy przez ponowne parsowanie treści PR-a, tytułu,
nazwy brancha czy samego numeru PR-a. Event cyklu życia dla pull
requesta, którego Orbit nigdy nie powiązał (nigdy nie przetworzono dla
niego eventu `opened`, albo jego znacznik się nie rozwiązał), zostaje
potwierdzony (ACK) i zignorowany: nigdy nie wyzwala powiązania opartego
o znacznik ani nie tworzy nowego powiązania. Zobacz
`GithubRelayEventProcessor::handleLifecycleEvent()`.

Event cyklu życia nigdy nie publikuje ani nie edytuje komentarza bota,
nigdy nie tworzy nowego powiązania pull requesta i nigdy nie zmienia
własnego statusu workflow powiązanego issue w Orbicie — to wydanie
dotyczy wyłącznie synchronizacji. Automatyczne zmiany statusu issue w
Orbicie na podstawie stanu pull requesta to świadomy brak celu tego
wydania.

**Ochrona przed nieaktualnymi eventami.** GitHub nie gwarantuje
kolejności dostarczania webhooków. Każdy event relay niesie własny
`updated_at` pull requesta z GitHuba (zapisywany lokalnie jako
`github_updated_at`); nadchodzący event cyklu życia, którego
`updated_at` jest starsze niż aktualnie zapisane na powiązaniu, jest
ignorowany (potwierdzany, ale nie stosowany), zamiast cofać nowszy
stan — np. event `synchronize`, który dotrze już po zmergowaniu pull
requesta, nie przełącza statusu z powrotem na `open`. Powiązanie bez
`github_updated_at` (utworzone przed v0.9.3 albo nigdy jeszcze nie
zsynchronizowane w cyklu życia) nie ma z czym porównać, więc pierwszy
event cyklu życia dla niego zawsze jest stosowany.

Stan jest tu **eventually consistent**, nie w czasie rzeczywistym:
odzwierciedla ostatni event relay, który Orbit Local odpytał i
przetworzył, a nie żywy stan na GitHubie w chwili, gdy patrzysz na
issue.

## Semantyka potwierdzania (ACK)

Event zostaje potwierdzony (usunięty z kolejki oczekujących), gdy
`GithubRelayEventProcessor::process()` zwróci wynik bez rzucenia
wyjątku — obejmuje to udane powiązanie, udaną synchronizację cyklu
życia, jak i każdy z trwale-nieprawidłowych przypadków (brak
znacznika, niejednoznaczność, brak issue, zły projekt, nieobsługiwany
event/akcja, event cyklu życia dla niepowiązanego PR-a albo nieaktualny
event cyklu życia). Błąd **przejściowy** — niedostępne orbit-api,
nieudane żądanie komentarza, błąd bazy danych — powoduje, że
`process()` rzuca wyjątek, a `PollGithubRelayEvents` celowo nie
potwierdza w takim przypadku eventu: pozostaje on oczekujący i zostanie
ponowiony przy kolejnym odpytaniu. Nie ma osobnej infrastruktury
kolejki ponowień — mechanizmem ponawiania jest sam stan "oczekujący"
po stronie relay.

## Niezawodność i stan zdrowia

Każda synchronizacja — zaplanowana czy ręczna — przechodzi przez jeden
wspólny `GithubIntegrationSynchronizer::sync()`, który zapisuje wynik w
wierszu `project_integrations` danego projektu: `github_last_sync_attempt_at`
(każda próba), `github_last_synced_at` (ostatni w pełni udany cykl),
`github_last_failed_sync_at`/`github_last_error_code`/`github_last_error_message`
(ostatni błąd, jeśli wystąpił) oraz `github_consecutive_failures`.
`GithubIntegrationHealthService` wylicza na tej podstawie jeden z
czterech stanów — sam nigdy nie jest zapisywany, więc nie może
rozjechać się z danymi, na których się opiera:

| Stan | Znaczenie | Kiedy widoczny |
| --- | --- | --- |
| **Healthy** | Połączone, ostatnia synchronizacja się powiodła. | `connected`, zero kolejnych błędów. |
| **Degraded** | Połączone, ale ostatnia synchronizacja zawiodła przejściowo (sieć, niedostępność orbit-api, chwilowy błąd GitHuba). | `connected`, co najmniej jeden kolejny błąd, brak trwałego kodu błędu. |
| **Error** | Połączone lokalnie, ale sam token relay albo połączenie jest nieużywalne (np. `INVALID_RELAY_TOKEN`). | `connected`, ostatni błąd to trwały kod na poziomie tokenu/połączenia. |
| **Revoked** | Połączenie zostało jawnie unieważnione, lokalnie albo przez orbit-api. | status połączenia to `revoked`. |

Nie ma numerycznego wyniku "zdrowia" ani heurystyki opartej na czasie —
wyłącznie status połączenia, ostatni kod błędu i licznik błędów, które
i tak są już śledzone.

**Retry sync** (widoczne dla integracji w stanie degraded) uruchamia
dokładnie ten sam synchronizator, którego używa scheduler, poprzez
`POST .../integrations/github/retry` — nie ma osobnej ścieżki kodu dla
ręcznej synchronizacji. Równoczesne synchronizacje tej samej integracji
są blokowane krótkotrwałym `Cache::lock("github-sync:{id}", 55)`; jeśli
zaplanowany poll i ręczny retry trafią w ten sam moment, drugi z nich
zostaje pominięty zamiast uruchamiać się podwójnie.

**Reconnect** (widoczne dla integracji w stanie error albo revoked)
korzysta z tego samego flow co pierwsze połączenie — zawsze prosi o
zupełnie nowe połączenie w orbit-api i czyści każde pole niezawodności,
więc historia błędów poprzedniego połączenia nigdy się nie przenosi.
Jeśli orbit-api zgłosi `CONNECTION_REVOKED` podczas synchronizacji,
Orbit Local sam oznacza połączenie jako unieważnione (nie tylko
wyświetla błąd) — scheduler przestaje wtedy automatycznie je odpytywać,
ponieważ synchronizuje wyłącznie integracje `connected`.

**Przejściowa niedostępność orbit-api** nigdy nie potwierdza (ACK)
eventu relay będącego w trakcie przetwarzania (bez zmian względem
semantyki ACK z MVP) i nigdy nie dotyka dostępu GitHub App — gdy
orbit-api znów będzie dostępne, kolejna zaplanowana synchronizacja (lub
ręczny retry) podejmie oczekujący event na nowo, a stan zdrowia wróci
do Healthy.

**Nieaktualny event relay** — potwierdzenie (ACK) udaje się lokalnie,
ale orbit-api zgłasza `EVENT_EXPIRED` albo `EVENT_NOT_FOUND` już po
tym, jak PR został powiązany, a komentarz zażądany — jest traktowane
jako zakończony wynik, a nie błąd: faktyczna praca już się wydarzyła,
tylko własny rekord orbit-api wygasł albo zniknął pierwszy.

## Ograniczenia MVP

- Obsługiwane są wyłącznie `pull_request.opened`, `reopened`, `closed`
  i `synchronize` — `edited` (w tym sama edycja tytułu), review'y,
  requested reviewers, etykiety, przypisania i CI/check runs nie są
  synchronizowane. Tytuł/branche PR-a odświeżają się tylko okazjonalnie,
  jako efekt uboczny eventu cyklu życia, który już je niesie, a nie
  natychmiast, gdy ktoś edytuje sam tytuł na GitHubie.
- Jedno połączenie z GitHubem na projekt w Orbicie, jedno repozytorium
  na połączenie i jedno issue w Orbicie na pull request.
- Brak automatyzacji statusu: cykl życia pull requesta (otwarcie,
  zmergowanie, zamknięcie, ponowne otwarcie) nigdy nie zmienia
  własnego statusu workflow powiązanego issue w Orbicie ani go nie
  zamyka — zobacz
  [Synchronizacja cyklu życia pull requesta](#synchronizacja-cyklu-%C5%BCycia-pull-requesta).
  Tego typu automatyzacja ma pojawić się później jako część Workspace
  Automation, nie w tym wydaniu.
- Brak śledzenia na poziomie commitów: `synchronize` odświeża tylko
  istniejący snapshot metadanych, nigdy listę ani liczbę commitów.
- Brak synchronizacji komentarzy w żadną stronę poza pojedynczym
  komentarzem potwierdzającym, który orbit-api publikuje raz przy
  `opened` — event cyklu życia nigdy nie publikuje ani nie edytuje
  komentarza.
- Brak pełnej historii cyklu życia: przechowywany i pokazywany jest
  tylko aktualnie znany stan pull requesta, a nie oś czasu przeszłych
  przejść.
- Rozłączenie w Orbicie nie odinstalowuje GitHub App z GitHuba — tylko
  sprawia, że Orbit Local przestaje ufać temu połączeniu.

## Rozwiązywanie problemów

**Połączenie utknęło na "pending"** — instalacja GitHub App nigdy nie
została ukończona albo ukończono ją z zerem lub więcej niż jednym
wybranym repozytorium (orbit-api wymaga dokładnie jednego). Otwórz
ponownie stronę instalacji z panelu integracji i spróbuj jeszcze raz.

**Połączenie pokazuje "revoked" i nie da się połączyć ponownie** —
kliknij **Reconnect**; zawsze tworzy to zupełnie nowe połączenie w
orbit-api zamiast próbować wznowić stare.

**PR nie zostaje powiązany** — sprawdź, czy znacznik ma dokładnie
postać `<!-- orbit-issue:ID -->` z numerycznym id, występuje dokładnie
raz w opisie PR-a, a identyfikator issue należy do tego samego
projektu w Orbicie, co połączone repozytorium. Sprawdź też, czy status
połączenia to `connected`, a nie `pending`, oraz sprawdź plakietkę
zdrowia i panel diagnostyczny pod kątem zapisanego błędu, zanim
uznasz, że problemem jest sam znacznik.

**Integracja pokazuje Degraded** — przejściowy błąd ostatniej
synchronizacji (niedostępność orbit-api, chwilowy błąd GitHuba).
Sprawdź komunikat błędu i znaczniki czasu "Last attempt"/"Last
successful sync" w panelu diagnostycznym, a następnie albo poczekaj na
kolejną zaplanowaną synchronizację, albo kliknij **Retry sync**.

**Integracja pokazuje "Needs attention" (Error)** — sam token relay
albo połączenie jest już nieużywalne (trwały błąd, np. nieprawidłowy
token). Ponawianie nic tu nie da; kliknij **Reconnect**.

**Eventy w ogóle się nie przetwarzają** — upewnij się, że coś faktycznie
wywołuje scheduler Laravela: stos Docker Compose ma dedykowany serwis
`scheduler` uruchamiający `php artisan schedule:work`
(`docker-compose.yml`), a w wdrożeniu bez Dockera — wpis crona
wywołujący `php artisan schedule:run` co minutę. `PollGithubRelayEvents`
nigdy nie uruchamia się samo bez jednego z nich.

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
- **Granica zaufania:** każdy członek projektu w Orbicie widzi
  metadane powiązanego pull requesta (tytuł, branch źródłowy/docelowy,
  status) na stronie issue, niezależnie od tego, czy ta konkretna
  osoba ma dostęp do repozytorium na GitHubie. Instalacja GitHub App
  jest per-projekt, nie per-użytkownik — Orbit Local nie ma pojęcia o
  indywidualnej tożsamości ani uprawnieniach danego użytkownika na
  GitHubie, więc nie może sprawdzić "czy ten konkretny użytkownik
  Orbita ma dostęp do tego repo na GitHubie" przed wyrenderowaniem
  panelu Development. Tak było już od MVP dla samego labela/URL-a PR-a
  — teraz to samo dotyczy bogatszych metadanych dodanych dla panelu
  Development. Autoryzacja per-użytkownik wymagałaby GitHub OAuth dla
  każdego użytkownika Orbita, co jest planowane na przyszłe wydanie,
  ale jeszcze nie istnieje — do tego czasu traktuj podłączenie
  prywatnego repozytorium do projektu w Orbicie jako udostępnienie
  metadanych powiązanych PR-ów całemu zespołowi projektu.
