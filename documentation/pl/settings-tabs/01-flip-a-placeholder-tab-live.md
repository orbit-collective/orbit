# Włącz placeholder zakładkę na żywo

Przećwiczony przykład: zamiana **Export** (sekcja Account) z nieosiągalnego elementu nawigacji w prawdziwą zakładkę. Jej komponent, `AccountSettingsExportTab.tsx`, już istnieje i już renderuje pełne UI (dwie karty eksportu, wiersz usunięcia konta) — po prostu nigdy nie jest osiągalny, ponieważ jego wpis w rejestrze to `enabled: false` i nie ma trasy. To ten sam kształt "UI już istnieje, po prostu spraw, żeby był prawdziwy", jaki pokrywa [`../integrations/01-add-a-new-integration.md`](../integrations/01-add-a-new-integration.md) dla integracji z katalogu — przejdź od razu do tego kroku poniżej, który faktycznie dotyczy placeholder zakładki, nad którą pracujesz, jeśli jest dalej niż Export.

## Krok 1 — Przełącz flagę

Plik: `resources/js/types/Settings.ts`

```ts
{
    id: 'export',
    path: '/settings/export',
    label: 'Export',
    icon: 'Download',
    section: 'account',
    description: 'Prepare and download your account-related data exports.',
    enabled: true, // was false
},
```

Ta flaga jest tym, co czyni element nawigacji klikalnym: główny `Sidebar` aplikacji (`resources/js/Components/Organisms/Sidebar/Sidebar.tsx`) renderuje sekcje Account/Workspace bezpośrednio z `SETTINGS_TABS`, gdy tylko aktualny URL znajduje się pod `/settings`, linkując każdą włączoną zakładkę do jej `path` i renderując każdą wyłączoną jako bezwładny `div` z plakietką "Soon" (zobacz [`../architecture/03-frontend-architecture-and-atomic-design.md`](../architecture/03-frontend-architecture-and-atomic-design.md)). Samo przełączenie flagi już jednak nie wystarcza — bez kroków 2–4 link prowadzi teraz do URL-a, który zwraca 404.

## Krok 2 — Dodaj trasę

Plik: `routes/web.php`

```php
Route::get('/settings/export', [SettingsController::class, 'export'])->name('settings.export');
```

Trzymaj ścieżkę identyczną z `path` z wpisu w rejestrze, a nazwę trasy w formie `settings.<id zakładki>` — ta konwencja pozwala kodowi backendu linkować do zakładki przez `route('settings.export')`, tak jak `ImportJiraIssuesJob` linkuje przez `route('settings.integrations', ['project' => ...])`.

## Krok 3 — Dodaj akcję kontrolera

Plik: `app/Http/Controllers/SettingsController.php`

```php
public function export(Request $request): Response
{
    return Inertia::render('Settings/Export', [
        'projects' => $this->projects($request),
        'exportRequests' => $this->exportService->getRequests($request->user()->id),
    ]);
}
```

Jedna akcja na zakładkę, każda zwracająca **tylko** te propy, które czyta UI tej zakładki. `projects` to wyjątek przekazywany przez każdą akcję — `Sidebar` potrzebuje go na każdej stronie ustawień. Cokolwiek działającego w kontekście projektu rozwija zamiast tego `$this->projectScope($projects, $selectedProject)` (zobacz akcje `labels()`/`members()`), co dostarcza razem `projects`, `memberProjects` i `selectedProjectId`. Powstrzymaj się od dodawania "przy okazji" propa, którego potrzebuje tylko inna zakładka — brak nadmiernego pobierania jest całym sensem podziału na zakładki.

## Krok 4 — Dodaj stronę

Nowy plik: `resources/js/Pages/Settings/Export.tsx`

```tsx
import AccountSettingsExportTab from '@/Components/Organisms/AccountSettingsContent/AccountSettingsExportTab';
import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import { Project } from '@/types/Projects';

interface SettingsExportProps {
    projects?: Project[];
    exportRequests?: ExportRequest[];
}

export default function SettingsExport({
    projects = [],
    exportRequests = [],
}: SettingsExportProps) {
    return (
        <SettingsLayout tabId="export" projects={projects}>
            <AccountSettingsExportTab exportRequests={exportRequests} />
        </SettingsLayout>
    );
}
```

Strona jest celowo cienka: zadeklaruj propy, które wysyła kontroler, podaj je komponentowi zakładki i pozwól `SettingsLayout` narysować pasek boczny, breadcrumb, nagłówek i opis z wpisu w rejestrze dla danego `tabId`. Nazwa strony Inertii w `Inertia::render('Settings/Export', ...)` musi dokładnie odpowiadać ścieżce tego pliku pod `resources/js/Pages/`.

## Krok 5 — Podłącz prawdziwe dane do komponentu zakładki (nie zostawiaj go statycznym)

`AccountSettingsExportTab` dziś nie przyjmuje żadnych propów — każdy string na nim to zahardkodowana treść. Zanim wypuścisz go na żywo, przeprowadź przez niego prawdziwe dane, których zakładka faktycznie potrzebuje, tak jak robi to już każda inna zakładka Account (`AccountSettingsProfileTab` bierze `userName`/`userAvatar`, `AccountSettingsNotificationsTab` bierze `notificationSettings` — zobacz [`../notifications/03-frontend-backend-wiring-overview.md`](../notifications/03-frontend-backend-wiring-overview.md) po pełną podróż tego drugiego).

Plik: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsExportTab.tsx`

```tsx
import Button from '@/Components/Atoms/Button/Button';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';

interface AccountSettingsExportTabProps {
    userEmail?: string;
}

export default function AccountSettingsExportTab({
    userEmail,
}: AccountSettingsExportTabProps) {
    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Export data"
                description="Generate portable snapshots of your account data."
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            Full account export
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-gray-color)]">
                            {userEmail
                                ? `We'll email the export to ${userEmail}.`
                                : 'Includes profile, preferences, and activity.'}
                        </p>
                        <Button
                            type="button"
                            isBox
                            className="mt-3 w-full py-1.5"
                        >
                            Request export
                        </Button>
                    </div>
                </div>
            </SettingsPanel>
        </div>
    );
}
```

Dane, które są już na współdzielonym propie `auth` (nazwa użytkownika, e-mail, awatar), nie potrzebują propa z kontrolera w ogóle — odczytaj je z `usePage<PageProps>()` na stronie, tak jak robi to `Pages/Settings/Profile.tsx` (zobacz [`../architecture/03-frontend-architecture-and-atomic-design.md`](../architecture/03-frontend-architecture-and-atomic-design.md)). Zbudowanie samej faktycznej funkcji backendu "wygeneruj i wyślij mailem eksport" jest poza zakresem tego przewodnika — kroki 2–5 to wzorzec podłączania zakładki ustawień, nie funkcja stojąca za konkretnym placeholderem.

## Testy

- `tests/Feature/SettingsControllerTest.php` — dodaj przypadek asercujący, że `GET /settings/export` zwraca komponent `Settings/Export` z propami z kroku 3, na wzór istniejących tam testów per-zakładka. Jeśli dane zakładki są zabezpieczone uprawnieniami, zaaseruj też kształt dla użytkownika bez dostępu, tak jak robią to przypadki dla labels/integrations.
- `resources/js/Pages/Settings/Export.test.tsx` — nowy plik, na wzór dowolnego istniejącego testu strony (np. `Preferences.test.tsx`): zamockuj `SettingsLayout` i komponent zakładki, zaaseruj, że strona renderuje swoją zakładkę z właściwym `tabId` i przekazuje propy.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsExportTab.test.tsx` (utwórz, jeśli nie istnieje) — zaaseruj, że warunkowa treść z e-mailem renderuje się poprawnie z propem `userEmail` i bez niego.
- `resources/js/Components/Organisms/Sidebar/Sidebar.test.tsx` — istniejący przypadek "renders disabled settings tabs without a link" liczy wyłączone zakładki; sprawdź, czy wciąż się broni, gdy jedna zakładka mniej jest wyłączona.
