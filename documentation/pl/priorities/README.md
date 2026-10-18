# Priorytety

Priorytet issue'a to **zasób per-projekt**, oparty na prawdziwej tabeli
bazodanowej `priorities` (`App\Models\Priority`) — a nie na sztywnym
enumie `low` / `medium` / `high`, którym był wcześniej. Każdy projekt
dostaje startową skalę trzech priorytetów (`High`, `Medium`, `Low`),
zasiewaną leniwie przy pierwszej potrzebie, a każdy, kto ma odpowiednie
uprawnienie, może zmienić nazwę, kolor, ikonę, kolejność, dodać, usunąć
lub zmienić domyślność dowolnego z nich — również tych zasianych — z
poziomu **Ustawienia → Priorities**.

## Przewodniki, w kolejności, w jakiej naprawdę byś ich potrzebował

1. **[Zmień startowe priorytety](./01-change-the-starter-priorities.md)** —
   przećwiczony przykład dodania czwartego startowego priorytetu,
   `Urgent`, do skali, jaką dostaje każdy **nowy** projekt, wraz z
   migracją danych, która dociąga projekty **już zasiane**, oraz
   testami do zaktualizowania.
2. **[Pokaż priorytety na nowej stronie](./02-show-priorities-on-a-new-page.md)** —
   przećwiczony przykład podpięcia prawdziwych priorytetów projektu
   (kolory, ikony, kolejność, filtr, sortowanie) do zupełnie nowej
   strony jednoprojektowej, na przykładzie hipotetycznej strony
   `Triage`, zbudowanej w kształcie istniejącej strony `Projects/Show`.
   Nigdy więcej nie hardcoduj `low` / `medium` / `high`.

## Architektura w jednym akapicie

`priorities` (migracja `2026_10_18_100000_create_priorities_table.php`)
ma kolumny `project_id`, `name`, `color` (6-cyfrowy hex), `icon` (nazwa
ikony z lucide-react), `position`, `is_default`, z unikalnością na
`(project_id, name)`. `App\Repositories\PriorityRepository` i
`App\Services\PriorityService` idą za zwykłym podziałem Controller →
Service → Repository (zobacz
[`../architecture/02-backend-layered-architecture.md`](../architecture/02-backend-layered-architecture.md)):
`PriorityService::ensureSystemPriorities()` zasiewa
`PriorityService::SYSTEM_PRIORITIES` — jedyne źródło startowej skali:
`High` (`#f44336`, `SignalHigh`), `Medium` (domyślny, `#ff9800`,
`SignalMedium`) i `Low` (`#4caf50`, `SignalLow`) — **dokładnie raz** dla
danego projektu, śledzone przez znacznik czasu
`projects.priorities_seeded_at`, a nie "wstaw wszystko, czego brakuje"
przy każdym odczycie, co wskrzeszałoby priorytet, który właściciel
świadomie usunął. Potem każdy priorytet jest edytowalny i usuwalny, a
lista nigdy nie jest już uzupełniana.
`App\Http\Controllers\PriorityController` udostępnia
`projects.priorities.store`, `.update`, `.destroy` i `.reorder`
(`PATCH /projects/{project}/priorities/order`, body `order` = wszystkie
id projektu, od najważniejszego), zabezpieczone czterema uprawnieniami
`projects.priorities.view` / `.create` / `.update` / `.delete` przez
`ProjectPolicy::viewPriorities()` / `createPriorities()` /
`updatePriorities()` / `deletePriorities()` (Owner i Admin dostają
wszystkie cztery, Member i Viewer dostają `view`, jak w pozostałych
katalogach). Priorytet issue'a to `issues.priority_id`, nullowalny klucz
obcy do `priorities` z `nullOnDelete`; **`null` oznacza "brak
priorytetu"**. Zapisujące nadal operują na **nazwach** priorytetów:
przypisanie `priority` na `Issue` (`create()`, `update()`, fabryki,
importy, szablony, automatyzacje) przechodzi przez
`Issue::setPriorityAttribute()`, który rozwiązuje nazwę bez
rozróżniania wielkości liter względem **projektu samego issue'a** i
zapisuje id przy zapisie issue'a; nazwa, której projekt nie ma, zostawia
priorytet bez zmian, jawny `null` go czyści, a **nowe** issue, któremu
nigdy nie nadano priorytetu, dostaje domyślny priorytet projektu (hook
`creating` w `Issue::booted()`). `IssueController@store`/`@update`
walidują nazwę przez `App\Rules\ProjectPriorityName`, więc nazwa
priorytetu z innego projektu jest odrzucana. Odczyt zachowuje stary
kontrakt i go rozszerza: `Issue::$with = ['priority']` eager-loaduje
relację, a `Issue::relationsToArray()` serializuje `priority` jako
**nazwę** (albo `null`) i dodaje `priorityDetails` —
`{id, name, color, icon, position}` z `Priority::toDetails()` — dzięki
czemu wiersz może narysować swoją ikonę i kolor bez zaglądania do listy
projektu (której strona wieloprojektowa, jak dashboard, nie ma).
**Filtrowanie odbywa się po id priorytetu**: `?priority=1,3` →
`whereIn('issues.priority_id', ...)`, a zapisane filtry przechowują te
same id. **Sortowanie idzie za `position`**:
`IssueRepository::orderByPriority()` stawia najważniejsze pierwsze, a
issue'y bez priorytetu ostatnie (rosnąco; malejąco to dokładne
odwrócenie). `statsForUser()` na dashboardzie grupuje liczniki issue'ów
**po nazwie priorytetu między projektami** (reprezentuje ją najniższa
pozycja i jeden kolor/ikona tej nazwy), osobno liczy `noPriority` i
zwraca `topPriority`: issue'y na pozycji `0` skali własnego projektu,
jakkolwiek by się nazywała. Nieliczne miejsca, które nadal trzymają
priorytet jako zwykły tekst — `default_priority` szablonu, `orbit_value`
mapowania **priorytetu** z Jiry oraz `params.priority` akcji
automatyzacji `change_priority` — są przepisywane (zmiana nazwy) albo
usuwane/czyszczone (usunięcie) przez
`PriorityRepository::replaceNameReferences()`; zapisane filtry tracą
usunięte id przez `removeFromSavedFilters()`. Usunięcie priorytetu
przyjmuje opcjonalne `replacement_id` (issue'y przechodzą na niego, a
inaczej zostają bez priorytetu), projekt zawsze zachowuje **co najmniej
jeden** priorytet, a jeśli usunięty był domyślny, flaga przechodzi na
zastępnik (albo pierwszy pozostały priorytet). `Priority` używa concernu
`BumpsIssueCache`, więc cache list issue'ów się odświeża, a serwis sam
podbija `CacheVersion::ISSUES` po aktualizacji lub usunięciu (zbiorczy
`UPDATE` issue'ów przy usuwaniu nie wyzwala żadnego eventu modelu).
`SettingsController::priorities()` zasila zakładkę — `priorities`
(każdy z `issueCount`), `hasPrioritiesAccess`, `canCreatePriorities` /
`canUpdatePriorities` / `canDeletePriorities` — a pozostałe zakładki,
które wybierają priorytet (typy issue dla domyślnych wartości
szablonów, integracje dla mapowania priorytetów Jiry, automatyzacje dla
akcji zmiany priorytetu), oraz strony projektu i issue'a dostają prop
`priorities` z wierszami `Priority::toOption()` (`id`, `name`, `color`,
`icon`, `position`, `isDefault`; zakładki ustawień wysyłają pustą listę
bez `priorities.view`). Na froncie
`ProjectPrioritiesProvider` / `useProjectPriorities()` z
`resources/js/context/ProjectPrioritiesContext.tsx` (`priorities`,
`defaultPriority`, `findByName()`) to jedyne źródło prawdy o tym, jakie
priorytety ma projekt, montowane w `Pages/Projects/Show.tsx` i
`Pages/Issues/Show.tsx`; `PriorityIcon` przyjmuje `{name, color, icon}`
(albo `null` dla przerywanego kółka "brak priorytetu"), `FilterDropdown`
`priority` wylistowuje po jednej opcji na priorytet z id jako wartością,
`StatusDot` ma prop `color` na kolor własny priorytetu, a `IssueBoard`
buduje jedną kolumnę na priorytet (`priority-<id>`) plus
`priority-none`. Zakładka Ustawienia → Priorities
(`WorkspaceSettingsPrioritiesTab.tsx`) została odblokowana ze stanu
"coming soon" opisanego w
[`../settings-tabs/01-flip-a-placeholder-tab-live.md`](../settings-tabs/01-flip-a-placeholder-tab-live.md);
jej UI tworzenia/edycji to ten sam panel rozwijany w miejscu, co w
zakładce labeli (`WorkspaceSettingsPriorityInlineEditor.tsx`), zmiana
kolejności to przyciski w górę/w dół, które wysyłają PATCH z nową
kolejnością, a usuwanie otwiera `WorkspaceSettingsDeletePriorityModal.tsx`
do wyboru zastępnika.

## Aktualizacja: co cztery migracje zrobiły z istniejącymi danymi

Cztery migracje idą razem, w tej kolejności:

1. `2026_10_18_100000_create_priorities_table.php` — tworzy
   `priorities` i dodaje `projects.priorities_seeded_at`.
2. `2026_10_18_110000_grant_priority_permissions_to_existing_roles.php`
   — tworzy cztery uprawnienia `projects.priorities.*` i nadaje je
   **istniejącym** rolom systemowym (wszystkie cztery Ownerowi i
   Adminowi, `view` Memberowi i Viewerowi), po czym podbija
   `CacheVersion::MEMBERSHIP`. Nowe uprawnienia nie są nadawane już
   istniejącym rolom automatycznie — zobacz
   [`../permissions/01-add-a-new-permission.md`](../permissions/01-add-a-new-permission.md)
   — więc każde przyszłe uprawnienie priorytetów potrzebuje takiej
   migracji. Role własne (custom) są nietknięte.
3. `2026_10_18_120000_move_issue_priority_to_priorities.php` — dodaje
   `issues.priority_id`, zasiewa startową skalę w każdym projekcie, który
   ma issue'y, wskazuje każde issue na priorytet o jego dawnym słowie
   (`high` → `High`, `medium` → `Medium`, `low` → `Low`), usuwa starą
   kolumnę enum `issues.priority`, odtwarza triggery kolejności dat,
   które SQLite gubi przy przebudowie tabeli, i podbija
   `CacheVersion::ISSUES`. Jej `down()` zamienia skalę z powrotem na trzy
   słowa: pierwszy priorytet projektu to `high`, ostatni `low`, reszta
   `medium`.
4. `2026_10_18_130000_migrate_priority_name_references.php` — zasiewa
   **każdy** projekt, po czym przenosi tekstowe kopie na skalę:
   `default_priority` szablonów, `orbit_value` mapowań priorytetów Jiry
   i parametry `change_priority` dostają kanoniczną nazwę (`high` →
   `High`), a słowa priorytetu w zapisanym filtrze stają się **id**
   priorytetów. Słowo, na które projekt nie ma priorytetu, jest
   odrzucane (szablony, zapisane filtry) albo zostaje bez zmian
   (mapowania, akcje). Jej `down()` nic nie robi: starych słów nie da się
   odróżnić od dzisiejszych nazw.

Efekt: każde istniejące issue zachowuje swój priorytet, każdy projekt ma
własną, edytowalną skalę `High` / `Medium` / `Low`, a nic już nie czyta
ani nie zapisuje `issues.priority`.
