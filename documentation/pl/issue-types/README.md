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
`required_fields` (tablica JSON), `restricted_role_types` (tablica
JSON), `sort_order`, z unikalnością na `(project_id, name)`.
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
workflow jego typu faktycznie pozwala. Stary enum `issues.status`
(`open`/`in_progress`/`closed`) nadal istnieje i jest nadal
odczytywany/zapisywany dla wstecznej kompatybilności —
`IssueTypeService::resolveWorkflowStatusForLegacyValue()` mapuje starą
wartość na **najlepiej pasujący status po kategorii**, a nie po
dokładnej nazwie, więc nadal rozwiązuje się do czegoś sensownego nawet
dla typu, którego workflow został dostosowany poza trzy domyślne
statusy. Domyślny workflow każdego typu systemowego to prosta
trójstanowa tablica (To Do/In Progress/Done), w której **każdy** status
może przejść do każdego innego (pełna siatka) — to odpowiada
zachowaniu sprzed Issue Types, gdzie dowolna wartość `IssueStatus`
mogła zostać ustawiona w dowolnym momencie; restrykcyjny, niestandardowy
workflow to coś, co projekt musi celowo zbudować z **Ustawienia →
Issue Types → Manage workflow**.

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
`issues.parent_id` — nic tu nowego — zabezpieczoną nową flagą
`issue_types.allows_children`: tylko issue, którego typ ma tę flagę
ustawioną, może być rodzicem. `App\Services\IssueService::assertValidParent()`
egzekwuje ten sam projekt, typ-zezwala-na-dzieci, brak
samo-rodzicielstwa i brak cykli, niezależnie od tego, który endpoint
(tworzenie czy edycja) ustawia `parent_id`. Po stronie frontendu,
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
— wiersz inline, tylko z tytułem, na górze `IssueTable` (a dla typu z
`allows_children` — drugi wiersz "Add sub-issue" tuż pod nim).
Zatwierdzenie wysyła bezpośrednio do `issues.store` tylko z tytułem
(plus `parent_id` dla sub-issue); typ issue domyślnie ustawia się na
systemowy typ `Task` projektu przez
`IssueTypeService::defaultIssueType()`, ponieważ sam wiersz quick-add
nie ma selektora typu — otwórz issue później, żeby zmienić jego typ,
uzupełnić resztę, albo zastosować `IssueTypeTemplate` (`name`,
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
