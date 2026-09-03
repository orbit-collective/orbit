# Dodaj integrację typu import

Przećwiczony przykład: zamiana **Linear** z zablokowanej karty "coming
soon" w katalogu w w pełni działającą integrację typu **import**,
dokładnie tak, jak dziś działa Jira. To jest **wejściowy/pull**
odpowiednik przewodnika 1 (integracje typu notify wysyłające webhooki,
jak Discord/Slack) — zupełnie osobna oś, z własnym kontraktem,
rejestrem i kształtem panelu ustawień. Jeśli jeszcze tego nie zrobiłeś,
przeczytaj wstęp przewodnika 1, żeby rozróżnienie było jasne, zanim
zaczniesz:

- **Integracje notify** (Discord, Slack, ...) reagują na event domenowy
  (`IssueCreated`, `CommentAdded`, ...) i wypychają wiadomość na
  zewnątrz przez webhook. Jeden `IntegrationNotifier` na integrację,
  rozwiązywany przez `IntegrationNotifierRegistry`, wywoływany przez
  `NotifyProjectIntegrationsListener`.
- **Integracje import** (dziś: Jira; Linear, Asana, Trello to na razie
  same wpisy w katalogu) ściągają issues/epiki/subtaski *do* Orbita z
  zewnętrznego systemu na żądanie użytkownika (przepływ
  "Connect" + "Import"), konwertując statusy/priorytety/etykiety/
  hierarchię zewnętrznego systemu na własny, stały model Orbita. Jeden
  `IntegrationImporter` na integrację, rozwiązywany przez
  `IntegrationImporterRegistry`, wywoływany przez akcję kontrolera,
  która wysyła zakolejkowanego joba — nie ma tu eventu domenowego, na
  który trzeba by reagować, bo nic jeszcze nie wydarzyło się w Orbicie.

Linear ma już wpis w katalogu (`kind: 'import'`, `comingSoon: true`,
bez `importConfig`) i pod-opcje opisujące zachowanie import/sync, więc
ten przewodnik pokrywa zarówno "wpis w katalogu już istnieje, trzeba mu
tylko nadać `importConfig` i podłączyć backend" (każdy krok poniżej),
jak i, w dopisku na końcu Kroku 1, co zrobić, jeśli startujesz bez
żadnego wpisu w katalogu.

## Jedna zasada, która ma największe znaczenie

**Nigdy nie dodawaj schematu specyficznego dla jednej integracji.**
`project_integrations.credentials` (nieprzezroczysty, zaszyfrowany
JSON), `external_issue_links` (deduplikacja/śledzenie) oraz
`integration_field_mappings` (mapowanie status/priorytet/etykieta) są
już generyczne dla każdego importera. Jeśli łapiesz się na tym, że
sięgasz po tabelę `linear_issue_links` albo `linear_field_mappings` —
zatrzymaj się, duplikujesz coś, co już istnieje. Dodanie Lineara
powinno dotknąć **zero nowych migracji**. Jedyny naprawdę nowy kod to
"jak rozmawiać z API Lineara" i "jak zmapować JSON-a Lineara na
`ExternalIssueDTO`" — wszystko za tą granicą
(`ImportOrchestratorService`, rozwiązywanie hierarchii przez
`Issue::parent_id`, deduplikacja, mapowanie pól) jest już zbudowane i
przetestowane na kształcie Jiry.

## Krok 1 — Dodaj `importConfig` do wpisu w katalogu

Plik: `resources/js/types/Integrations.ts`

Wpis Lineara w katalogu już istnieje z `kind: 'import'`, ale bez
`importConfig` (na razie tylko Jira ma go wypełnionego). Nadaj mu go,
zachowując dokładnie ten sam kształt, jakiego używa Jira:

```ts
{
    id: 'linear',
    name: 'Linear',
    vendor: 'By Linear Orbit, Inc.',
    category: 'Productivity',
    brand: 'linear',
    accentClassName: 'bg-[#5E6AD2]/15',
    websiteUrl: 'https://linear.app',
    description: 'Import and sync issues between Orbit and Linear.',
    overview:
        'Connect Linear to import existing issues or keep two teams working across both tools in sync, without losing history on either side.\n\n**What you get:**\n- One-time or ongoing issue import from Linear\n- Two-way status sync for linked issues\n- Cycle and priority mapping',
    previewSamples: [
        {
            title: '12 issues imported from Linear team "Core"',
            time: 'Just now',
        },
        {
            title: 'Status synced from Linear for issue #142',
            time: '18m ago',
        },
    ],
    subOptions: [
        {
            id: 'issue-import',
            title: 'Issue import',
            description: 'Import existing Linear issues into a project.',
        },
        {
            id: 'status-sync',
            title: 'Status sync',
            description: 'Keep issue status in sync in both directions.',
        },
    ],
    kind: 'import',
    importConfig: {
        credentialFields: [
            {
                id: 'api_key',
                label: 'Linear API key',
                type: 'password',
            },
        ],
        mappingTypes: ['status', 'priority', 'label'],
    },
    comingSoon: true, // <- odwróć to w ostatnim kroku, gdy wszystko będzie podłączone
},
```

Uwagi:
- `importConfig.credentialFields[].id` staje się kluczem wewnątrz
  `project_integrations.credentials` (zobacz Krok 5) — Linear potrzebuje
  tylko jednego pola (osobistego klucza API, w przeciwieństwie do
  trzech pól Jiry), a `WorkspaceSettingsImportPanel.tsx` renderuje tyle
  pól, ile tu wymienisz, bez żadnych dalszych zmian na froncie.
- `importConfig.mappingTypes` decyduje, które tabele mapowań w panelu
  się renderują. Tylko `status` i `priority` faktycznie pokazują dziś
  tabelę, bo to dwa rodzaje metadanych zewnętrznych, jakie
  `IntegrationImporter::fetchMappingMetadata()` może z góry enumerować
  (zobacz Krok 3) — mapowania `label` stosują się automatycznie w
  trakcie importu (niezmapowana zewnętrzna etykieta/komponent jest po
  prostu pomijana, bo enum `IssueLabel` w Orbicie to mały, stały zbiór),
  na razie nie ma dla nich UI przed importem.
- Istniejące `subOptions` (`issue-import`, `status-sync`) to na razie
  czysto kosmetyczny opis dla wpisów `kind: 'import'` — nie są czytane
  przez żaden kod backendu (w przeciwieństwie do `subOptions` integracji
  `kind: 'notify'`, które mapują się 1:1 na klucze
  `ProjectIntegration.options`).

Jeśli startujesz **bez żadnego wpisu w katalogu**: dodaj nowego członka
unii `IntegrationId`, `case` w `BrandIcon` (zobacz przewodnik 1, Krok 1)
oraz cały ten obiekt z `kind: 'import'` od zera.

## Krok 2 — Napisz klienta API

Nowy plik: `app/Services/Integrations/Linear/LinearApiClient.php`

Cienki wrapper wokół API HTTP zewnętrznego systemu — nic tutaj nie wie
o modelu domenowym Orbita. Zbuduj swojego w tym samym kształcie, co
poniższy realny, kompletny wzorzec (to jest faktyczny kod w repo dziś,
nie szablon — przeczytaj go, potem dostosuj, nie kopiuj namespace'u/nazwy
klasy `Jira`):

Wzorzec: `app/Services/Integrations/Jira/JiraApiClient.php`

```php
<?php

namespace App\Services\Integrations\Jira;

use App\Models\ProjectIntegration;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Thin Jira Cloud REST API (v3) wrapper, Basic Auth (email + API token) per
 * ProjectIntegration::credentials. Never logs the credentials themselves or
 * a raw response body (which may carry sensitive issue content) — only the
 * request path and response status, mirroring SendWebhookNotificationJob's
 * secret-redaction convention.
 */
class JiraApiClient
{
    public function testConnection(ProjectIntegration $projectIntegration): bool
    {
        try {
            return $this->client($projectIntegration)->get('/rest/api/3/myself')->successful();
        } catch (ConnectionException) {
            return false;
        }
    }

    public function getIssueTypes(ProjectIntegration $projectIntegration): array
    {
        return $this->getJson($projectIntegration, '/rest/api/3/issuetype');
    }

    public function getStatuses(ProjectIntegration $projectIntegration): array
    {
        return $this->getJson($projectIntegration, '/rest/api/3/status');
    }

    public function getPriorities(ProjectIntegration $projectIntegration): array
    {
        return $this->getJson($projectIntegration, '/rest/api/3/priority');
    }

    /**
     * One page of a JQL search via /rest/api/3/search/jql — the endpoint
     * that replaced the deprecated GET/POST /rest/api/3/search (which now
     * returns HTTP 410 Gone on every Jira Cloud site). That old endpoint's
     * offset pagination (startAt/total) is gone too: this one is cursor-based
     * — pass back whatever "nextPageToken" the previous page returned, and
     * there is no next page once the response omits that key entirely.
     * Expands each issue's parent link so the caller (JiraIntegrationImporter)
     * can resolve epic/subtask hierarchy.
     */
    public function searchIssues(ProjectIntegration $projectIntegration, string $jql, ?string $nextPageToken = null, int $maxResults = 50): array
    {
        $query = [
            'jql' => $jql,
            'maxResults' => $maxResults,
            'fields' => 'summary,description,status,priority,issuetype,parent,labels,components,assignee,duedate',
        ];

        if ($nextPageToken !== null) {
            $query['nextPageToken'] = $nextPageToken;
        }

        return $this->getJson($projectIntegration, '/rest/api/3/search/jql', $query);
    }

    private function getJson(ProjectIntegration $projectIntegration, string $path, array $query = []): array
    {
        try {
            $response = $this->client($projectIntegration)->get($path, $query);
        } catch (ConnectionException) {
            Log::warning('Jira API request failed to connect', ['path' => $path]);

            throw new RuntimeException("Jira API request failed to connect: $path");
        }

        if ($response->failed()) {
            Log::warning('Jira API request failed', [
                'path' => $path,
                'status' => $response->status(),
            ]);

            $response->throw();
        }

        return $response->json();
    }

    private function client(ProjectIntegration $projectIntegration): PendingRequest
    {
        $credentials = $projectIntegration->credentials ?? [];

        return Http::baseUrl(rtrim($credentials['instance_url'] ?? '', '/'))
            ->withBasicAuth($credentials['email'] ?? '', $credentials['api_token'] ?? '')
            ->acceptJson()
            ->timeout(10);
    }
}
```

Twój odpowiednik dla Lineara czyta `$projectIntegration->credentials['api_key']`
i ustawia nagłówek bearer/`Authorization` zamiast `withBasicAuth()`
(prawdziwe API Lineara jest GraphQL, nie REST, więc kształt `getJson()`
zmieniłby się w pojedynczą metodę `query()` wysyłającą dokument GraphQL
— ważne jest zachowanie: jeden builder `client()` czytający credentiale
z modelu, każda inna metoda przechodząca przez niego, i każda ścieżka
błędu logująca path/status/nazwę query, ale nigdy klucz API).

## Krok 3 — Napisz `IntegrationImporter`

Nowy plik: `app/Services/Integrations/Linear/LinearIntegrationImporter.php`

To jest klasa, która tłumaczy kształt zewnętrznego systemu na
`ExternalIssueDTO` — **jedyne** miejsce, w którym nazwy pól Lineara
powinny się w ogóle pojawić w kodzie. Zbuduj swoją w tym samym
kształcie, co poniższy realny, kompletny wzorzec (znowu — dostosuj
namespace/nazwę klasy oraz samą logikę mapowania pól, nie kopiuj
ścieżek pól Jiry):

Wzorzec: `app/Services/Integrations/Jira/JiraIntegrationImporter.php`

```php
<?php

namespace App\Services\Integrations\Jira;

use App\Contracts\IntegrationImporter;
use App\DataTransferObjects\ExternalIssueDTO;
use App\Models\ProjectIntegration;
use Generator;

/**
 * Translates Jira's REST API shape into the source-agnostic ExternalIssueDTO
 * once, here — nothing past this class knows Jira's field paths
 * (fields.issuetype.name, fields.parent.id, ADF descriptions, ...).
 */
class JiraIntegrationImporter implements IntegrationImporter
{
    private const int PAGE_SIZE = 50;

    public function __construct(protected JiraApiClient $jiraApiClient) {}

    public function testConnection(ProjectIntegration $projectIntegration): bool
    {
        return $this->jiraApiClient->testConnection($projectIntegration);
    }

    public function fetchMappingMetadata(ProjectIntegration $projectIntegration): array
    {
        return [
            'statuses' => $this->toMetadataOptions($this->jiraApiClient->getStatuses($projectIntegration)),
            'priorities' => $this->toMetadataOptions($this->jiraApiClient->getPriorities($projectIntegration)),
            'issueTypes' => $this->toMetadataOptions($this->jiraApiClient->getIssueTypes($projectIntegration)),
        ];
    }

    /**
     * $options['project_key'] selects the Jira project to pull from;
     * $options['jql'] can override the query entirely for callers that need
     * more control (e.g. re-importing a specific set of issues).
     *
     * @return Generator<ExternalIssueDTO>
     */
    public function fetchIssues(ProjectIntegration $projectIntegration, array $options = []): Generator
    {
        $jql = $options['jql'] ?? 'project = "'.($options['project_key'] ?? '').'" ORDER BY key ASC';

        $nextPageToken = null;

        do {
            $page = $this->jiraApiClient->searchIssues($projectIntegration, $jql, $nextPageToken, self::PAGE_SIZE);
            $issues = $page['issues'] ?? [];

            foreach ($issues as $issue) {
                yield $this->mapIssue($projectIntegration, $issue);
            }

            $nextPageToken = $page['nextPageToken'] ?? null;
        } while ($issues !== [] && $nextPageToken !== null);
    }

    private function mapIssue(ProjectIntegration $projectIntegration, array $issue): ExternalIssueDTO
    {
        $fields = $issue['fields'] ?? [];

        $labels = array_values(array_filter([
            ...($fields['labels'] ?? []),
            ...array_map(fn (array $component) => $component['name'] ?? null, $fields['components'] ?? []),
        ]));

        $instanceUrl = rtrim($projectIntegration->credentials['instance_url'] ?? '', '/');

        return new ExternalIssueDTO(
            externalId: (string) $issue['id'],
            externalKey: $issue['key'] ?? null,
            title: $fields['summary'] ?? '(no title)',
            description: $this->adfToPlainText($fields['description'] ?? null),
            externalStatus: $fields['status']['name'] ?? null,
            externalPriority: $fields['priority']['name'] ?? null,
            externalLabels: $labels,
            type: $fields['issuetype']['name'] ?? null,
            parentExternalId: isset($fields['parent']['id']) ? (string) $fields['parent']['id'] : null,
            assigneeExternalId: $fields['assignee']['accountId'] ?? null,
            assigneeEmail: $fields['assignee']['emailAddress'] ?? null,
            endDate: $fields['duedate'] ?? null,
            url: $instanceUrl && isset($issue['key']) ? "$instanceUrl/browse/{$issue['key']}" : null,
        );
    }

    /**
     * Jira Cloud's v3 API returns `description` as Atlassian Document
     * Format (a nested JSON node tree), not plain text — this walks it and
     * concatenates every text leaf. Best-effort: formatting/marks are
     * dropped, which is an acceptable loss for an imported issue body.
     */
    private function adfToPlainText(mixed $description): ?string
    {
        if ($description === null) {
            return null;
        }

        if (is_string($description)) {
            return $description;
        }

        return $this->extractAdfText($description) ?: null;
    }

    private function extractAdfText(array $node): string
    {
        $text = $node['text'] ?? '';

        foreach ($node['content'] ?? [] as $child) {
            $text .= ($text !== '' ? "\n" : '').$this->extractAdfText($child);
        }

        return trim($text);
    }

    private function toMetadataOptions(array $items): array
    {
        return array_map(fn (array $item) => [
            'value' => $item['name'] ?? $item['id'],
            'label' => $item['name'] ?? $item['id'],
        ], $items);
    }
}
```

To, że `fetchIssues()` jest generatorem PHP, ma znaczenie:
`ImportOrchestratorService::import()` (zobacz uwagę architektoniczną
poniżej) konsumuje go leniwie, po jednym issue naraz, więc projekt z
tysiącami issues nie ładuje ich wszystkich do pamięci, zanim powstanie
pierwszy. API GraphQL Lineara używa własnej konwencji kursora zamiast
`nextPageToken` Jiry, ale kształt jest ten sam: pętla, `yield` dla
każdego zmapowanego DTO, zatrzymanie, gdy API mówi, że nie ma kolejnej
strony.

`parentExternalId` w `fetchIssues()` to jest to, co pozwala
`ImportOrchestratorService` generycznie odtworzyć hierarchię — zmapuj
go z tego, co Linear nazywa relacją issue nadrzędne/podrzędne, używając
tych samych wartości `externalId` (nie `externalKey`), których używasz
dla samego `ExternalIssueDTO::externalId`, bo to na nich opiera się
klucz deduplikacji `ExternalIssueLink`.

## Krok 4 — Zarejestruj ją

Plik: `app/Services/Integrations/IntegrationImporterRegistry.php`

```php
private const array MAP = [
    'jira' => JiraIntegrationImporter::class,
    'linear' => LinearIntegrationImporter::class,
];
```

To jedyne miejsce, w którym pipeline importu sprawdza, która klasa
obsługuje który klucz integracji — dokładne odbicie
`IntegrationNotifierRegistry::MAP`.

## Krok 5 — Credentiale: zwykle nic do dodania

`project_integrations.credentials` to już generyczna, zaszyfrowana
kolumna JSON (cast `'credentials' => 'encrypted:array'` w
`app/Models/ProjectIntegration.php`) — pojedynczy `api_key` Lineara po
prostu staje się `{"api_key": "..."}` zapisanym pod nim, bez potrzeby
migracji. Dodawaj nową migrację tylko wtedy, gdy potrzebujesz typowanego,
przeszukiwalnego (nie-JSON-blob) przechowywania credentiali, czego
żadna integracja typu import nie potrzebowała jak dotąd.

## Krok 6 — Serwis, kontroler i trasy

Nowy plik: `app/Services/Integrations/Linear/LinearIntegrationService.php`

Odzwierciedla metoda po metodzie
`app/Services/Integrations/Jira/JiraIntegrationService.php`: `connect()`
(zapisuje credentiale, wywołuje `testConnection()`, rzuca
`ValidationException` przy niepowodzeniu), `getMappingMetadata()`,
`saveMappings()`, `triggerImport()` (wysyła zakolejkowanego joba —
zobacz Krok 7) oraz `getSettingsExtras()` (dane po stronie odczytu,
potrzebne stronie ustawień, obliczane defensywnie — opakuj żywe
wywołanie metadanych w `try`/`catch`, żeby przestój Lineara degradował
UI mapowania zamiast wysypać całą stronę ustawień).

Nowy plik: `app/Http/Controllers/LinearIntegrationController.php` +
`routes/web.php`:

```php
Route::post('/projects/{project}/integrations/linear/connect', [LinearIntegrationController::class, 'connect'])->name('projects.integrations.linear.connect');
Route::put('/projects/{project}/integrations/linear/mappings', [LinearIntegrationController::class, 'updateMappings'])->name('projects.integrations.linear.mappings.update');
Route::post('/projects/{project}/integrations/linear/import', [LinearIntegrationController::class, 'import'])->name('projects.integrations.linear.import');
```

Każda akcja jest bramkowana tym samym sprawdzeniem
`ProjectPolicy::updateIntegrations`, jakiego używa każda inna trasa
mutująca integracje — nic nowego do dodania w Policy.

**Uwaga architektoniczna — nie ma trasy `GET .../metadata` ani
`GET .../import-status` i dla Lineara też jej nie powinno być.** Orbit
nie ma osobnego API JSON (zobacz górę głównego `CLAUDE.md`) — każda
strona jest renderowana po stronie serwera jako props Inertii.
Metadane mapowania Jiry, zapisane mapowania pól i podsumowanie
ostatniego importu płyną jako zwykły prop Inertii:
`SettingsController::index()` oblicza prop `jiraSettings` przez
`JiraIntegrationService::getSettingsExtras()`, bramkowany przez
`canUpdateIntegrations` dokładnie tak, jak istniejące maskowanie
`webhookUrl` dla Discorda. Dodanie Lineara oznacza albo uogólnienie tego
pojedynczego propa `jiraSettings` do mapy per-integracja (np.
`importIntegrationSettings: Record<string, ImportIntegrationSettings>`,
kluczowanej po id integracji), albo dodanie drugiego, siostrzanego propa
w ten sam sposób — obecny kod obsługuje na raz tylko jedną integrację
typu import, i to jest znane, celowe uproszczenie (zobacz łańcuch
przekazywania propsów na froncie w Kroku 8), nie przeoczenie, które
trzeba po cichu obchodzić.

Na koniec dodaj `'linear'` do
`app/Services/ProjectIntegrationService.php::AVAILABLE_INTEGRATIONS`
(`['discord', 'jira', 'linear']`) — tej samej stałej, której używa
przewodnik 1 dla integracji notify. Kierunek (`notify` vs `import`) jest
wyrażony przez to, który rejestr rości sobie prawo do danego klucza
(`IntegrationNotifierRegistry` vs `IntegrationImporterRegistry`), nie
przez cokolwiek w tej stałej ani w schemacie `ProjectIntegration`.

## Krok 7 — Job importu

Nowy plik: `app/Jobs/ImportLinearIssuesJob.php`

Odzwierciedla `app/Jobs/ImportJiraIssuesJob.php`: `ShouldQueue`,
`tries = 3`, `backoff()` zwracające `[5, 15, 30]` — ten sam kształt
ponawiania, jakiego używa `SendWebhookNotificationJob`. Jego `handle()`
rozwiązuje importera przez `IntegrationImporterRegistry`, przesyła
`fetchIssues()` do `ImportOrchestratorService::import()` i zapisuje
wynikowy `ImportResultDTO` w `project_integrations.options['last_import']`
(`imported`/`updated`/`skipped`/`failed`/`errors`/`ran_at`) przez
`ProjectIntegrationRepository::updateOrCreate()`.

`import()` przyjmuje flagę `bool $syncExisting` (czytaną z
`$this->importOptions['sync_existing'] ?? false` — tej samej generycznej
"torby" opcji, z której `fetchIssues()` już czyta `project_key`/`jql`,
więc `ImportLinearIssuesJob` nie potrzebuje nowej właściwości
konstruktora dla niej). `false` (domyślnie) to oryginalne zachowanie:
issue już śledzone w `ExternalIssueLink` jest zostawiane w spokoju i
liczone jako `skipped`. `true` zamiast tego je nadpisuje, przez
`IssueService::syncImportedIssue()` — **zewnętrzny system zawsze
wygrywa przy konflikcie**, bez łączenia z tym, co użytkownik zmienił
lokalnie w Orbicie od ostatniej synchronizacji. To nadpisanie używa
dokładnie tej samej logiki `mapIssueData()`/mapowania pól/hierarchii,
która tworzy zupełnie nowe issue, więc zachowanie synchronizacji dla
Lineara jest automatycznie poprawne, nie jest czymś, co
`ImportLinearIssuesJob` musi implementować. `syncImportedIssue()` pisze
jeden wpis `ActivityLog` na zmienione issue (żeby jego historia
zostawała czytelna, tak jak przy zwykłej edycji), ale celowo **nie**
odpala `IssueUpdated` ani nikogo nie powiadamia — to samo uzasadnienie
operacji masowej, dla którego `importIssue()` nie odpala `IssueCreated`:
re-sync może dotknąć setek issues w jednym przebiegu.

Poinformowanie importującego użytkownika, jak poszło, **nie** jest zadaniem tego joba.
Sam `ImportOrchestratorService::import()` wysyła event `App\Events\IssuesImported`
(project, importedBy, `ImportResultDTO`) raz, bezwarunkowo, na końcu
każdego przebiegu — ta sama zasada "wyślij fakt, niech listener
zdecyduje, kogo to obchodzi", której trzyma się każdy inny event w tej
aplikacji (zobacz [`03-add-a-new-event-type.md`](./03-add-a-new-event-type.md)).
`SendNotificationListener::handleIssuesImported()` jest na niego
zarejestrowany w `AppServiceProvider::boot()` i wywołuje
`NotificationService::notify()` z `NotificationType::IntegrationActivity`
— dlatego import Lineara dostaje powiadomienie in-app + email "Twój
import się zakończył" za darmo, bez żadnego nowego kodu w samym
`ImportLinearIssuesJob`: event pochodzi ze współdzielonego
orchestratora, nie z joba. Jedyna rzecz, którą hook `failed()` na
poziomie joba (wywoływany, gdy wyczerpią się wszystkie próby) wciąż
musi zrobić bezpośrednio — przez `app(NotificationService::class)->notify(...)`,
nie przez kolejny event — to poinformowanie użytkownika, że jego import
w ogóle się nie zakończył, ponieważ `ImportOrchestratorService::import()`
nigdy nie zdążył się uruchomić, więc `IssuesImported` nigdy nie zostało wysłane.

Jednej rzeczy **nie** kopiuj odruchowo: `ImportJiraIssuesJob` **nie**
implementuje `ShouldBeEncrypted`, w przeciwieństwie do
`SendWebhookNotificationJob`. To dlatego, że jego konstruktor przyjmuje
instancje modeli `ProjectIntegration`/`Project`, które trait
`SerializesModels` w Laravelu serializuje jako referencję klasa+id, nie
surowe atrybuty — kolumna `credentials` niosąca poświadczenia w ogóle
nie trafia do payloadu kolejki, jest odszyfrowywana dopiero, gdy model
jest ponownie pobierany wewnątrz `handle()`. Sięgaj po
`ShouldBeEncrypted` tylko wtedy, gdy job przyszłego importera przyjmuje
surowy string sekretu bezpośrednio jako argument konstruktora (tak jak
`SendWebhookNotificationJob` przyjmuje `$webhookUrl`).

`triggerImport()` (Krok 6) go wysyła:
`ImportLinearIssuesJob::dispatch($projectIntegration, $project,
$importedBy->id, $importOptions)`. Do tego, żeby cokolwiek faktycznie
się wydarzyło, potrzebny jest działający worker kolejki — zobacz
proces `queue:listen` w `composer dev`.

## Krok 8 — Podłączenie frontendu

Plik: `resources/js/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationsTab.tsx`

Dodaj wpis do `IMPORT_ROUTE_NAMES`:

```ts
const IMPORT_ROUTE_NAMES: Partial<
    Record<IntegrationId, { connect: string; mappings: string; import: string }>
> = {
    jira: {
        connect: 'projects.integrations.jira.connect',
        mappings: 'projects.integrations.jira.mappings.update',
        import: 'projects.integrations.jira.import',
    },
    linear: {
        connect: 'projects.integrations.linear.connect',
        mappings: 'projects.integrations.linear.mappings.update',
        import: 'projects.integrations.linear.import',
    },
};
```

To **cała** zmiana na froncie potrzebna dla samego przepływu
connect/mapping/import — `WorkspaceSettingsImportPanel.tsx` już
renderuje wszystko, co opisuje `importConfig` (Krok 1), a
`WorkspaceSettingsIntegrationDetailModal.tsx` już kieruje każdą
integrację `kind: 'import'` do tego panelu. Żaden z tych dwóch plików
nie jest specyficzny dla Jiry — dotyczy to też przełącznika "Update
already-imported issues" obok przycisku Import, który wysyła
`sync_existing` do trasy, jaką rozwiąże `IMPORT_ROUTE_NAMES`. Linear
dostaje go za darmo w momencie, gdy istnieje powyższy wpis — nie ma nic
specyficznego dla importera do dodania dla niego na froncie.

To, czego wciąż musisz dotknąć, zgodnie z uwagą architektoniczną z
Kroku 6: prop `jiraSettings`, przekazywany przez `SettingsController` →
`Settings/Index.tsx` → `WorkspaceSettingsContent.tsx` →
`WorkspaceSettingsIntegrationsTab.tsx` → modal → panel, jest obecnie
pojedynczy i specyficzny dla Jiry. Uogólnij go (mapa per-integracja albo
drugi, identycznie ukształtowany prop), zanim ustawienia Lineara będą
mogły renderować się obok ustawień Jiry — nie używaj po cichu propa
`jiraSettings` dla danych Lineara.

Na koniec odwróć `comingSoon: false` we wpisie katalogowym Lineara
(Krok 1), gdy wszystko powyżej jest podłączone i ręcznie zweryfikowane
— ta jedna flaga odblokowuje UI przełącznika/Connect dokładnie tak, jak
opisano w przewodniku 1, Kroku 7.

## Testy

Dla pipeline'u importu z Jiry zbudowanego w tej sesji na razie nie
istnieją żadne dedykowane testy automatyczne (implementacja
frontend/backend wylądowała najpierw; pokrycie testami jest śledzone
osobno) — kiedy dodajesz Lineara, dodaj testy dla **obu naraz**, zamiast
powiększać zaległość, odzwierciedlając konwencje per-warstwa, których
ten kod już używa gdzie indziej:

- `tests/Unit/DataTransferObjects/ExternalIssueDTOTest.php` — konstrukcja/kształt.
- `tests/Feature/Services/Integrations/FieldMappingResolverServiceTest.php` —
  zapisane mapowanie wygrywa, spada do domyślnej wartości dla danego
  typu (`status`→`open`, `priority`→`medium`, `label`→pominięte), gdy
  brak mapowania.
- `tests/Feature/Services/Integrations/Jira/JiraApiClientTest.php` /
  `LinearApiClientTest.php` — przez `Http::fake()`, sprawdzające kształt
  żądania i redakcję credentiali w rzucanych wyjątkach/logach.
- `tests/Feature/Services/Integrations/ImportOrchestratorServiceTest.php` —
  algorytm dwuprzebiegowy: dziecko pojawiające się przed rodzicem i tak
  dostaje właściwy `parent_id`; ponowne uruchomienie importu na tych
  samych wierszach `ExternalIssueLink` pomija, zamiast duplikować, przy
  `$syncExisting = false` (domyślnie); przy `$syncExisting = true`
  już zalinkowane issue jest zamiast tego nadpisywane (dane ze
  zdalnego systemu wygrywają nawet nad lokalnie zmienionym polem),
  `updated` rośnie zamiast `skipped`, i zapisywany jest jeden wpis
  `ActivityLog`; oraz — łatwe do przeoczenia, bo to nie jedna z
  powyższych asercji DTO/hierarchii — `Event::fake()` +
  `Event::assertDispatched(IssuesImported::class, fn ($event) => ...)`,
  żeby potwierdzić, że `import()` faktycznie go wysyła z właściwym
  wynikiem, dla każdego źródła, nie tylko dla Jiry.
- `tests/Feature/Listeners/SendNotificationListenerTest.php` — odzwierciedl
  istniejący przypadek Mockery dla `ProjectInvited`: `IssuesImported`
  z `failed > 0` powiadamia z ciężkością `'warning'`, `failed === 0`
  powiadamia z `'success'`, a wiadomość/action URL są poprawnie
  zbudowane z `project`/`result` eventu.
- `tests/Feature/Jobs/ImportJiraIssuesJobTest.php` /
  `ImportLinearIssuesJobTest.php` — sprawdza, że job rozwiązuje
  właściwego importera, wywołuje orchestrator i zapisuje `last_import`.
- `tests/Feature/Http/Controllers/JiraIntegrationControllerTest.php` /
  `LinearIntegrationControllerTest.php` — bramkowanie przez policy na
  każdej trasie, odzwierciedlające istniejący wzorzec
  `ProjectIntegrationControllerTest.php`.
- Vitest: `WorkspaceSettingsImportPanel.test.tsx` — renderuje właściwe
  pola credentiali i tabele mapowań dla danego `importConfig`, oraz test
  regresyjny sprawdzający, że integracja `kind: 'notify'` (Discord)
  wciąż renderuje oryginalne UI webhook/subOptions
  `WorkspaceSettingsIntegrationDetailModal` całkowicie niezmienione.

Uruchom `php artisan test` i `npm test -- run` przed commitem — zobacz
dokładne komendy w głównym `CLAUDE.md`.
