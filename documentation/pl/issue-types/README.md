# Typy issue

Typy issue to zasób **per-projekt**, oparty na prawdziwej tabeli
bazodanowej `issue_types` (`App\Models\IssueType`) — a nie na sztywnym
enumie backendowym ani na zwykłym stringu na issue, jak dawniej robiło
to pole `Issue.type`. Każdy projekt dostaje startowy katalog 16 typów
systemowych (Task, Feature, Story, Bug, Epic, Spike, Chore, Improvement,
Incident, Security, Infrastructure, Research, Experiment, Documentation,
Design, AI Task), zasiewany leniwie przy pierwszej potrzebie, a
właściciele/administratorzy projektu mogą zmienić nazwę, kolor, opis,
ograniczyć dostęp, dodać lub usunąć dowolny typ — również te zasiane
(typy systemowe można edytować, ale nigdy usunąć) — z poziomu
**Ustawienia → Issue Types**. Każdy typ ma własny **workflow** (mały
automat stanów: statusy i legalne przejścia między nimi), może być
oznaczony jako zezwalający na **sub-issue** (tylko typ w kształcie Epica
ustawiłby to), może wymagać wypełnienia konkretnych pól issue przed
zapisaniem issue tego typu, może ograniczać, kto może go użyć przy
tworzeniu, i może definiować wielokrotnego użytku **szablony**, które z
góry wypełniają opis/labele/priorytet issue.

## Przewodniki, w kolejności, w jakiej naprawdę byś ich potrzebował

1. **[Dodaj nowy domyślny typ issue](./01-add-a-new-default-issue-type.md)**
   — przećwiczony przykład dodania siedemnastego startowego typu,
   `Compliance`, do katalogu, jaki dostaje każdy nowy projekt.
2. **[Dodaj kategorię statusu workflow](./02-add-a-workflow-status-category.md)**
   — przećwiczony przykład rozszerzenia sztywnego enuma kategorii
   `todo`/`in_progress`/`done` o czwarty koszyk, `blocked`.
3. **[Rozszerz wymagane pola](./03-extend-required-fields.md)** —
   przećwiczony przykład dodania nowej opcji wymaganego pola
   (`parent`, "musi być sub-issue") do sztywnego zbioru, jakiego może
   zażądać typ issue.
4. **[Dodaj nową kolumnę listy](./04-add-a-new-list-column.md)** —
   przećwiczony przykład dodania kolumny `Reporter` do tabeli issue'ów,
   z użyciem rejestru kolumn wprowadzonego przez tę funkcję.

## Architektura w jednym akapicie

`issue_types` (migracja `2026_09_12_140000_create_issue_types_table.php`)
ma kolumny `project_id`, `name`, `icon` (nazwa komponentu z
lucide-react), `color`, `description`, `is_system`, `allows_children`,
`is_top_level`, `required_fields` (tablica JSON),
`restricted_role_types` (tablica JSON), `sort_order`, z unikalnością na
`(project_id, name)`. Model serializuje się sam do dokładnie takiego
kształtu camelCase, jaki deklaruje `resources/js/types/IssueTypes.ts`
(zobacz `IssueType::toArray()`) — dlatego żaden kontroler nie
potrzebuje własnego helpera mapującego, a typ zagnieżdżony w issue
wygląda identycznie jak przekazany jako prop strony.
`App\Repositories\IssueTypeRepository` i `App\Services\IssueTypeService`
idą za zwykłym w tym repozytorium podziałem
Controller → Service → Repository (zobacz
[`../architecture/02-backend-layered-architecture.md`](../architecture/02-backend-layered-architecture.md)):
`IssueTypeService::ensureSystemIssueTypes()` zasiewa 16 startowych
typów — każdy z domyślnym trójstanowym workflow — **dokładnie raz** dla
danego projektu, śledzone przez znacznik czasu
`projects.issue_types_seeded_at`, dokładnie ten sam wzorzec, jakiego
używa `LabelService::ensureSystemLabels()` (zobacz
[`../labels/README.md`](../labels/README.md)) i z tego samego powodu:
"wstaw wszystko, czego brakuje" przy każdym odczycie po cichu
wskrzeszałoby typ, który właściciel świadomie usunął. W przeciwieństwie
do labeli, typ issue jest jednak **prawdziwym kluczem obcym**
(`issues.issue_type_id`), a nie stringiem z nazwą — zmiana nazwy typu w
Ustawieniach natychmiast odzwierciedla się na każdym issue, który się
do niego odwołuje, a typu nie można usunąć, dopóki jakiekolwiek issue
go używa (`IssueTypeService::deleteIssueType()` rzuca wtedy
`ValidationException`; typu systemowego nie można usunąć nigdy).

Każdy typ issue ma własny **workflow**: `workflow_statuses` (`name`,
`color`, `category` — jedna z `todo`/`in_progress`/`done`, rzutowana na
`App\Enums\WorkflowStatusCategory` — oraz `is_initial`) i
`workflow_transitions` (`from_status_id` → `to_status_id`), obie
przypisane do `issue_type_id`. `App\Services\WorkflowService`
odpowiada za dodawanie/zmianę nazwy/usuwanie statusów oraz
dodawanie/usuwanie przejść; `IssueController::update` wywołuje
`WorkflowService::assertTransitionAllowed()` przed zaakceptowaniem
zmiany statusu, więc issue może przejść tylko do statusu, na jaki
workflow jego typu faktycznie pozwala. Dokładnie jeden status w
workflow ma `is_initial` — ten, w którym startują nowe issue; awans
innego degraduje poprzedniego posiadacza flagi, czym zajmuje się
`WorkflowService::setInitialStatus()` (route
`projects.issue-types.statuses.initial`) wywoływany z modala workflow.
Ten modal rysuje workflow jako uporządkowany przepływ przeciąganych
kart — `WorkflowService::reorderStatuses()` (route
`projects.issue-types.statuses.reorder`, zadeklarowany **przed** trasą
`{status}`, żeby `reorder` nie został wzięty za id statusu) przepisuje
`sort_order` na kolejność po upuszczeniu, a status, z którego nie
wychodzi żadne przejście, dostaje chip „No transitions", dzięki czemu
ślepy zaułek w grafie widać bez czytania macierzy poniżej.

Status issue zmienia się, wysyłając **`workflow_status_id`** — to
jedyny sposób, by dosięgnąć własnego statusu w rodzaju „In Review".
Panel boczny widoku issue buduje selektor z własnych statusów typu,
zawężonych do tych, do których faktycznie prowadzi przejście z
bieżącego. Stary enum `issues.status` (`open`/`in_progress`/`closed`)
nadal istnieje i jest utrzymywany w spójności w obie strony dla
wstecznej kompatybilności: `IssueTypeService::legacyValueForWorkflowStatus()`
sprowadza wybrany status z powrotem do enuma po kategorii, a
`IssueTypeService::resolveWorkflowStatusForLegacyValue()` mapuje w
drugą stronę — na **najlepiej pasujący status po kategorii**, a nie po
dokładnej nazwie, więc żądanie, które nadal wysyła stare pole `status`,
rozwiązuje się do czegoś sensownego nawet dla typu, którego workflow
został dostosowany poza trzy domyślne statusy. Domyślny workflow każdego typu systemowego to prosta
trójstanowa tablica (To Do/In Progress/Done), w której **każdy** status
może przejść do każdego innego (pełna siatka) — to odpowiada
zachowaniu sprzed Issue Types, gdzie dowolna wartość `IssueStatus`
mogła zostać ustawiona w dowolnym momencie; restrykcyjny, niestandardowy
workflow to coś, co projekt musi celowo zbudować z **Ustawienia →
Issue Types → Manage workflow**.

Poza wbudowanymi polami, które ma każde issue, typ może definiować
własne **pola niestandardowe**: `issue_type_fields` (`label`, `type` —
jeden z `text`/`textarea`/`number`/`date`/`select`/`checkbox`/`url`,
rzutowany na `App\Enums\IssueFieldType` — plus `options` dla pola
wyboru, `placeholder`, `is_required` i `sort_order`), zarządzane z
**Ustawienia → Issue Types → Manage fields**. Wartości żyją w
`issues.custom_fields`, mapie JSON kluczowanej **id pola**, a nie
etykietą — z tego samego powodu, dla którego sam typ jest kluczem
obcym: zmiana nazwy pola nigdy nie osieroca zapisanych pod nim wartości.
`IssueTypeFieldService::sanitizeValues()` jest bramką na wejściu —
odrzuca wartości adresowane do pola, które już nie istnieje albo należy
do innego typu, i sprowadza każdą wartość do kształtu jej pola (wybór
spoza listy opcji albo nieliczbowa liczba są odrzucane, a nie
zapisywane). Przy edycji przychodząca mapa jest scalana z tym, co issue
już ma, przez `array_replace` — a **nie** `array_merge`, który
przenumerowałby liczbowe klucze id pól — więc częściowy zapis z panelu
bocznego nigdy nie czyści pól, których nie wysłał.

Wszystko, z czym typ systemowy startuje, leży w
`App\Support\SystemIssueTypeDefaults` — własne statusy workflow,
akceptowane typy dzieci, startowy szablon i pola niestandardowe — więc
Bug faktycznie przechodzi `Reported → Triaged → Fixing → In Review →
Fixed` (albo prosto do `Won't Fix` z dowolnego miejsca) i faktycznie
pyta o kroki reprodukcji, a Incident śledzi severity i link do
postmortemu. Przejścia są wyprowadzane z kolejności statusów, a nie
wypisywane ręcznie (`IssueTypeService::defaultTransitionPairs()`: krok
naprzód, krok wstecz i skok do dowolnego statusu końcowego z każdego
miejsca). Żadne zaseedowane pole nie jest `is_required`, ponieważ
quick-add tworzy issue z samego tytułu, a pole wymagane zepsułoby to dla
całego typu; oznaczenie pola jako wymagane to świadoma decyzja per
projekt. Ponieważ te domyślne wartości pojawiły się już po zasianiu
projektów, są wersjonowane:
`projects.issue_type_defaults_version` względem
`IssueTypeService::DEFAULTS_VERSION`. Projektowi z niższą wersją przy
najbliższym odczycie uruchamia się `applyTypeDefaults()`, ściśle
**addytywne** — nigdy nie tworzy typu, który został usunięty, nigdy nie
kasuje statusu, przejścia, szablonu ani pola i nigdy nie nadpisuje tego,
co już istnieje pod tą samą nazwą. Jedyny wyjątek to typ wciąż
z nietkniętą standardową trójstanową tablicą: nigdy nie był
dostosowywany, więc zostaje wymieniony na własny workflow typu, a każde
issue przeniesione na nowy status o tej samej kategorii co stary
(`replaceGenericWorkflow()`).

Uprawnienia idą za tym samym wzorcem enuma `Permission` /
`ProjectPolicy` / poziomów `RoleService`, co labele:
`ISSUE_TYPES_VIEW/CREATE/UPDATE/DELETE` i `WORKFLOW_UPDATE` (podgląd:
owner/admin/member/viewer; każda mutacja: tylko owner/admin — zobacz
[`../permissions/README.md`](../permissions/README.md), jeśli
potrzebujesz dodać własne, nowe uprawnienie). Ponad tą ogólnoprojektową
bramką, każdy typ issue może nieść własne `restricted_role_types`
(tablica JSON wartości `owner`/`admin`/`member`/`viewer`) —
`App\Policies\IssuePolicy::createOfType()` to drugie, węższe
sprawdzenie, stosowane tylko przy faktycznym tworzeniu issue tego
konkretnego typu, ponad ogólnym sprawdzeniem `issues.create`; pusta
tablica `restricted_role_types` oznacza "brak dodatkowego
ograniczenia, każdy, kto w ogóle może tworzyć issue, może użyć tego
typu."

Hierarchia wykorzystuje ponownie już istniejącą kolumnę
`issues.parent_id` — nic tu nowego — zabezpieczoną trzema ustawieniami
per typ. `allows_children` decyduje, czy issue tego typu może w ogóle
być rodzicem. Tabela pośrednia `issue_type_children`
(`IssueType::allowedChildTypes()`) zawęża, *które* typy mogą być pod
nim zagnieżdżone; **pusty** zbiór oznacza brak ograniczeń, więc
dopiero skonfigurowanie co najmniej jednego wiersza zaczyna
ograniczać. `is_top_level` decyduje w drugą stronę: typ z wyłączoną
flagą istnieje wyłącznie jako sub-issue i nie może zostać utworzony
jako wiersz główny — to właśnie utrzymuje selektor „New issue" przy
garstce typów, od których projekt faktycznie zaczyna pracę (`Task`,
`Feature`, `Story`, `Bug`, `Epic` po instalacji — każdy inny typ
systemowy jest zasiewany jako tylko-sub-issue). Wszystkie trzy
przełącza się w **Ustawienia → Issue Types**, a
`App\Services\IssueService::assertValidParent()` egzekwuje każde z
nich — plus ten sam projekt, brak samo-rodzicielstwa i brak cykli —
niezależnie od tego, który endpoint (tworzenie czy edycja) ustawia
`parent_id`. Sam widok issue wypisuje swoje dzieci i tworzy nowe przez
`resources/js/Components/Organisms/IssueChildrenPanel/IssueChildrenPanel.tsx`,
renderowany tylko dla typu z włączonym `allows_children`. Po stronie
frontendu,
`resources/js/hooks/useIssueHierarchy.ts` zamienia płaską,
spaginowaną tablicę `issues` w renderowane drzewo, grupując po
`parent_id` — to hierarchia **lokalna dla strony**: dziecko, którego
rodzic nie trafił akurat na tę samą stronę wyników, renderuje się jako
wiersz najwyższego poziomu zamiast drzewa między-stronicowego. Stan
zwiniętych wierszy jest zapisywany w `localStorage` per projekt, tym
samym wzorcem, jakiego `resources/js/hooks/useTableResizing.ts` już
używa dla szerokości kolumn.

Samo tworzenie issue zostało przeprojektowane wokół tej funkcji: stary
`NewIssueModal` zniknął, zastąpiony przez
`resources/js/Components/Molecules/QuickAddIssueRow/QuickAddIssueRow.tsx`
— wiersz inline na górze `IssueTable` (a dla typu z
`allows_children` — drugi wiersz "Add sub-issue" tuż pod nim).
Renderuje się jak prawdziwy wiersz tabeli: edytowalne są tytuł i **typ
issue**, a pozostałe komórki pokazują podgląd tego, z czym issue
zostanie utworzone — id, jakie dostanie
(`IssueService::peekNextIssueId()`, wyłącznie podpowiedź, bo
równoległe tworzenie zabierze prawdziwe id), początkowy status
workflow wybranego typu, priorytet `Medium` i brak przypisania. Wiersz
najwyższego poziomu oferuje tylko typy `is_top_level`, a zagnieżdżony —
tylko dozwolone dzieci typu rodzica. Zatwierdzenie wysyła do
`issues.store` tytuł, wybrany `issue_type_id` (z fallbackiem na
`IssueTypeService::defaultIssueType()`, gdy nic nie przyszło) oraz
`parent_id` dla sub-issue — otwórz issue później, żeby uzupełnić
resztę, albo zastosować `IssueTypeTemplate` (`name`,
`description`, `default_priority`, `default_labels`, zarządzany z
**Ustawienia → Issue Types → Manage templates**) przez `template_id` w
tym samym żądaniu tworzenia, co wypełnia z góry
`description`/`labels`, gdy są akurat puste.
`resources/js/utils/quickAddIssueEvent.ts` to mała szyna zdarzeń
`window`, dzięki której globalny przycisk/skróty klawiszowe "New issue"
w `MainLayout` mogą poprosić dowolny zamontowany akurat `IssueTable`, by
odsłonił i sfokusował swoje pole quick-add, bez przekazywania refa przez
granicę layoutu — to no-op na stronie (Board/Calendar/Activity), która
w ogóle nie renderuje `IssueTable`.
