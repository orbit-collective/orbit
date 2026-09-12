# Labele

Labele issue'ów to zasób **per-projekt**, oparty na prawdziwej tabeli
bazodanowej `labels` (`App\Models\Label`) — a nie na sztywnym enumie
backendowym. Każdy projekt dostaje startową taksonomię sześciu labeli
(`bug`, `feature`, `performance`, `design`, `ux`, `chore`), zasiewaną
leniwie przy pierwszej potrzebie, a właściciele/administratorzy
projektu mogą zmienić nazwę, kolor, opis, dodać lub usunąć dowolny
label — również te zasiane — z poziomu **Ustawienia → Labele**.

## Przewodniki, w kolejności, w jakiej naprawdę byś ich potrzebował

1. **[Dodaj nowy domyślny label](./01-add-a-new-default-label.md)** —
   przećwiczony przykład dodania siódmego startowego labela,
   `security`, do taksonomii, jaką dostaje każdy nowy projekt.
2. **[Udostępnij labele projektu nowej stronie](./02-expose-project-labels-to-a-new-page.md)** —
   przećwiczony przykład podpięcia prawdziwych kolorów labeli
   per-projekt (zamiast hashowanego fallbacku) do zupełnie nowej
   strony jednoprojektowej, na przykładzie hipotetycznej strony
   `Backlog`, zbudowanej dokładnie w kształcie istniejącej strony
   `Projects/Show`.

## Architektura w jednym akapicie

`labels` (migracja `2026_09_12_120000_create_labels_table.php`) ma
kolumny `project_id`, `name`, `color`, `description`, `is_system`, z
unikalnością na `(project_id, name)`. `App\Repositories\LabelRepository`
i `App\Services\LabelService` idą za zwykłym w tym repozytorium
podziałem Controller → Service → Repository (zobacz
[`../architecture/02-backend-layered-architecture.md`](../architecture/02-backend-layered-architecture.md)):
`LabelService::ensureSystemLabels()` zasiewa sześć startowych labeli
**dokładnie raz** dla danego projektu, śledzone przez znacznik czasu
`projects.labels_seeded_at` — a nie "wstaw wszystko, czego brakuje" przy
każdym odczycie, co po cichu wskrzeszałoby label, który właściciel
projektu świadomie usunął. `App\Http\Controllers\LabelController`
udostępnia `projects.labels.store` / `.update` / `.destroy`,
zabezpieczone przez `App\Policies\ProjectPolicy::viewLabels()` /
`manageLabels()` (podgląd: owner/admin/member/viewer; zarządzanie:
tylko owner/admin — dokładnie ten sam wzorzec, co
`viewIntegrations()`/`updateIntegrations()`). Kolumna `labels` issue'a
to nadal zwykła tablica JSON z **nazwami** labeli w postaci stringów
(`Issue::casts()['labels'] = 'array'`, bez `App\Enums\IssueLabel` w
tle) — ale każda nazwa zapisywana przez
`IssueController@store`/`@update` jest teraz walidowana względem
prawdziwych wierszy `labels` danego projektu
(`Rule::exists('labels', 'name')->where('project_id', ...)`), zamiast
względem sztywnego enuma. To świadomy kompromis zakresu, o którym
warto wiedzieć, zanim się w to ruszy: label jest identyfikowany przez
**nazwę**, a nie przez relacyjną tabelę pośredniczącą do issue'ów, więc
zmiana nazwy albo usunięcie labela **nie** aktualizuje ani nie usuwa go
wstecznie z issue'ów, które już odwołują się do starej nazwy — issue
zachowuje ten sam string, dopóki ktoś ponownie nie edytuje jego
labeli. Po stronie frontendu `resources/js/context/ProjectLabelsContext.tsx`
z `ProjectLabelsProvider`/`useProjectLabels()` jest jedynym źródłem
prawdy dla "jakie labele istnieją i jaki kolor ma ten konkretny",
wszędzie tam, gdzie jest zamontowany (obecnie `Pages/Projects/Show.tsx`
i `Pages/Issues/Show.tsx`, każdy zasilany propsem `labels`, który
kontroler buduje małym prywatnym helperem `mapLabels()`) —
`LabelBadge`, `EditableLabelList` i `FilterDropdown` typu `labels`
czytają z niego zamiast z zaszytej na sztywno listy, a
`useProjectLabels().getColor(name)` wraca do `hashLabelColor()`
(deterministyczny hash w stałą 18-kolorową paletę
`LABEL_COLOR_PALETTE` w `resources/js/utils/labelColors.ts`), gdy nie
ma zamontowanego providera albo nazwa nie zostanie znaleziona — co
dokładnie dzieje się dziś na wieloprojektowej stronie `Dashboard`.
Sama zakładka Ustawienia → Labele
(`WorkspaceSettingsLabelsTab.tsx`) została odblokowana ze stanu
"coming soon" opisanego w
`documentation/pl/settings-tabs/01-flip-a-placeholder-tab-live.md` i
przebudowana z prawdziwym CRUD-em podpiętym pod trasy powyżej; jej UI
tworzenia/edycji to panel, który rozwija się **w miejscu**, zamiast
modala — zobacz `WorkspaceSettingsLabelInlineEditor.tsx` w tym pliku,
jeśli dodajesz kolejny edytowalny-w-miejscu wiersz ustawień i chcesz
dopasować się do tego wzorca zamiast sięgać po `Modal`.
