# Workspace Automation

Minimalny, ale naprawdę reużywalny silnik reguł "jeśli to, wtedy tamto"
(v0.9.4), konfigurowany per projekt w **Ustawienia → Automation**.
Reguła ma jeden trigger, opcjonalną, płaską listę warunków połączonych
operatorem AND oraz jedną lub więcej uporządkowanych akcji. Istnieje
po to, żeby projekt mógł reagować na rzeczy dziejące się w Orbicie (albo
zgłaszane z powrotem przez GitHuba) bez zaszywania jakiejkolwiek
konkretnej polityki w kodzie Orbita — np. "gdy pull request na GitHubie
zostanie zmergowany, przenieś powiązane issue do Done" to reguła, którą
konfiguruje projekt, a nie wbudowane zachowanie.

## Przewodniki, w kolejności, w jakiej faktycznie by się ich potrzebowało

1. **[Dodaj nowy typ triggera](./01-add-a-new-trigger-type.md)** —
   przykład na żywym kodzie, podłączający istniejący przepływ
   przypisywania w `IssueService` do nowego triggera `IssueAssigned`.
2. **[Dodaj nowy typ akcji](./02-add-a-new-action-type.md)** —
   przykład na żywym kodzie dodający akcję `SetDueDate`, która
   opakowuje przepływ aktualizacji issue tak samo jak każda inna akcja.

## Architektura w jednym akapicie

`automation_rules` (`project_id`, `name`, `trigger_type`, `conditions`
JSON, `enabled`) ma wiele `automation_actions` (`type`, `params` JSON,
`sort_order`) — `App\Models\AutomationRule`/`AutomationAction`, zwykłe
Eloquent, bez polimorfizmu. `App\Repositories\AutomationRuleRepository::findEnabledForProjectAndTrigger()`
to jedyna ścieżka odczytu, jakiej potrzebuje miejsce wywołania triggera.
`App\Services\Automation\AutomationDispatcher::dispatch(AutomationTriggerType $trigger, Issue $issue, array $context, string $idempotencyKey)`
to jedyny punkt wejścia, który wywołuje każde źródło triggera: ładuje
włączone reguły projektu dla danego triggera, ewaluuje warunki każdej
reguły wobec `$context` przy użyciu `AutomationConditionEvaluator`
(płaskie AND, operatory `equals`/`not_equals`/`contains`/`in`,
`data_get()` po kropkowanych ścieżkach jak `pullRequest.title` — bez
grup warunków, bez OR, celowo), a dla każdego dopasowania uruchamia
akcje tej reguły **w kolejności `sort_order`** przez
`AutomationActionResolver::resolve()` →
`App\Services\Automation\Actions\*Action::handle(Issue $issue, array $params)`.
Każdy handler akcji opakowuje **istniejący** serwis mutujący Orbita
(`IssueService`, `LabelService`, …) — nie ma osobnej ścieżki zapisu
tylko dla automatyzacji, więc zmiana wyzwolona przez automatyzację
przechodzi dokładnie przez tę samą walidację/efekty uboczne (log
aktywności, inne listenery) co ta sama zmiana wykonana ręcznie przez
człowieka.

**Idempotencja**, nie ogólny system event-sourcingu:
`automation_rule_executions` ma unikalny constraint na
`(automation_rule_id, idempotency_key)`. Klucz dostarcza wywołujący
`dispatch()` — dla triggerów z GitHuba jest to własny id eventu relay,
więc ponowiona dostawa webhooka nigdy nie może uruchomić akcji reguły
dwukrotnie. Zduplikowany insert jest wyłapywany, a dana reguła zostaje
po cichu pominięta, bez ponawiania czy logowania jako błąd.

**Zapobieganie pętlom** to pojedyncza statyczna flaga
(`AutomationDispatcher::$executing`), nie śledzenie głębokości: gdy
trwają akcje jakiejś reguły, każdy trigger wyzwolony *wewnątrz* jednej
z nich (np. `ChangeStatusAction` wywołujący
`IssueService::updateIssue()`, który sam wyzwala
`IssueStatusChanged`) jest odrzucany już na pierwszym sprawdzeniu w
`dispatch()`, nigdy nie trafia do kolejki ani nie jest odraczany. Jeden
poziom tłumienia wystarczy, żeby uniemożliwić `A` wyzwalające `B`
wyzwalające `A`, ponieważ wewnętrzne wywołanie `dispatch()` po prostu
nigdy nie uruchamia swoich reguł.

## Triggery dzisiaj

`App\Enums\AutomationTriggerType`: `IssueStatusChanged` (wyzwalany z
`IssueService` przy każdej zmianie statusu — trigger, który dowodzi, że
ten silnik nie jest tylko dla GitHuba) oraz pięć z GitHuba
(`GithubPullRequestOpened`/`Reopened`/`Closed`/`Merged`/`Synchronized`,
wyzwalane z `GithubRelayEventProcessor` — zobacz
[`../integrations/06-github-integration.md`](../integrations/06-github-integration.md)).
Kontekst triggera z GitHuba jest budowany raz przez
`App\Services\Integrations\Github\GithubAutomationContextBuilder` —
czysta tablica w domenie Orbita (`project`, `issue`, `repository`,
`pullRequest`), **nigdy** surowy payload webhooka GitHuba — reużywana
przez każde miejsce wywołania z GitHuba, więc kształt kontekstu, do
którego może odwołać się warunek, nigdy nie zależy od tego, który
konkretnie event go wyzwolił.

## Akcje dzisiaj

`App\Enums\AutomationActionType`: `ChangeStatus`, `ChangePriority`,
`AssignUser`, `AddLabel`, `RemoveLabel`, `SendNotification` — zobacz
`app/Services/Automation/Actions/`. Każdy handler waliduje swoje własne
`params` defensywnie (np. `ChangeStatusAction` sprawdza, że docelowe
`workflow_status_id` faktycznie należy do typu issue, którego dotyczy)
i po prostu wraca (bez wyjątku, bez częściowego efektu ubocznego)
zamiast rzucać wyjątkiem, gdy parametr jest brakujący albo
nieprawidłowy, ponieważ źle skonfigurowana reguła nie powinna móc
crashować tego, co wyzwoliło trigger.

## Uprawnienia i UI ustawień

Dwa uprawnienia strzegą tego tak samo jak każdego innego zasobu
projektu (zobacz
[`../permissions/01-add-a-new-permission.md`](../permissions/01-add-a-new-permission.md)):
`projects.automation.view` (domyślnie member/viewer) i
`projects.automation.update` (owner/admin, sprawdzane przez
`ProjectPolicy::updateAutomation()`). `App\Http\Controllers\AutomationController`
to cienki kontroler CRUD (`store`/`update`/`destroy`) delegujący do
`AutomationRuleService`; `SettingsController::automation()` mapuje
case'y enuma na pary `{value, label}` dla dropdownów w builderze reguł.
Frontend (`Pages/Settings/Automation.tsx`,
`WorkspaceSettingsAutomationTab.tsx`) jest celowo minimalny: zwięzła
lista reguł plus inline'owy formularz dodawania reguły — jeden
trigger, jeden opcjonalny warunek, jedna akcja na regułę. To nie jest
wizualny builder if/then/else z gałęziami czy grupami warunków;
rozszerzenie go do takiego jest poza zakresem tego wydania.
